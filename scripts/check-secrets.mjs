import fs from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".netlify",
  "coverage",
  "dist",
  "node_modules",
  "samples",
]);
const ignoredFiles = new Set(["pnpm-lock.yaml"]);
const textExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".sql",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const secretPatterns = [
  ["OpenAI API key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ["Private key", /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY(?: BLOCK)?-----/g],
  ["Cloudinary credential URL", /\bcloudinary:\/\/[^:\s]+:[^@\s]+@[A-Za-z0-9_-]+\b/g],
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      return [];
    }
    if (entry.isFile() && ignoredFiles.has(entry.name)) {
      return [];
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walk(absolutePath);
    }

    return textExtensions.has(path.extname(entry.name)) ? [absolutePath] : [];
  });
}

const findings = [];
for (const filePath of walk(workspaceRoot)) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split(/\r?\n/u).length;
      findings.push(`${path.relative(workspaceRoot, filePath)}:${line} ${label}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential committed secrets found:\n");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log("Secret-pattern validation passed.");
}
