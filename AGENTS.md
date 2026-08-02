# MyFit agent instructions

## Batch wardrobe intake

When the user says to inspect a folder, uploads directory, or batch of clothing photos, read
[`docs/INGESTION_WORKFLOW.md`](docs/INGESTION_WORKFLOW.md) and follow it. Treat that request as
authorization to inspect the named local files, prepare all sufficiently documented garments,
publish the ready subset through the guarded operator workflow, validate it, and commit the ready
subset. Raw intake files remain local and untouched.

For every ready garment, publish every supplied, non-duplicate photo that clearly belongs to it.
Choose one strong `catalog` image, but retain the remaining angles, worn views, interior views, and
construction details as `front`, `back`, `worn`, or `detail` images. Do not silently reduce a garment
to a curated subset. Exclude a photo only when it is unreadable, an accidental unrelated image, an
exact duplicate, or would make the public presentation misleading.

Treat deliberately submitted full-outfit photos as photographed `look` evidence in addition to
ordinary garment imagery. Inventory every visible clothing item. Automatically link only clear
catalogue matches; ask one grouped confirmation for ambiguous matches. If the user confirms a piece
is new, ingest it as a garment first and connect its ID to every relevant look image. Garment IDs are
recorded per photo because layers or shoes can differ across photos. Never guess an exact identity;
use `unindexedPieces` temporarily or hold the look when that ambiguity would be misleading.

For the current owner-only phase, outfit photos are intentionally public and published as-is. Face
and background redaction is a future default-on service feature, not part of current intake.

Use common sense before asking questions. Infer ordinary visual facts such as category, colour,
silhouette, likely materials, seasons, occasions, search terms, and styling notes when the images
support them. Mark uncertain material claims as inferred. `brand`, `fit`, and `warmth` are nullable
and must not block intake. Do not invent an exact brand/model, size, ownership grouping, or a hidden
construction detail.

Do not block a whole batch because one garment is incomplete:

1. Group photos by garment and maintain a ready/blocked intake ledger.
2. Publish, validate, commit, push, and deploy every ready garment.
3. Leave blocked garment photos unmodified in the intake folder.
4. Ask one concise grouped follow-up containing only the missing facts or exact additional views
   needed for blocked garments.

Never recite the full question bank. Ask only questions whose answers would materially change the
record or whose missing evidence makes the public presentation misleading. A worn photo, label
photo, back view, or specific side view is optional unless a hidden feature or ambiguous silhouette
cannot be represented honestly without it.

Before publication, always run:

```powershell
pnpm.cmd publish:content -- --manifest=C:\path\to\reviewed-manifest.json --dry-run
```

Publish only after preflight passes. Never bypass collision, duplicate-byte, image-format,
dimension, or catalogue-reference failures.
