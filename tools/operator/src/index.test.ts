import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { publishManifest } from "./index.js";

describe("Codex publication workflow", () => {
  it("publishes only a manifest carrying the exact public acknowledgement", async () => {
    const directory = await mkdtemp(join(tmpdir(), "myfit-operator-"));
    const source = join(directory, "source.jpg");
    await writeFile(source, "approved-photo");
    const catalog = {
      schemaVersion: 1,
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
      garments: [],
      outfits: [],
    };
    const targets = {
      catalogPath: join(directory, "content", "wardrobe.json"),
      mediaDirectory: join(directory, "public", "media"),
    };

    await expect(
      publishManifest({ acknowledgement: "no", catalog, assets: [] }, directory, targets),
    ).rejects.toThrow();

    await publishManifest(
      {
        acknowledgement: "I understand these files and metadata will be public.",
        catalog,
        assets: [{ source: "source.jpg", destinationName: "approved.jpg" }],
      },
      directory,
      targets,
    );
    await expect(readFile(join(targets.mediaDirectory, "approved.jpg"), "utf8")).resolves.toBe(
      "approved-photo",
    );
  });
});
