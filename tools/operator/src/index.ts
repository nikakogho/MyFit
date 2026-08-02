import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { publicationManifestSchema, type PublicationManifest } from "@myfit/contracts";

export interface PublicationTargets {
  catalogPath: string;
  mediaDirectory: string;
}

export interface ImageMetadata {
  format: "jpeg" | "png" | "webp";
  width: number;
  height: number;
  sha256: string;
}

export interface PublicationAssetPreflight extends ImageMetadata {
  source: string;
  destinationName: string;
  status: "new" | "existing-identical";
}

export interface PublicationPreflightReport {
  canPublish: boolean;
  assets: PublicationAssetPreflight[];
  errors: string[];
  warnings: string[];
  summary: {
    garments: number;
    looks: number;
    outfits: number;
    catalogImages: number;
    newAssets: number;
    existingIdenticalAssets: number;
  };
}

export interface PublicationResult {
  assetsPublished: number;
  assetsReused: number;
  catalogPath: string;
  preflight: PublicationPreflightReport;
}

interface ExistingMedia extends ImageMetadata {
  name: string;
  path: string;
}

const supportedDestinationExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readUInt24LE(bytes: Buffer, offset: number): number {
  return bytes.readUIntLE(offset, 3);
}

function jpegDimensions(bytes: Buffer): { width: number; height: number } | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === undefined) return undefined;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) return undefined;
    if (offset + 4 > bytes.length) return undefined;

    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) return undefined;
    if (startOfFrameMarkers.has(marker)) {
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      return width > 0 && height > 0 ? { width, height } : undefined;
    }
    offset += 2 + segmentLength;
  }

  return undefined;
}

function pngDimensions(bytes: Buffer): { width: number; height: number } | undefined {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) return undefined;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : undefined;
}

function webpDimensions(bytes: Buffer): { width: number; height: number } | undefined {
  if (
    bytes.length < 30 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return undefined;
  }

  const chunk = bytes.toString("ascii", 12, 16);
  const payloadOffset = 20;
  if (chunk === "VP8X" && bytes.length >= payloadOffset + 10) {
    return {
      width: readUInt24LE(bytes, payloadOffset + 4) + 1,
      height: readUInt24LE(bytes, payloadOffset + 7) + 1,
    };
  }
  if (chunk === "VP8L" && bytes.length >= payloadOffset + 5 && bytes[payloadOffset] === 0x2f) {
    const bits = bytes.readUInt32LE(payloadOffset + 1);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (
    chunk === "VP8 " &&
    bytes.length >= payloadOffset + 10 &&
    bytes[payloadOffset + 3] === 0x9d &&
    bytes[payloadOffset + 4] === 0x01 &&
    bytes[payloadOffset + 5] === 0x2a
  ) {
    return {
      width: bytes.readUInt16LE(payloadOffset + 6) & 0x3fff,
      height: bytes.readUInt16LE(payloadOffset + 8) & 0x3fff,
    };
  }
  return undefined;
}

function inspectImage(bytes: Buffer, destinationName: string): ImageMetadata {
  const extension = extname(destinationName).toLocaleLowerCase();
  if (!supportedDestinationExtensions.has(extension)) {
    throw new Error(`unsupported destination extension "${extension || "(none)"}"`);
  }

  const detected = pngDimensions(bytes) ?? jpegDimensions(bytes) ?? webpDimensions(bytes);
  if (!detected) {
    throw new Error("file bytes are not a supported JPEG, PNG, or WebP image");
  }

  const format =
    pngDimensions(bytes) !== undefined
      ? "png"
      : jpegDimensions(bytes) !== undefined
        ? "jpeg"
        : "webp";
  const expectedFormat = extension === ".png" ? "png" : extension === ".webp" ? "webp" : "jpeg";
  if (format !== expectedFormat) {
    throw new Error(
      `file bytes are ${format}, but the destination name declares ${expectedFormat}`,
    );
  }

  return { format, ...detected, sha256: sha256(bytes) };
}

function isMissingPathError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "ENOENT"
  );
}

async function readExistingMedia(mediaDirectory: string): Promise<ExistingMedia[]> {
  let entries;
  try {
    entries = await readdir(mediaDirectory, { withFileTypes: true });
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }

  const media: ExistingMedia[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !supportedDestinationExtensions.has(extname(entry.name).toLowerCase())) {
      continue;
    }
    const path = join(mediaDirectory, entry.name);
    const bytes = await readFile(path);
    media.push({ name: entry.name, path, ...inspectImage(bytes, entry.name) });
  }
  return media;
}

function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.toLocaleLowerCase();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

export async function preflightPublication(
  manifestInput: unknown,
  manifestDirectory: string,
  targets: PublicationTargets,
): Promise<PublicationPreflightReport> {
  const manifest = publicationManifestSchema.parse(manifestInput);
  const mediaDirectory = resolve(targets.mediaDirectory);
  const existingMedia = await readExistingMedia(mediaDirectory);
  const existingByName = new Map(
    existingMedia.map((media) => [media.name.toLocaleLowerCase(), media]),
  );
  const existingByHash = new Map<string, ExistingMedia>();
  for (const media of existingMedia) {
    existingByHash.set(media.sha256, existingByHash.get(media.sha256) ?? media);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const assets: PublicationAssetPreflight[] = [];
  const incomingByName = new Map<string, PublicationAssetPreflight>();
  const incomingByHash = new Map<string, PublicationAssetPreflight>();

  for (const duplicateName of findDuplicates(
    manifest.assets.map((asset) => asset.destinationName),
  )) {
    errors.push(`Destination name "${duplicateName}" appears more than once in the manifest.`);
  }
  for (const duplicateId of findDuplicates(
    manifest.catalog.garments.map((garment) => garment.id),
  )) {
    errors.push(`Garment id "${duplicateId}" appears more than once in the catalog.`);
  }
  for (const duplicateId of findDuplicates(manifest.catalog.outfits.map((outfit) => outfit.id))) {
    errors.push(`Outfit id "${duplicateId}" appears more than once in the catalog.`);
  }
  for (const duplicateId of findDuplicates(manifest.catalog.looks.map((look) => look.id))) {
    errors.push(`Look id "${duplicateId}" appears more than once in the catalog.`);
  }

  for (const asset of manifest.assets) {
    const normalizedDestination = asset.destinationName.toLocaleLowerCase();
    const sourcePath = isAbsolute(asset.source)
      ? resolve(asset.source)
      : resolve(manifestDirectory, asset.source);

    try {
      const sourceStat = await stat(sourcePath);
      if (!sourceStat.isFile()) {
        errors.push(`Asset source is not a file: ${asset.source}`);
        continue;
      }
      const bytes = await readFile(sourcePath);
      const metadata = inspectImage(bytes, asset.destinationName);
      const existingDestination = existingByName.get(normalizedDestination);
      const existingDuplicate = existingByHash.get(metadata.sha256);
      const incomingDuplicate = incomingByHash.get(metadata.sha256);

      if (
        incomingDuplicate &&
        incomingDuplicate.destinationName.toLocaleLowerCase() !== normalizedDestination
      ) {
        errors.push(
          `Assets "${incomingDuplicate.destinationName}" and "${asset.destinationName}" contain identical image bytes.`,
        );
      }
      if (
        existingDuplicate &&
        existingDuplicate.name.toLocaleLowerCase() !== normalizedDestination
      ) {
        errors.push(
          `Asset "${asset.destinationName}" duplicates existing public media "${existingDuplicate.name}".`,
        );
      }
      if (existingDestination && existingDestination.sha256 !== metadata.sha256) {
        errors.push(
          `Asset "${asset.destinationName}" would overwrite different existing public media.`,
        );
      }

      const assetReport: PublicationAssetPreflight = {
        source: asset.source,
        destinationName: asset.destinationName,
        status: existingDestination ? "existing-identical" : "new",
        ...metadata,
      };
      assets.push(assetReport);
      incomingByName.set(normalizedDestination, assetReport);
      incomingByHash.set(metadata.sha256, incomingDuplicate ?? assetReport);
    } catch (error) {
      errors.push(
        `Asset "${asset.destinationName}" is invalid: ${
          error instanceof Error ? error.message : String(error)
        }.`,
      );
    }
  }

  const catalogImageReferences = new Map<
    string,
    Array<{ ownerLabel: string; width: number; height: number }>
  >();
  for (const garment of manifest.catalog.garments) {
    for (const image of garment.images) {
      const name = basename(image.src).toLocaleLowerCase();
      const references = catalogImageReferences.get(name) ?? [];
      references.push({
        ownerLabel: `garment "${garment.id}"`,
        width: image.width,
        height: image.height,
      });
      catalogImageReferences.set(name, references);
    }
  }
  for (const look of manifest.catalog.looks) {
    for (const image of look.images) {
      const name = basename(image.src).toLocaleLowerCase();
      const references = catalogImageReferences.get(name) ?? [];
      references.push({
        ownerLabel: `look "${look.id}"`,
        width: image.width,
        height: image.height,
      });
      catalogImageReferences.set(name, references);
    }
  }

  for (const asset of assets) {
    if (!catalogImageReferences.has(asset.destinationName.toLocaleLowerCase())) {
      errors.push(`New asset "${asset.destinationName}" is not referenced by any catalog record.`);
    }
  }

  for (const [name, references] of catalogImageReferences) {
    const incoming = incomingByName.get(name);
    const existing = existingByName.get(name);
    const image = incoming ?? existing;
    if (!image) {
      errors.push(
        `Catalog image "/media/${name}" is missing from both public media and the manifest.`,
      );
      continue;
    }
    for (const reference of references) {
      if (reference.width !== image.width || reference.height !== image.height) {
        errors.push(
          `Catalog dimensions for "/media/${name}" on ${reference.ownerLabel} are ${reference.width}x${reference.height}, but the image is ${image.width}x${image.height}.`,
        );
      }
    }
  }

  if (manifest.assets.length === 0) {
    warnings.push("The manifest contains no new asset entries; only catalog metadata can change.");
  }

  return {
    canPublish: errors.length === 0,
    assets,
    errors,
    warnings,
    summary: {
      garments: manifest.catalog.garments.length,
      looks: manifest.catalog.looks.length,
      outfits: manifest.catalog.outfits.length,
      catalogImages: [...catalogImageReferences.values()].reduce(
        (total, references) => total + references.length,
        0,
      ),
      newAssets: assets.filter((asset) => asset.status === "new").length,
      existingIdenticalAssets: assets.filter((asset) => asset.status === "existing-identical")
        .length,
    },
  };
}

export function formatPreflightReport(report: PublicationPreflightReport): string {
  const lines = [
    `Publication preflight: ${report.canPublish ? "PASS" : "FAIL"}`,
    `Catalog: ${report.summary.garments} garment(s), ${report.summary.looks} photographed look(s), ${report.summary.outfits} outfit idea(s), ${report.summary.catalogImages} image reference(s)`,
    `Assets: ${report.summary.newAssets} new, ${report.summary.existingIdenticalAssets} already public and byte-identical`,
  ];
  for (const asset of report.assets) {
    lines.push(
      `${asset.status === "new" ? "ADD" : "KEEP"} ${asset.destinationName} (${asset.width}x${asset.height}, sha256 ${asset.sha256.slice(0, 12)}…)`,
    );
  }
  for (const warning of report.warnings) lines.push(`WARNING ${warning}`);
  for (const error of report.errors) lines.push(`ERROR ${error}`);
  return `${lines.join("\n")}\n`;
}

function parsedManifest(manifestInput: unknown): PublicationManifest {
  return publicationManifestSchema.parse(manifestInput);
}

export async function publishManifest(
  manifestInput: unknown,
  manifestDirectory: string,
  targets: PublicationTargets,
): Promise<PublicationResult> {
  const manifest = parsedManifest(manifestInput);
  const preflight = await preflightPublication(manifest, manifestDirectory, targets);
  if (!preflight.canPublish) {
    throw new Error(`Publication preflight failed:\n- ${preflight.errors.join("\n- ")}`);
  }

  const catalogPath = resolve(targets.catalogPath);
  const mediaDirectory = resolve(targets.mediaDirectory);
  const stagedPaths: string[] = [];
  const publishedAssetPaths: string[] = [];
  const assetStatus = new Map(
    preflight.assets.map((asset) => [asset.destinationName.toLocaleLowerCase(), asset.status]),
  );

  await mkdir(dirname(catalogPath), { recursive: true });
  await mkdir(mediaDirectory, { recursive: true });

  try {
    for (const asset of manifest.assets) {
      if (assetStatus.get(asset.destinationName.toLocaleLowerCase()) !== "new") continue;
      const sourcePath = isAbsolute(asset.source)
        ? asset.source
        : resolve(manifestDirectory, asset.source);
      const destinationPath = join(mediaDirectory, basename(asset.destinationName));
      const stagedPath = `${destinationPath}.publishing`;
      await rm(stagedPath, { force: true });
      await copyFile(sourcePath, stagedPath);
      stagedPaths.push(stagedPath);
    }

    const stagedCatalogPath = `${catalogPath}.publishing`;
    await rm(stagedCatalogPath, { force: true });
    await writeFile(stagedCatalogPath, `${JSON.stringify(manifest.catalog, null, 2)}\n`, "utf8");
    stagedPaths.push(stagedCatalogPath);

    for (const asset of manifest.assets) {
      if (assetStatus.get(asset.destinationName.toLocaleLowerCase()) !== "new") continue;
      const destinationPath = join(mediaDirectory, basename(asset.destinationName));
      await rename(`${destinationPath}.publishing`, destinationPath);
      publishedAssetPaths.push(destinationPath);
    }
    await rename(stagedCatalogPath, catalogPath);

    return {
      assetsPublished: preflight.summary.newAssets,
      assetsReused: preflight.summary.existingIdenticalAssets,
      catalogPath,
      preflight,
    };
  } catch (error) {
    await Promise.all([
      ...stagedPaths.map((path) => rm(path, { force: true })),
      ...publishedAssetPaths.map((path) => rm(path, { force: true })),
    ]);
    throw error;
  }
}

function readArgument(name: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

async function runCli(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.argv.includes("--ack-public")) {
    throw new Error(
      "Publication stopped. Re-run with --ack-public only after reviewing every asset and all metadata as public.",
    );
  }
  const manifestArgument = readArgument("--manifest");
  if (!manifestArgument) {
    throw new Error("Missing --manifest=PATH.");
  }

  const workspace = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
  const manifestPath = resolve(manifestArgument);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PublicationManifest;
  const targets = {
    catalogPath: join(workspace, "content", "wardrobe.json"),
    mediaDirectory: join(workspace, "apps", "web", "public", "media"),
  };
  const report = await preflightPublication(manifest, dirname(manifestPath), targets);
  process.stdout.write(formatPreflightReport(report));

  if (dryRun) {
    if (!report.canPublish) process.exitCode = 1;
    return;
  }
  if (!report.canPublish) {
    throw new Error("Publication stopped because preflight failed.");
  }

  const result = await publishManifest(manifest, dirname(manifestPath), targets);
  process.stdout.write(
    `Published ${result.assetsPublished} new asset(s), reused ${result.assetsReused} byte-identical asset(s), and updated ${result.catalogPath}.\n`,
  );
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entryPath === import.meta.url) {
  runCli().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
