import { access } from "node:fs/promises";

const requiredArtifacts = [
  new URL("./site/index.html", import.meta.url),
  new URL("./functions/mcp.mjs", import.meta.url),
  new URL("./functions/public-api.mjs", import.meta.url),
];

await Promise.all(requiredArtifacts.map((artifact) => access(artifact)));
console.log("Verified prebuilt MyFit site and functions.");
