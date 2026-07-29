import { describe, expect, it } from "vitest";
import type { Catalog } from "@myfit/domain";

import { searchGarments } from "./index.js";

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
