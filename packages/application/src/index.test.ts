import { describe, expect, it } from "vitest";
import type { Catalog } from "@myfit/domain";

import { adviseFootwear, searchGarments } from "./index.js";

const jacket: Catalog["garments"][number] = {
  id: "test-jacket",
  name: "Brown jacket",
  brand: "Test",
  category: "outerwear",
  subcategory: "shirt-jacket",
  colors: ["brown", "olive"],
  colorDescription: "Muted brown",
  materials: ["nylon"],
  silhouette: "regular",
  fit: "regular",
  warmth: "light",
  seasons: ["spring", "autumn"],
  occasions: ["casual"],
  stylingNotes: ["layer"],
  searchTerms: ["overshirt"],
  status: "available",
  images: [
    {
      src: "/media/test.jpg",
      alt: "Test",
      role: "catalog",
      width: 10,
      height: 10,
    },
  ],
  addedAt: "2026-07-29T12:00:00.000Z",
};

const catalog: Catalog = {
  schemaVersion: 1,
  updatedAt: "2026-07-29T12:00:00.000Z",
  profile: {
    displayName: "Owner",
    wardrobeName: "Wardrobe",
    genderContext: "menswear",
    locationContext: "London",
    typicalClothingSize: "L",
    shoeSize: "EU 44",
    heightCmApprox: 180,
    fitPreferences: ["regular"],
    styleDirection: ["casual"],
    publicNotice: "Public",
  },
  garments: [jacket],
  outfits: [],
};

describe("searchGarments", () => {
  it("finds alternative terms and structured attributes", () => {
    expect(searchGarments(catalog, { query: "overshirt", color: "brown" })).toEqual([jacket]);
    expect(searchGarments(catalog, { season: "winter" })).toEqual([]);
  });
});

describe("adviseFootwear", () => {
  it("ranks owned footwear deterministically from structured style traits", () => {
    const highTops: Catalog["garments"][number] = {
      ...jacket,
      id: "black-high-tops",
      name: "Black high-tops",
      category: "footwear",
      subcategory: "high-top sneakers",
      colors: ["black", "charcoal"],
      colorDescription: "Washed black and charcoal",
      silhouette: "Substantial distressed high-top",
      stylingNotes: ["Keep the rest clean"],
      searchTerms: ["techwear shoes"],
      styleProfile: {
        formality: "casual",
        visualWeight: "substantial",
        statementLevel: "bold",
        palette: "neutral",
        styleTags: ["techwear", "directional", "utility"],
      },
    };
    const creamSneakers: Catalog["garments"][number] = {
      ...jacket,
      id: "cream-sneakers",
      name: "Cream sneakers",
      category: "footwear",
      subcategory: "low-top sneakers",
      colors: ["cream", "brown"],
      colorDescription: "Cream and warm brown",
      silhouette: "Relaxed low-top sneaker",
      stylingNotes: ["Use as a soft focal point"],
      searchTerms: ["cream shoes"],
      styleProfile: {
        formality: "casual",
        visualWeight: "medium",
        statementLevel: "balanced",
        palette: "warm",
        styleTags: ["sporty", "relaxed"],
      },
    };

    const result = adviseFootwear(
      { ...catalog, garments: [creamSneakers, highTops] },
      {
        trouserName: "black cargo trousers",
        trouserDescription: "Washed black utility trousers with zip pockets",
        trouserStyle: "cargo",
        trouserColors: ["black"],
        desiredMood: "directional techwear",
        preferredContrast: "balanced",
      },
    );

    expect(result.map(({ garment }) => garment.id)).toEqual(["black-high-tops", "cream-sneakers"]);
    expect(result[0]).toMatchObject({
      score: 99,
      stylingTip: "Let the trouser hem meet or slightly overlap the padded collar.",
    });
    expect(result[0]?.rationale).toContain("techwear");
  });
});
