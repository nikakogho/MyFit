# MyFit Research Notes

**Research date:** 2026-07-29  
**Policy:** Primary/official sources only. Pricing and product availability must be rechecked immediately before implementation and deployment.

## 1. OpenAI custom apps and MCP

### Sources

- [Developer mode, apps, and full MCP connectors in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta)
- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [Authentication for MCP/apps](https://developers.openai.com/plugins/build/auth)
- [Connect from ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Security and privacy guidance](https://developers.openai.com/plugins/guides/security-privacy)
- [MCP tool specification, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

### Operational findings

- OpenAI's current documentation uses the custom-app/plugin language around remote MCP servers and describes a public HTTPS MCP endpoint using Streamable HTTP.
- Tool definitions are JSON-schema contracts. Tool metadata must accurately describe read/write/destructive behavior, and clients may retain a tool snapshot until the app is refreshed.
- Current account/workspace access is not equivalent across plans. The reviewed OpenAI Help Center page describes full write-capable MCP for Business and Enterprise/Edu and read/fetch behavior for Pro; custom app setup is currently web-oriented. The owner's exact account must be tested at connection time.
- Remote write actions require a materially stronger confirmation and authorization posture than public reads.
- OpenAI security guidance supports short, focused tools, least privilege, server-side validation, auditability, and treating tool/stored content as untrusted in the presence of prompt injection.
- The official pages reviewed do not document an automatic mechanism that turns a ChatGPT conversation image attachment into a durable custom MCP tool argument or retrievable backend reference.

### Design implication

Use a no-auth, read-only MCP server for deliberately public data. Keep ingestion and all writes in the authenticated Codex/operator workflow. Do not make MVP depend on attachment forwarding or a write-capable ChatGPT plan.

### Uncertainty/gate

The owner's actual ChatGPT UI, plan, workspace settings, and no-auth custom-app connection must be exercised in Phase 9. Product entitlements and terminology can change.

## 2. MCP transport and tool behavior

### Sources

- [MCP transports specification, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [MCP tools specification, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP authorization specification, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)

### Operational findings

- Streamable HTTP is the relevant remote transport.
- Tool input schemas are JSON Schema objects; tool results can carry structured content and supported media/resource references.
- Authorization is relevant when a protected resource exists, but deliberately public read tools do not gain confidentiality from a shared API key.

### Design implication

Implement stateless, bounded request/response tool calls and test the deployed endpoint with MCP Inspector. Register exactly five public read tools. Add OAuth only if protected write tools are later introduced.

## 3. Supabase

### Sources

- [Supabase billing and Free plan behavior](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase pricing](https://supabase.com/pricing)
- [Auth overview](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Postgres full-text search](https://supabase.com/docs/guides/database/full-text-search)
- [Edge Functions overview](https://supabase.com/docs/guides/functions)
- [OAuth 2.1 authorization server](https://supabase.com/docs/guides/auth/oauth-server)
- [OAuth server for MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Download logical backups](https://supabase.com/docs/guides/troubleshooting/download-logical-backups)

### Operational findings

- The reviewed Free plan advertises 500 MB database size, 1 GB storage, 5 GB egress, 50,000 MAU, 500,000 Edge Function invocations, and two active projects.
- Free projects may pause after a week of inactivity. Free-tier continuity and automated backup guarantees are not sufficient for an always-on personal archive without an owner-run export.
- Postgres provides the needed constraints, JSONB, joins, migrations, transactions, FTS, and GIN indexes.
- RLS should protect owner-scoped private tables even if server endpoints construct public projections.
- Supabase's OAuth 2.1 authorization-server capability is currently beta and documents PKCE, discovery, and MCP use. OAuth scopes govern identity information; database authorization still requires RLS/application policies.
- Edge Functions are viable, but a separate Deno deployment/runtime is unnecessary when Netlify already hosts the web and Node functions.

### Design implication

Use Supabase Postgres and Auth for private operator writes, not garment image storage. Use explicit exports plus `pg_dump`. Postpone Supabase OAuth/MCP integration until write MCP is actually wanted.

### Uncertainty/gate

Recheck free quotas, inactivity policy, OAuth beta status, and backup features before production.

## 4. Cloudinary

### Sources

- [Plans and billing](https://cloudinary.com/documentation/billing_and_plans)
- [Cloudinary pricing](https://cloudinary.com/pricing)
- [Control access to media](https://cloudinary.com/documentation/control_access_to_media)
- [Client-side uploading](https://cloudinary.com/documentation/client_side_uploading)
- [Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [Signature generation and verification](https://cloudinary.com/documentation/signatures)
- [Eager transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations)
- [Admin API and asset identifiers](https://cloudinary.com/documentation/admin_api)

### Operational findings

- The reviewed Free plan provides 25 monthly/shared credits; one credit corresponds to 1 GB image storage, 1 GB image bandwidth, or 1,000 image transformations under the documented model.
- The account's effective upload limits are plan/configuration dependent. The application must impose its own MIME and byte caps; "`<10 MB` means free" is false.
- Signed direct upload lets the local client send bytes to Cloudinary without exposing the API secret or routing them through Netlify.
- `private` and `authenticated` delivery differ. Authenticated originals and their derivatives require authorized delivery; arbitrary on-the-fly transformations are constrained, so predefined/eager work is safer for protected originals.
- Stable provider `asset_id` is a better durable identity than a delivery URL or mutable `public_id`.
- Public delivery is appropriate only for deliberately published presentation objects. Making a raw original public is not required by a public catalog.

### Design implication

Upload raw originals as immutable authenticated assets. After explicit approval, create separate, EXIF-stripped public presentation assets with parent lineage. Store provider IDs and transform metadata; derive public versioned URLs at response time. Apply `overwrite=false`, short signature expiry, and provider callback verification.

### Uncertainty/gate

Test exact authenticated-to-public copy/transformation behavior and credit accounting on the selected free account before committing production data.

## 5. Netlify

### Sources

- [Netlify pricing](https://www.netlify.com/pricing/)
- [Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Functions configuration and limits](https://docs.netlify.com/build/functions/configuration/)
- [Netlify Functions API](https://docs.netlify.com/build/functions/api/)

### Operational findings

- The reviewed Free plan provides 300 monthly credits. Documented meters include 15 credits per production deploy, 20 credits/GB bandwidth, 10 credits/GB-hour function compute, and 2 credits/10,000 web requests.
- A Free site pauses when it exhausts its credits. Production deployments should be batched intentionally.
- Current synchronous functions allow 60 seconds. Buffered request/response payloads allow 6 MB, with lower effective binary capacity due to encoding; streamed responses allow larger output but have a 10-second execution constraint.
- Photo bytes should not traverse a function. Signed direct upload avoids both function payload and compute cost.

### Design implication

Use one Netlify site for static web, public/operator API functions, webhook, and stateless buffered `/mcp`. Keep ordinary operations below an internal 10-second deadline and test Streamable HTTP on a deployed preview.

### Uncertainty/gate

The MCP SDK/runtime interaction and any CDN buffering must be verified against a deployed Function. A small container service is the fallback only if the test fails.

## 6. Image-attachment and upload options

| Option                                                      | Evidence/constraint                                                                            | Outcome              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------- |
| ChatGPT passes its conversation attachment to a custom tool | No such handoff contract found in the official pages reviewed                                  | Do not assume        |
| Base64/file bytes in MCP JSON                               | Technically representable JSON, but no host handoff contract and poor serverless/body behavior | Reject               |
| Backend-signed Cloudinary upload                            | Official Cloudinary pattern; requires a client with file access                                | Select through Codex |
| Private mobile upload page                                  | Technically practical; adds UI/auth scope                                                      | Postpone             |
| Unsigned Cloudinary preset                                  | Broader abuse surface and weaker per-upload constraints                                        | Reject               |
| Codex local inspection + signed direct upload               | Codex has the selected MVP file context, supports human approval, and bypasses Netlify bytes   | Select               |

## 7. Public-read revision to the original privacy premise

The initial brief described a private wardrobe and asked whether the gallery should authenticate. The owner subsequently made an explicit product decision: MVP published content should be publicly readable.

The architecture interprets that decision narrowly:

- canonical records require explicit `published_at`;
- public API/MCP return allowlisted DTOs only;
- public presentation images are separate, approved, metadata-stripped objects;
- drafts, raw originals, audit data, private notes, identity data, and future body-reference assets remain private;
- public rate limits protect service cost, not confidentiality.

This boundary is necessary because the inspected fixture set includes worn images with a visible face and home interior. Anyone can retain or redistribute a public record/image; unpublishing cannot revoke copies already made.

## 8. Research items to refresh

Refresh before the named phase:

- Phase 2: Cloudinary free-account delivery/copy/transformation behavior.
- Phase 4: current MCP SDK/protocol and Netlify runtime compatibility.
- Phase 8: all provider quotas, pause rules, and function limits.
- Phase 9: OpenAI account entitlements, custom-app setup, no-auth server support, and tool-refresh behavior.
- Future write MCP: OpenAI write availability plus current OAuth 2.1 and Supabase beta behavior.
