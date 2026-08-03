#!/usr/bin/env python3
"""Create transparent catalogue derivatives without changing foreground pixels."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove


SUPPORTED_INPUTS = {".jpg", ".jpeg", ".png", ".webp"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_stats(alpha: Image.Image) -> dict[str, object]:
    histogram = alpha.histogram()
    pixels = alpha.width * alpha.height
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((alpha.width - 1, 0)),
        alpha.getpixel((0, alpha.height - 1)),
        alpha.getpixel((alpha.width - 1, alpha.height - 1)),
    ]
    return {
        "transparentFraction": round(sum(histogram[:8]) / pixels, 6),
        "opaqueFraction": round(sum(histogram[248:]) / pixels, 6),
        "partialFraction": round(sum(histogram[8:248]) / pixels, 6),
        "subjectBoundingBox": list(bbox) if bbox else None,
        "cornerAlpha": corners,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--model", default="birefnet-general")
    parser.add_argument("--only", nargs="*", help="Optional input filenames to process")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)

    requested = set(args.only or [])
    inputs = sorted(
        path
        for path in args.input_dir.iterdir()
        if path.is_file()
        and path.suffix.lower() in SUPPORTED_INPUTS
        and (not requested or path.name in requested)
    )
    missing = requested - {path.name for path in inputs}
    if missing:
        raise SystemExit(f"Missing requested inputs: {', '.join(sorted(missing))}")
    if not inputs:
        raise SystemExit("No supported input images found")

    session = new_session(args.model)
    report: dict[str, object] = {"model": args.model, "images": []}

    for index, input_path in enumerate(inputs, start=1):
        with Image.open(input_path) as source:
            rgb = source.convert("RGB")
        predicted = remove(rgb, session=session)
        if not isinstance(predicted, Image.Image):
            raise RuntimeError(f"Unexpected rembg output for {input_path.name}")
        alpha = predicted.convert("RGBA").getchannel("A")
        rgba = rgb.convert("RGBA")
        rgba.putalpha(alpha)

        # Fully transparent pixels should carry no hidden room colour. This does not affect the
        # rendered subject, but it keeps previews and downstream image tooling from exposing RGB
        # data that is supposed to be invisible.
        pixels = np.asarray(rgba).copy()
        pixels[pixels[:, :, 3] == 0, :3] = 0
        rgba = Image.fromarray(pixels, "RGBA")

        output_path = args.output_dir / f"{input_path.stem}.webp"
        rgba.save(output_path, "WEBP", lossless=True, method=6, exact=False)

        stats = alpha_stats(alpha)
        if stats["transparentFraction"] < 0.01:
            raise RuntimeError(f"Mask for {input_path.name} removed almost no background")
        if stats["opaqueFraction"] < 0.005:
            raise RuntimeError(f"Mask for {input_path.name} retained almost no foreground")

        image_report = {
            "source": input_path.name,
            "output": output_path.name,
            "width": rgb.width,
            "height": rgb.height,
            "sourceBytes": input_path.stat().st_size,
            "outputBytes": output_path.stat().st_size,
            "sourceSha256": sha256(input_path),
            "outputSha256": sha256(output_path),
            **stats,
        }
        report["images"].append(image_report)
        print(
            f"[{index}/{len(inputs)}] {input_path.name} -> {output_path.name} "
            f"({stats['transparentFraction']:.1%} transparent)",
            flush=True,
        )

    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
