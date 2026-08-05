# Original catalogue photography

`originals/` contains an exact, filename-preserving snapshot of every full photograph that was
published before the catalogue background-removal pass.

These files are not copied into the deployed site. They are retained so any individual image, or
the complete catalogue, can be restored without relying on generated cutouts or re-uploading the
original photographs.

Do not edit these files in place. Create derived presentation media separately and keep catalogue
references pointed either at the derived media or at a restored copy of the corresponding original.

## Background-free derivatives

Run `scripts/remove-backgrounds.py` from an environment containing the pinned packages in
`requirements-background-removal.txt`. The production derivatives are lossless PNGs with true
transparency; coloured diagnostic backdrops are QA-only and must never be published.

For product photos the subject is the garment. For worn and photographed-look images the subject is
the person plus the complete outfit. The script reapplies the predicted alpha channel to the exact
original RGB pixels, so it does not redraw or synthesize the clothes.

Touching foreground objects occasionally need a reviewed deterministic cleanup. Run
`scripts/refine-backgrounds.py` with `background-refinements.json` after the base pass; the script
edits alpha only and refreshes the affected entries in `background-removal-report.json`.
