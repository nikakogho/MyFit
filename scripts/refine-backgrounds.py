#!/usr/bin/env python3
"""Apply reviewed, deterministic alpha cleanups to named catalogue cutouts."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def alpha_stats(alpha: Image.Image) -> dict[str, object]:
    histogram = alpha.histogram()
    pixels = alpha.width * alpha.height
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    return {
        "transparentFraction": round(sum(histogram[:8]) / pixels, 6),
        "opaqueFraction": round(sum(histogram[248:]) / pixels, 6),
        "partialFraction": round(sum(histogram[8:248]) / pixels, 6),
        "subjectBoundingBox": list(bbox) if bbox else None,
        "cornerAlpha": [
            alpha.getpixel((0, 0)),
            alpha.getpixel((alpha.width - 1, 0)),
            alpha.getpixel((0, alpha.height - 1)),
            alpha.getpixel((alpha.width - 1, alpha.height - 1)),
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--media-dir", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    refinements = json.loads(args.config.read_text(encoding="utf-8"))
    report = json.loads(args.report.read_text(encoding="utf-8"))
    report_by_output = {entry["output"]: entry for entry in report["images"]}

    for refinement in refinements:
        path = args.media_dir / refinement["filename"]
        pixels = np.asarray(Image.open(path).convert("RGBA")).copy()
        red = pixels[:, :, 0].astype(np.int16)
        green = pixels[:, :, 1].astype(np.int16)
        blue = pixels[:, :, 2].astype(np.int16)
        alpha = pixels[:, :, 3]
        rows = np.arange(pixels.shape[0])[:, None]

        if "removeNeutralBeddingBelow" in refinement:
            bedding = (
                (alpha > 0)
                & (rows > refinement["removeNeutralBeddingBelow"])
                & (green * 100 >= red * 78)
                & (green * 100 >= blue * 103)
                & ((red + green + blue) > 90)
            )
            pixels[bedding, 3] = 0

        if "clearBelow" in refinement:
            pixels[refinement["clearBelow"] :, :, 3] = 0

        pixels[pixels[:, :, 3] == 0, :3] = 0
        Image.fromarray(pixels, "RGBA").save(path, "WEBP", lossless=True, method=6)

        report_entry = report_by_output[path.name]
        alpha_image = Image.fromarray(pixels[:, :, 3], "L")
        report_entry.update(
            {
                "outputBytes": path.stat().st_size,
                "outputSha256": sha256(path),
                **alpha_stats(alpha_image),
                "refinement": {
                    key: value for key, value in refinement.items() if key != "filename"
                },
            }
        )
        print(f"Refined {path.name}", flush=True)

    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
