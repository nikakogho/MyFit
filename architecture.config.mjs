const providerImports = ["@netlify/", "@modelcontextprotocol/", "@supabase/", "cloudinary"];
const uiImports = ["react", "react-dom"];

export const packageRules = [
  {
    name: "@myfit/domain",
    root: "packages/domain",
    allowedWorkspace: [],
    forbiddenExternal: [...providerImports, ...uiImports],
  },
  {
    name: "@myfit/contracts",
    root: "packages/contracts",
    allowedWorkspace: ["@myfit/domain"],
    forbiddenExternal: [...providerImports, ...uiImports],
  },
  {
    name: "@myfit/application",
    root: "packages/application",
    allowedWorkspace: ["@myfit/domain"],
    forbiddenExternal: [...providerImports, ...uiImports],
  },
  {
    name: "@myfit/persistence",
    root: "packages/persistence",
    allowedWorkspace: ["@myfit/application", "@myfit/domain"],
    forbiddenExternal: ["@netlify/", "@modelcontextprotocol/", "cloudinary", ...uiImports],
  },
  {
    name: "@myfit/assets",
    root: "packages/assets",
    allowedWorkspace: ["@myfit/application", "@myfit/domain"],
    forbiddenExternal: ["@netlify/", "@modelcontextprotocol/", "@supabase/", ...uiImports],
  },
  {
    name: "@myfit/server",
    root: "apps/server",
    allowedWorkspace: [
      "@myfit/application",
      "@myfit/assets",
      "@myfit/contracts",
      "@myfit/persistence",
    ],
    forbiddenExternal: ["@supabase/", "cloudinary", ...uiImports],
  },
  {
    name: "@myfit/web",
    root: "apps/web",
    allowedWorkspace: ["@myfit/contracts"],
    forbiddenExternal: providerImports,
  },
  {
    name: "@myfit/operator",
    root: "tools/operator",
    allowedWorkspace: ["@myfit/contracts"],
    forbiddenExternal: [...providerImports, ...uiImports],
  },
  {
    name: "@myfit/sample-import",
    root: "tools/sample-import",
    allowedWorkspace: ["@myfit/contracts"],
    forbiddenExternal: [...providerImports, ...uiImports],
  },
  {
    name: "@myfit/export",
    root: "tools/export",
    allowedWorkspace: [
      "@myfit/application",
      "@myfit/assets",
      "@myfit/domain",
      "@myfit/persistence",
    ],
    forbiddenExternal: [...providerImports, ...uiImports],
  },
];
