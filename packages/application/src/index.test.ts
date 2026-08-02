import { describe, expect, it } from "vitest";
import type { Catalog } from "@myfit/domain";

import {
  adviseFootwear,
  getOutfitOptions,
  matchingLookImages,
  searchGarments,
  searchLooks,
} from "./index.js";

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
  looks: [],
  outfits: [],
};

describe("searchGarments", () => {
  it("finds alternative terms and structured attributes", () => {
    expect(searchGarments(catalog, { query: "overshirt", color: "brown" })).toEqual([jacket]);
    expect(searchGarments(catalog, { season: "winter" })).toEqual([]);
  });
});

describe("photographed looks", () => {
  const trousers: Catalog["garments"][number] = {
    ...jacket,
    id: "test-trousers",
    name: "Black utility trousers",
    category: "bottoms",
    subcategory: "cargo trousers",
    colors: ["black"],
    colorDescription: "Black",
    materials: ["cotton"],
    silhouette: "straight utility fit",
    seasons: ["spring", "autumn", "winter"],
    searchTerms: ["cargo"],
  };
  const look: Catalog["looks"][number] = {
    id: "utility-look",
    title: "Black utility layers",
    images: [
      {
        src: "/media/look.jpg",
        alt: "Black utility look",
        role: "worn",
        width: 10,
        height: 20,
        garmentIds: [jacket.id, trousers.id],
        variantLabel: "Jacket and trousers",
        unindexedPieces: [],
      },
    ],
    unindexedPieces: [],
    notes: "A practical casual utility combination.",
    occasions: ["casual day out", "city visit"],
    seasons: ["spring", "autumn"],
    tags: ["utility", "layered"],
    privacyTreatment: "as-is",
    addedAt: "2026-08-02T12:00:00.000Z",
  };
  const lookCatalog: Catalog = { ...catalog, garments: [jacket, trousers], looks: [look] };

  it("uses AND semantics for selected garments and supports exact matching", () => {
    expect(searchLooks(lookCatalog, { garmentIds: [jacket.id, trousers.id] })).toEqual([look]);
    expect(searchLooks(lookCatalog, { garmentIds: [jacket.id], match: "exact" })).toEqual([]);
    expect(searchLooks(lookCatalog, { query: "city visit" })).toEqual([look]);
  });

  it("returns only the individual photos that contain the requested combination", () => {
    const combinedImage = look.images[0];
    if (!combinedImage) throw new Error("Expected the look fixture to contain one image.");
    const jacketOnlyImage = {
      ...combinedImage,
      src: "/media/jacket-only.jpg",
      garmentIds: [jacket.id],
      variantLabel: "Jacket only",
    };
    const variedLook = { ...look, images: [jacketOnlyImage, ...look.images] };

    expect(matchingLookImages(variedLook, { garmentIds: [jacket.id, trousers.id] })).toEqual([
      combinedImage,
    ]);
  });

  it("returns photographed looks first and ranked owned garments second", () => {
    const result = getOutfitOptions(lookCatalog, {
      request: "Suggest an outfit for a city visit tomorrow",
      requiredGarmentIds: [trousers.id],
      season: "autumn",
      occasion: "city visit",
      temperatureC: 12,
      precipitationExpected: true,
    });

    expect(result.photographedLooks[0]).toMatchObject({
      look: { id: "utility-look" },
      matchingImages: [{ src: "/media/look.jpg" }],
      matchReasons: expect.arrayContaining(["Contains every required garment."]),
    });
    expect(result.candidatesByCategory.bottoms[0]).toMatchObject({
      garment: { id: "test-trousers" },
      matchReasons: expect.arrayContaining(["Required by the user."]),
    });
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
