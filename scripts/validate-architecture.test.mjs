import path from "node:path";
import { describe, expect, it } from "vitest";

import { packageRules } from "../architecture.config.mjs";
import { validateSpecifier } from "./validate-architecture.mjs";

function rule(name) {
  const result = packageRules.find((candidate) => candidate.name === name);
  if (!result) {
    throw new Error(`Missing architecture rule for ${name}`);
  }

  return result;
}

describe("architecture enforcement", () => {
  it("allows the application layer to import the domain layer", () => {
    const errors = validateSpecifier(
      rule("@myfit/application"),
      "@myfit/domain",
      path.resolve("packages/application/src/example.ts"),
    );

    expect(errors).toEqual([]);
  });

  it("rejects a forbidden workspace dependency", () => {
    const errors = validateSpecifier(
      rule("@myfit/domain"),
      "@myfit/persistence",
      path.resolve("packages/domain/src/example.ts"),
    );

    expect(errors).toEqual([
      "@myfit/domain cannot depend on @myfit/persistence; allowed workspace dependencies: (none)",
    ]);
  });

  it("rejects provider imports from the application layer", () => {
    const errors = validateSpecifier(
      rule("@myfit/application"),
      "@supabase/supabase-js",
      path.resolve("packages/application/src/example.ts"),
    );

    expect(errors).toEqual([
      "@myfit/application cannot import external package @supabase/supabase-js",
    ]);
  });

  it("rejects relative imports that bypass package boundaries", () => {
    const errors = validateSpecifier(
      rule("@myfit/web"),
      "../../../packages/domain/src/index.js",
      path.resolve("apps/web/src/example.ts"),
    );

    expect(errors).toEqual([
      "@myfit/web must import @myfit/domain through its workspace package name, not a relative path",
    ]);
  });
});
