# Codex batch clothing intake

This is the standard operating procedure for requests such as “look at this folder,” “check my
uploads,” or “add these clothes.” It is intentionally optimized for partial progress: ready garments
are published without waiting for unrelated incomplete garments.

## 1. Default behavior

Codex should:

1. Inspect the named folder recursively without asking the user to enumerate its files.
2. Group photos into garments using folder structure, filenames, timestamps, repeated surroundings,
   visual continuity, and garment features.
3. Compare the proposed garments and source-image hashes with the existing public catalogue.
4. Classify every proposed garment as `ready` or `blocked`.
5. Prepare every usable supplied photo and the metadata for every ready garment, selecting one
   strong catalogue thumbnail without discarding the other angles or worn views.
6. Run the publication dry-run and resolve code/data errors.
7. Publish, validate, commit, push, deploy, and live-check the ready subset.
8. Leave blocked files untouched and ask one grouped follow-up covering only those garments.

The intake response should lead with completed work. Then list blocked garments and their smallest
next action.

## 2. What Codex should infer

When visible evidence and ordinary fashion knowledge are sufficient, Codex should infer these
without asking:

- garment category and useful descriptive subcategory;
- dominant and secondary colours, including an honest lighting caveat when needed;
- silhouette and visible construction;
- likely material families, explicitly suffixed with `(inferred)` when not confirmed by a label;
- likely seasons and occasions;
- search terms, styling notes, and outfit compatibility;
- a compact `styleProfile` covering formality, visual weight, statement level, palette, and useful
  style tags for deterministic advice;
- a descriptive public name when the exact commercial model is unknown;
- public alt text and which image is the strongest catalogue view.

These schema fields are nullable and never block intake by themselves:

- `brand`;
- `fit`;
- `warmth`.

Exact size is not part of the current garment record and should not be requested unless the user
raises a fit issue that materially affects styling.

## 3. What Codex must not guess

Ask only when one of these remains materially ambiguous:

- whether two photo groups show the same garment or two different garments;
- whether an apparent logo/brand/model identification is correct when the public record would make
  a specific factual claim;
- whether the photographed colour is materially distorted by lighting;
- whether a hidden closure, asymmetric feature, back graphic, pocket layout, or leg shape changes
  the garment description;
- whether a photo accidentally includes a different item that should not be catalogued;
- whether an apparent duplicate is a second owned copy or the already catalogued item.

When exact branding is unknown and not necessary, use a descriptive name and `brand: null` instead
of asking.

## 4. Photo sufficiency

A garment is ready when there is:

- at least one clear, reasonably sharp image showing the whole item well enough for a public
  catalogue card; and
- enough visual evidence to describe the silhouette and the features that matter for outfit
  recommendations.

There is no rigid required photo count. Request another view only when it resolves a real blind
spot.

Category heuristics:

| Category    | Usually sufficient                                   | Ask for another view only when                                                         |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Tops        | Clear full front or three-quarter view               | Back graphic, unusual hem, sleeve construction, or closure is hidden                   |
| Outerwear   | Clear full front plus any view showing volume/length | Back treatment, hood, vents, major pockets, or closure cannot be understood            |
| Bottoms     | Full-length front or three-quarter view              | Leg shape, rear pockets, cargo layout, hem, or side treatment is ambiguous             |
| Footwear    | Clear full shoe/pair plus a view showing silhouette  | Inner/outer side differs, sole shape is hidden, or closure/detail cannot be identified |
| Accessories | Whole item with scale/context                        | Closure, reverse side, texture, or functional detail matters but is hidden             |

A worn photo is helpful but optional. A label photo is optional unless exact brand, model, or
material attribution is necessary. Do not reflexively request front/back/left/right views.

Once a garment is ready, photo sufficiency is not a reason to discard additional supplied views.
Publish every non-duplicate photo that clearly belongs to the garment, including alternate angles,
worn open/closed views, interior construction, graphics, pockets, and other useful details. Exclude
only unreadable photos, accidental unrelated images, exact duplicates, or images whose publication
would be misleading. Assign one image the `catalog` role and represent the rest with the most honest
available roles.

Examples of good targeted requests:

- “For the black cargo trousers, I need one full-length side view so I can distinguish straight from
  tapered legs.”
- “Are photos 8–10 the same navy overshirt as photos 5–7, or a second garment?”
- “The care label is the only missing evidence for calling this wool; otherwise I’ll record it as a
  wool-like blend (inferred).”

## 5. Standard question bank

This is a decision bank, not a questionnaire to send verbatim.

1. **Grouping:** Which photos belong to the same garment?
2. **Identity:** Is the visible brand/model reading correct, or should the record remain
   descriptive?
3. **Colour:** Is the photo’s colour representative in normal light?
4. **Hidden construction:** Is there an important back/side/sole/closure feature the current photos
   do not show?
5. **Duplicate ownership:** Is this a new garment, a second copy, or an already catalogued item?
6. **Availability:** Is the item currently owned and wearable? Ask only when the folder or user
   wording suggests otherwise.
7. **Presentation:** Is a better whole-item photo needed because every supplied image is cropped,
   blurred, obstructed, or dominated by another item?

If none of these questions is necessary, ask nothing.

## 6. Partial-batch ledger

Codex should maintain a concise working ledger:

| Garment          | Status  | Evidence                        | Action                            |
| ---------------- | ------- | ------------------------------- | --------------------------------- |
| Descriptive name | Ready   | Adequate catalogue/detail views | Publish in current batch          |
| Descriptive name | Blocked | Missing or ambiguous evidence   | Exact question or requested photo |

Only ready garments enter the publication manifest. Blocked garments are not represented by
placeholder records and do not prevent the ready subset from shipping.

## 7. Publication gate

Raw intake remains ignored under `uploads/`, `samples/`, or `content/private/`. Only reviewed
presentation assets are copied to `apps/web/public/media/`.

Run:

```powershell
pnpm.cmd publish:content -- --manifest=C:\path\to\reviewed-manifest.json --dry-run
```

The dry-run must pass before publication. It verifies:

- exact public acknowledgement and complete catalogue schema;
- unique garment IDs, outfit IDs, and destination filenames;
- source files and supported JPEG/PNG/WebP bytes;
- extension/content agreement and actual pixel dimensions;
- duplicate image bytes within the batch or against existing public media;
- collision-free, non-overwriting destinations;
- every new asset is referenced;
- every catalogue image resolves to incoming or existing public media;
- recorded dimensions match the actual files.

Then publish with:

```powershell
pnpm.cmd publish:content -- --manifest=C:\path\to\reviewed-manifest.json --ack-public
```

After publication, run repository validation and browser tests, commit only the ready subset and its
generated deployment artifacts, push, deploy, and verify the live catalogue/MCP counts.
