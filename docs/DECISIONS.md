# MyFit Architecture Decisions

**Research/decision date:** 2026-07-29  
**Statuses:** `Accepted`, `Proposed`, `Superseded`, `Postponed`

## ADR-001 — PostgreSQL on Supabase

**Status:** Accepted

**Decision:** Use Supabase Postgres for canonical data, migrations, full-text search, transactions, RLS, and the single operator identity.

**Context:** The wardrobe is relational, versioned, searchable, and small. Approval must atomically create canonical records and associations.

**Alternatives considered:** SQLite on a server; document database; Cloudinary metadata as database; Supabase plus a separate search service.

**Rationale:** Postgres gives constraints, joins, JSONB, FTS, transactions, export tooling, and a plausible template path without operating a database server.

**Consequences:** Free projects may pause; production schema must be migration-controlled; RLS must be tested even though public reads use server-created projections.

## ADR-002 — Cloudinary for images, with two visibility classes

**Status:** Accepted

**Decision:** Store immutable originals as authenticated Cloudinary assets and create separate, metadata-stripped public presentation assets only after explicit approval.

**Context:** The system is now intentionally publicly readable, but sample worn photographs reveal faces and home interiors. Public readership must not silently expose raw files.

**Alternatives considered:** Supabase Storage only; public originals; private signed delivery for everything; Cloudinary and Supabase Storage split.

**Rationale:** Cloudinary's transformations, direct signed uploads, CDN, and stable asset IDs fit a photo-heavy catalog. Separate objects make public/private lineage reviewable and testable.

**Consequences:** Three vendors remain; usage credits combine storage/transform/bandwidth; publication needs copy/transform orchestration and exact leakage tests; public copies can be downloaded by anyone.

## ADR-003 — Netlify for the web, API, and MCP deployment

**Status:** Accepted

**Decision:** Deploy the static React site and short-lived Netlify Functions together.

**Context:** V1 needs public reads, private operator operations, a stateless MCP endpoint, and minimal operations.

**Alternatives considered:** Supabase Edge Functions; separate container backend; separate frontend/backend hosts.

**Rationale:** One deployment and one TypeScript/Node runtime are simpler. Current function time limits are adequate for bounded operations, while uploads bypass functions.

**Consequences:** Streamable HTTP must be tested on a deployed preview; production deploys consume Netlify credits; a small container host is the fallback if MCP behavior is incompatible.

## ADR-004 — One TypeScript monorepo with internal packages

**Status:** Accepted

**Decision:** Use a pnpm TypeScript monorepo with `web`, `server`, domain/application, persistence, assets, contracts, and operator tooling.

**Context:** Shared validators and application logic are useful, but separate services would add operational overhead.

**Alternatives considered:** One flat application; multiple repositories; microservices.

**Rationale:** Package boundaries enforce transport independence while producing one deployable system.

**Consequences:** Architecture dependency tests are required; packages must stay purposeful rather than becoming ceremonial abstractions.

## ADR-005 — Relational common fields plus validated versioned JSONB

**Status:** Accepted

**Decision:** Put common/filterable facts in garment columns and category-specific facts in discriminated, versioned `category_attributes` JSONB.

**Context:** Categories need different facts, but the expected wardrobe does not justify dozens of sparse tables.

**Alternatives considered:** A table per category; one giant JSON document; entity-attribute-value/per-field fact tables.

**Rationale:** The hybrid model balances constraints, search, and evolution. Unknown uncommon details can remain objective text until they justify schema fields.

**Consequences:** Application and database validation must agree; category-version migrations need explicit upgraders and fixtures.

## ADR-006 — Separate drafts from canonical garments

**Status:** Accepted

**Decision:** Store AI/operator proposals in `garment_drafts`; create a `garments` row only through revision-checked human approval.

**Context:** Model observation and inference can be wrong. An upload is not approval.

**Alternatives considered:** `is_draft` on garments; local-only transient proposals; direct AI writes to canonical records.

**Rationale:** Separate tables make trust and lifecycle unambiguous and allow approval to be transactional and audited.

**Consequences:** Some payload duplication is intentional; terminal drafts are retained; approval needs idempotency and optimistic concurrency.

## ADR-007 — Public reads, private Codex-only writes

**Status:** Accepted

**Decision:** `/api/public/v1`, the website, and MVP MCP tools are anonymous and read-only. `/api/operator/v1` is authenticated and used by Codex/local operator tooling. No mobile upload UI is built.

**Context:** The owner explicitly chose public readability and accepted Codex-only ingestion for MVP. Current ChatGPT custom MCP write support varies by plan, and attachment forwarding is not documented.

**Alternatives considered:** Authenticate all readers; write MCP from launch; private mobile upload page; browser admin UI.

**Rationale:** This produces the desired working loop now: Codex publishes, and ChatGPT can retrieve and reason over published data.

**Consequences:** Public records and images are scrapeable/shareable; rate limits control cost, not privacy. Remote writes wait for a supported entitlement and separate security review.

## ADR-008 — Publication is explicit and independent from canonical approval

**Status:** Accepted

**Decision:** Canonical garments/outfits use nullable `published_at`; assets use private-by-default visibility. Approval may publish in the same command only when `publish=true` and an exact public-asset manifest is approved.

**Context:** Canonical truth and public disclosure are different decisions, especially for worn photos.

**Alternatives considered:** Auto-publish every approval; make all canonical data public; per-field visibility controls.

**Rationale:** One publication switch plus allowlisted DTOs is understandable. Per-field ACLs would be excessive; auto-publication is unsafe.

**Consequences:** Codex must show a privacy manifest; public DTO tests are release-critical; an approved private garment can be published later.

## ADR-009 — Five read-only MCP tools in MVP

**Status:** Accepted

**Decision:** Expose `search_garments`, `get_garment`, `search_outfits`, `get_outfit`, and `get_owner_profile`.

**Context:** ChatGPT is the styling interface, but MCP should remain narrow.

**Alternatives considered:** The full candidate tool list; one generic search tool; generic database tools.

**Rationale:** Five tools match domain retrieval tasks and avoid duplicated asset or generic mutation surfaces.

**Consequences:** Reachability changes, outfit saves, and ingestion happen through the operator API until write MCP is deliberately enabled.

## ADR-010 — No OAuth for MVP MCP; Supabase Auth for operator writes

**Status:** Accepted

**Decision:** Advertise no authentication on the public read MCP endpoint. Verify Supabase JWTs on private operator routes.

**Context:** Authentication adds no confidentiality to data intentionally published, while current OAuth/MCP entitlement uncertainty would delay the core loop.

**Alternatives considered:** Supabase OAuth 2.1 for all MCP requests; API keys; public bearer token; Netlify Identity.

**Rationale:** No-auth public reads are the honest least-complex contract. A shared public API key would provide no secrecy. Supabase Auth already fits the one private writer.

**Consequences:** Public read abuse needs rate limits. Future write MCP requires a new ADR and OAuth conformance/security work.

## ADR-011 — Postgres full-text and structured filters

**Status:** Accepted

**Decision:** Use Postgres FTS plus indexed category, reachability, color-family, tag, and relationship filters.

**Context:** Scale is hundreds of garments and objective search, not semantic corpus retrieval.

**Alternatives considered:** Elasticsearch; hosted search; embeddings/vector database; browser-only filtering.

**Rationale:** Postgres already meets the need at negligible operational cost.

**Consequences:** Category aliases need maintained normalization; style compatibility remains dynamic ChatGPT reasoning, not search scoring.

## ADR-012 — Samples are explicit fixtures, never automatic production seeds

**Status:** Accepted

**Decision:** Keep the nine images unchanged and reference them by path/hash in an explicit dry-run-first import manifest/tool.

**Context:** Samples are real photographs and requirements fixtures, not production storage.

**Alternatives considered:** Rename/copy them now; seed on application startup; hardcode the two products.

**Rationale:** Hash-addressed explicit import preserves repository evidence and prevents accidental production writes.

**Consequences:** Fixture metadata must be maintained; import requires an explicit target and approval.

## ADR-013 — Mobile-friendly ingestion and write MCP

**Status:** Postponed

**Decision:** Revisit only after the public read loop and Codex ingestion prove useful.

**Context:** The user explicitly accepts Codex-only upload for MVP. Official documentation does not establish automatic transfer of ChatGPT conversation attachments to custom MCP tools.

**Alternatives considered:** Tiny private upload page now; base64/file URL tool inputs; direct unsigned Cloudinary upload.

**Rationale:** Every alternative adds scope or a security boundary without being necessary for MVP.

**Consequences:** New garments cannot be ingested away from a Codex-capable machine during MVP.

## ADR-014 — One-call deterministic footwear advice

**Status:** Accepted

**Decision:** Expose `advise_footwear` as the default tool for matching owned footwear to trousers.
It ranks the current public footwear catalogue from additive machine-readable `styleProfile`
traits, returns one compact catalogue image per pair, and attaches the existing comparison widget
in the same tool result. The legacy model-ranked render tool remains available for exceptional
custom rankings.

**Context:** The original comparison required a serial `search_garments` call, a model reasoning
turn, and then `render_footwear_comparison`. The response bodies were small enough that network
transfer was not the dominant delay; the avoidable model/tool round-trip was.

**Alternatives considered:** Add another hosted language-model API; keep model-only ranking and
compact its JSON; precompute every possible outfit combination.

**Rationale:** A small transparent style heuristic is effectively instantaneous, costs nothing per
request, and remains explainable. ChatGPT still handles the conversation and may generate an
optional full-look image separately.

**Consequences:** Match scores are relative styling guidance, not objective truth. New footwear
should include a reviewed `styleProfile`; older records remain compatible through conservative
fallback inference. Ranking behavior is covered by deterministic tests and should evolve from
owner feedback rather than hidden model changes. This decision supersedes ADR-009's fixed MVP tool
count without changing the public read-only boundary.
