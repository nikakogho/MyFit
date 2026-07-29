import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentRoot = path.join(repositoryRoot, "deployment");
const siteDirectory = path.join(deploymentRoot, "site");
const functionsDirectory = path.join(deploymentRoot, "functions");

function assertDeploymentPath(candidate) {
  const relative = path.relative(deploymentRoot, candidate);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to replace a path outside deployment/: ${candidate}`);
  }
}

for (const generatedDirectory of [siteDirectory, functionsDirectory]) {
  assertDeploymentPath(generatedDirectory);
  await rm(generatedDirectory, { recursive: true, force: true });
  await mkdir(generatedDirectory, { recursive: true });
}

await cp(path.join(repositoryRoot, "apps", "web", "dist"), siteDirectory, {
  recursive: true,
  force: true,
});

const sharedBuildOptions = {
  alias: {
    "@myfit/application": path.join(repositoryRoot, "packages", "application", "src", "index.ts"),
    "@myfit/contracts": path.join(repositoryRoot, "packages", "contracts", "src", "index.ts"),
    "@myfit/domain": path.join(repositoryRoot, "packages", "domain", "src", "index.ts"),
    "@myfit/server": path.join(repositoryRoot, "apps", "server", "src", "index.ts"),
  },
  bundle: true,
  format: "esm",
  minify: true,
  platform: "node",
  sourcemap: false,
  target: "node24",
};

await Promise.all([
  build({
    ...sharedBuildOptions,
    entryPoints: [path.join(repositoryRoot, "netlify", "functions", "mcp.ts")],
    outfile: path.join(functionsDirectory, "mcp.mjs"),
  }),
  build({
    ...sharedBuildOptions,
    entryPoints: [path.join(repositoryRoot, "netlify", "functions", "public-api.ts")],
    outfile: path.join(functionsDirectory, "public-api.mjs"),
  }),
]);

console.log("Prepared deployment/site and deployment/functions.");
