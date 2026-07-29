import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { packageRules } from "../architecture.config.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const sourceExtensions = new Set([".cts", ".js", ".jsx", ".mts", ".ts", ".tsx"]);
const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function matchesPackage(specifier, packageName) {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function matchesForbidden(specifier, pattern) {
  if (pattern.endsWith("/")) {
    return specifier.startsWith(pattern);
  }

  return matchesPackage(specifier, pattern);
}

function owningRuleForAbsolutePath(absolutePath) {
  const normalized = normalizePath(path.relative(workspaceRoot, absolutePath));
  return packageRules.find(
    (rule) => normalized === rule.root || normalized.startsWith(`${rule.root}/`),
  );
}

function workspaceTargetForSpecifier(specifier) {
  return packageRules.find((rule) => matchesPackage(specifier, rule.name));
}

export function validateSpecifier(rule, specifier, sourceFile) {
  const errors = [];

  if (specifier.startsWith(".")) {
    const target = path.resolve(path.dirname(sourceFile), specifier);
    const targetRule = owningRuleForAbsolutePath(target);

    if (targetRule && targetRule.name !== rule.name) {
      errors.push(
        `${rule.name} must import ${targetRule.name} through its workspace package name, not a relative path`,
      );
    }

    return errors;
  }

  const workspaceTarget = workspaceTargetForSpecifier(specifier);
  if (workspaceTarget && workspaceTarget.name !== rule.name) {
    if (!rule.allowedWorkspace.includes(workspaceTarget.name)) {
      errors.push(
        `${rule.name} cannot depend on ${workspaceTarget.name}; allowed workspace dependencies: ${
          rule.allowedWorkspace.join(", ") || "(none)"
        }`,
      );
    }

    return errors;
  }

  const forbidden = rule.forbiddenExternal.find((pattern) => matchesForbidden(specifier, pattern));
  if (forbidden) {
    errors.push(`${rule.name} cannot import external package ${specifier}`);
  }

  return errors;
}

function collectImportSpecifiers(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers = [];

  function addStringLiteral(node) {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.push(node.text);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addStringLiteral(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const [argument] = node.arguments;
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")
      ) {
        addStringLiteral(argument);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function walkSourceFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkSourceFiles(absolutePath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [absolutePath] : [];
  });
}

function validateDeclaredDependencies(rule, packageJson) {
  const errors = [];

  for (const section of dependencySections) {
    const dependencies = packageJson[section] ?? {};
    for (const dependencyName of Object.keys(dependencies)) {
      const workspaceTarget = workspaceTargetForSpecifier(dependencyName);
      if (
        workspaceTarget &&
        workspaceTarget.name !== rule.name &&
        !rule.allowedWorkspace.includes(workspaceTarget.name)
      ) {
        errors.push(
          `${rule.root}/package.json: ${rule.name} declares forbidden ${section} entry ${dependencyName}`,
        );
      }
    }
  }

  return errors;
}

export function validateArchitecture() {
  const errors = [];

  for (const rule of packageRules) {
    const packageRoot = path.join(workspaceRoot, rule.root);
    const packageJsonPath = path.join(packageRoot, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      errors.push(`${rule.root}: missing package.json`);
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (packageJson.name !== rule.name) {
      errors.push(
        `${rule.root}/package.json: expected package name ${rule.name}, received ${String(
          packageJson.name,
        )}`,
      );
    }

    errors.push(...validateDeclaredDependencies(rule, packageJson));

    for (const filePath of walkSourceFiles(path.join(packageRoot, "src"))) {
      const sourceText = fs.readFileSync(filePath, "utf8");
      for (const specifier of collectImportSpecifiers(sourceText, filePath)) {
        for (const error of validateSpecifier(rule, specifier, filePath)) {
          errors.push(`${normalizePath(path.relative(workspaceRoot, filePath))}: ${error}`);
        }
      }
    }
  }

  return errors;
}

function main() {
  const errors = validateArchitecture();
  if (errors.length > 0) {
    console.error("Architecture validation failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Architecture validation passed for ${packageRules.length} workspace packages.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
