import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { preflightPublication, publishManifest } from "./index.js";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function pngWithDimensions(width: number, height: number): Buffer {
  const image = Buffer.from(onePixelPng);
  image.writeUInt32BE(width, 16);
  image.writeUInt32BE(height, 20);
  return image;
}

function catalog(
  images: Array<{
    src: string;
    width: number;
    height: number;
    role?: "catalog" | "front" | "back" | "detail" | "worn";
  }>,
) {
  return {
    schemaVersion: 1 as const,
    updatedAt: "2026-07-29T12:00:00.000Z",
    profile: {
      displayName: "Owner",
      wardrobeName: "Wardrobe",
      genderContext: "menswear",
      locationContext: "London",
      typicalClothingSize: "L",
      shoeSize: "EU 44",
      heightCmApprox: 180,
      fitPreferences: ["regular"],
      styleDirection: ["casual"],
      publicNotice: "Public",
    },
    garments: [
      {
        id: "test-shirt",
        name: "Test shirt",
        brand: null,
        category: "tops" as const,
        subcategory: "shirt",
        colors: ["black"],
        colorDescription: "Black",
        materials: ["Cotton (inferred)"],
        silhouette: "Regular shirt",
        fit: null,
        warmth: "light" as const,
        seasons: ["spring" as const],
        occasions: ["casual"],
        stylingNotes: ["Wear it simply"],
        searchTerms: ["shirt"],
        status: "available" as const,
        images: images.map((image) => ({
          alt: "Test shirt",
          role: image.role ?? ("catalog" as const),
          ...image,
        })),
        addedAt: "2026-07-29T12:00:00.000Z",
      },
    ],
    outfits: [],
  };
}

function manifest(
  catalogInput: ReturnType<typeof catalog>,
  assets: Array<{ source: string; destinationName: string }>,
) {
  return {
    acknowledgement: "I understand these files and metadata will be public." as const,
    catalog: catalogInput,
    assets,
  };
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "myfit-operator-"));
  return {
    directory,
    targets: {
      catalogPath: join(directory, "content", "wardrobe.json"),
      mediaDirectory: join(directory, "public", "media"),
    },
  };
}

describe("Codex publication workflow", () => {
  it("preflights, publishes, and safely reuses a byte-identical public asset", async () => {
    const { directory, targets } = await fixture();
    const source = join(directory, "source.png");
    await writeFile(source, onePixelPng);
    const input = manifest(catalog([{ src: "/media/approved.png", width: 1, height: 1 }]), [
      { source: "source.png", destinationName: "approved.png" },
    ]);

    await expect(
      publishManifest({ ...input, acknowledgement: "no" }, directory, targets),
    ).rejects.toThrow();

    const preflight = await preflightPublication(input, directory, targets);
    expect(preflight).toMatchObject({
      canPublish: true,
      summary: { newAssets: 1, existingIdenticalAssets: 0 },
      assets: [{ destinationName: "approved.png", width: 1, height: 1, status: "new" }],
    });

    const published = await publishManifest(input, directory, targets);
    expect(published).toMatchObject({ assetsPublished: 1, assetsReused: 0 });
    await expect(readFile(join(targets.mediaDirectory, "approved.png"))).resolves.toEqual(
      onePixelPng,
    );

    const repeated = await preflightPublication(input, directory, targets);
    expect(repeated).toMatchObject({
      canPublish: true,
      summary: { newAssets: 0, existingIdenticalAssets: 1 },
      assets: [{ destinationName: "approved.png", status: "existing-identical" }],
    });
    await expect(publishManifest(input, directory, targets)).resolves.toMatchObject({
      assetsPublished: 0,
      assetsReused: 1,
    });
  });

  it("rejects an overwrite and leaves the published bytes unchanged", async () => {
    const { directory, targets } = await fixture();
    const originalSource = join(directory, "original.png");
    const replacementSource = join(directory, "replacement.png");
    await writeFile(originalSource, onePixelPng);
    await writeFile(replacementSource, pngWithDimensions(2, 1));

    const original = manifest(catalog([{ src: "/media/approved.png", width: 1, height: 1 }]), [
      { source: "original.png", destinationName: "approved.png" },
    ]);
    await publishManifest(original, directory, targets);

    const replacement = manifest(catalog([{ src: "/media/approved.png", width: 2, height: 1 }]), [
      { source: "replacement.png", destinationName: "approved.png" },
    ]);
    const report = await preflightPublication(replacement, directory, targets);
    expect(report.canPublish).toBe(false);
    expect(report.errors).toContain(
      'Asset "approved.png" would overwrite different existing public media.',
    );
    await expect(publishManifest(replacement, directory, targets)).rejects.toThrow(
      "would overwrite",
    );
    await expect(readFile(join(targets.mediaDirectory, "approved.png"))).resolves.toEqual(
      onePixelPng,
    );
  });

  it("rejects duplicate bytes, dangling catalog images, and unreferenced assets together", async () => {
    const { directory, targets } = await fixture();
    await writeFile(join(directory, "one.png"), onePixelPng);
    await writeFile(join(directory, "two.png"), onePixelPng);
    const input = manifest(
      catalog([
        { src: "/media/one.png", width: 1, height: 1 },
        { src: "/media/missing.png", width: 1, height: 1, role: "detail" },
      ]),
      [
        { source: "one.png", destinationName: "one.png" },
        { source: "two.png", destinationName: "unused.png" },
      ],
    );

    const report = await preflightPublication(input, directory, targets);
    expect(report.canPublish).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        'Assets "one.png" and "unused.png" contain identical image bytes.',
        'New asset "unused.png" is not referenced by any catalog garment.',
        'Catalog image "/media/missing.png" is missing from both public media and the manifest.',
      ]),
    );
    await expect(publishManifest(input, directory, targets)).rejects.toThrow(
      "Publication preflight failed",
    );
    await expect(stat(targets.mediaDirectory)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(join(directory, "content"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects image bytes that do not match the declared destination format", async () => {
    const { directory, targets } = await fixture();
    await writeFile(join(directory, "source.png"), onePixelPng);
    const input = manifest(catalog([{ src: "/media/wrong.jpg", width: 1, height: 1 }]), [
      { source: "source.png", destinationName: "wrong.jpg" },
    ]);

    const report = await preflightPublication(input, directory, targets);
    expect(report.canPublish).toBe(false);
    expect(report.errors.join("\n")).toContain(
      "file bytes are png, but the destination name declares jpeg",
    );
  });
});
