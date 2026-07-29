import fs from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", ".netlify", "coverage", "dist", "node_modules"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      return [];
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walk(absolutePath);
    }

    return entry.name.endsWith(".json") ? [absolutePath] : [];
  });
}

const failures = [];
const jsonFiles = walk(workspaceRoot);

for (const filePath of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(
      `${path.relative(workspaceRoot, filePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

const sampleRecordsPath = path.join(workspaceRoot, "docs", "SAMPLE_RECORDS.json");
try {
  const sampleRecords = JSON.parse(fs.readFileSync(sampleRecordsPath, "utf8"));
  if (sampleRecords.documentType !== "myfit-example-record-bundle") {
    failures.push("docs/SAMPLE_RECORDS.json: unexpected documentType");
  }
  if (!Array.isArray(sampleRecords.garments) || sampleRecords.garments.length !== 2) {
    failures.push("docs/SAMPLE_RECORDS.json: expected exactly two example garments");
  }
  if (!Array.isArray(sampleRecords.fixtureAssets) || sampleRecords.fixtureAssets.length !== 9) {
    failures.push("docs/SAMPLE_RECORDS.json: expected exactly nine fixture assets");
  }
} catch (error) {
  failures.push(
    `docs/SAMPLE_RECORDS.json: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (failures.length > 0) {
  console.error("JSON validation failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`JSON validation passed for ${jsonFiles.length} files.`);
}
