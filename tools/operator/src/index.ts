import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { publicationManifestSchema, type PublicationManifest } from "@myfit/contracts";

export interface PublicationTargets {
  catalogPath: string;
  mediaDirectory: string;
}

export async function publishManifest(
  manifestInput: unknown,
  manifestDirectory: string,
  targets: PublicationTargets,
): Promise<{ assetsPublished: number; catalogPath: string }> {
  const manifest = publicationManifestSchema.parse(manifestInput);
  const catalogPath = resolve(targets.catalogPath);
  const mediaDirectory = resolve(targets.mediaDirectory);
  const stagedPaths: string[] = [];

  await mkdir(dirname(catalogPath), { recursive: true });
  await mkdir(mediaDirectory, { recursive: true });

  try {
    for (const asset of manifest.assets) {
      const sourcePath = isAbsolute(asset.source)
        ? asset.source
        : resolve(manifestDirectory, asset.source);
      const destinationPath = join(mediaDirectory, basename(asset.destinationName));
      const stagedPath = `${destinationPath}.publishing`;
      await copyFile(sourcePath, stagedPath);
      stagedPaths.push(stagedPath);
    }

    const stagedCatalogPath = `${catalogPath}.publishing`;
    await writeFile(stagedCatalogPath, `${JSON.stringify(manifest.catalog, null, 2)}\n`, "utf8");
    stagedPaths.push(stagedCatalogPath);

    for (let index = 0; index < manifest.assets.length; index += 1) {
      const asset = manifest.assets[index];
      if (!asset) continue;
      await rename(
        `${join(mediaDirectory, basename(asset.destinationName))}.publishing`,
        join(mediaDirectory, basename(asset.destinationName)),
      );
    }
    await rename(stagedCatalogPath, catalogPath);

    return { assetsPublished: manifest.assets.length, catalogPath };
  } catch (error) {
    await Promise.all(stagedPaths.map((path) => rm(path, { force: true })));
    throw error;
  }
}

function readArgument(name: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

async function runCli(): Promise<void> {
  if (!process.argv.includes("--ack-public")) {
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
  const result = await publishManifest(manifest, dirname(manifestPath), {
    catalogPath: join(workspace, "content", "wardrobe.json"),
    mediaDirectory: join(workspace, "apps", "web", "public", "media"),
  });
  process.stdout.write(
    `Published ${result.assetsPublished} approved asset(s) and updated ${result.catalogPath}.\n`,
  );
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entryPath === import.meta.url) {
  runCli().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
