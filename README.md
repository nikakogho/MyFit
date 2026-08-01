# MyFit

MyFit is a small, publicly readable wardrobe that gives ChatGPT enough real context to suggest
outfits from clothes the owner actually has.

The MVP includes:

- a responsive public gallery with wardrobe search, item details, one saved outfit direction, and a
  public fit profile;
- a public JSON API;
- a read-only MCP server with search/fetch, garment/outfit/profile tools, a one-call deterministic
  footwear adviser, and a reliable comparison widget;
- a guarded Codex-only publishing command for adding approved public content;
- thirteen real garments, including five footwear options, and twenty-five presentation photos.

Raw intake photos in `samples/` are local-only. The approved presentation media under
`apps/web/public/media/` is intentionally public.

## Live MVP

- Gallery: <https://myfit-wardrobe.netlify.app>
- Public JSON: <https://myfit-wardrobe.netlify.app/api/catalog>
- ChatGPT MCP endpoint: <https://myfit-wardrobe.netlify.app/mcp>

To use the wardrobe from ChatGPT, enable Developer mode, create a custom app/connector, and use the
MCP endpoint above as its server URL. The server exposes read-only search, fetch, garment, outfit,
owner-profile, and footwear-advice tools. `advise_footwear` ranks every owned pair and returns the
completed comparison in one call, so normal advice does not require a search-then-render sequence.

## Run it

Prerequisites are Node.js 24.18.0 and pnpm 11.14.0.

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
```

Open `http://localhost:5173`. The Netlify Vite plugin also makes the local function routes available
during development.

## Public interfaces

The live deployment supports:

- `GET /api/catalog` returns the complete public catalog.
- `GET /api/profile` returns public fit and style context.
- `GET /api/garments` supports `query`, `category`, `color`, `season`, and `occasion`.
- `GET /api/garments/:id` returns one garment.
- `GET /api/outfits` supports `query`, `season`, and `occasion`.
- `GET /api/outfits/:id` returns one saved outfit direction.
- `/mcp` is the Streamable HTTP MCP endpoint to connect from a ChatGPT app.

All runtime surfaces are read-only. There is no public upload or mutation endpoint.

## Publish new content through Codex

Codex prepares and reviews a manifest containing the complete next catalog plus only the assets
approved for public presentation. Publication requires both the exact acknowledgement in the
manifest and the explicit CLI flag:

```powershell
pnpm.cmd publish:content -- --manifest=C:\path\to\reviewed-manifest.json --ack-public
```

The command validates the complete catalog, stages approved files, and then updates
`content/wardrobe.json` and `apps/web/public/media/`. Codex can run validation and deploy the result
afterward. It will refuse to run without the public acknowledgement.

Before publishing, run the non-mutating preflight:

```powershell
pnpm.cmd publish:content -- --manifest=C:\path\to\reviewed-manifest.json --dry-run
```

The preflight rejects duplicate image bytes, filename/ID collisions, overwrites, unsupported or
mislabeled image files, incorrect dimensions, unreferenced new assets, and missing catalogue
images. Batch intake behavior and the minimal follow-up question rules are documented in
[`docs/INGESTION_WORKFLOW.md`](docs/INGESTION_WORKFLOW.md).

## Validate

```powershell
pnpm.cmd validate
pnpm.cmd test:e2e
```

`validate` builds every workspace package and checks formatting, linting, strict TypeScript, tests,
JSON, architecture boundaries, and likely secrets. The browser suite covers the main gallery,
garment detail, and outfit flows on desktop and mobile.

The current MVP deliberately uses versioned JSON and static presentation media. A database and
object store can replace that implementation later without changing the public contracts.
