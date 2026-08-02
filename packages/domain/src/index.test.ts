import { describe, expect, it } from "vitest";

import { parseCatalog } from "./index.js";

describe("catalog schema", () => {
  it("rejects outfits that reference missing garments", () => {
    expect(() =>
      parseCatalog({
        schemaVersion: 1,
        updatedAt: "2026-07-29T12:00:00.000Z",
        profile: {
          displayName: "Wardrobe owner",
          wardrobeName: "Test wardrobe",
          genderContext: "menswear",
          locationContext: "London",
          typicalClothingSize: "L",
          shoeSize: "EU 44",
          heightCmApprox: 180,
          fitPreferences: ["regular"],
          styleDirection: ["casual"],
          publicNotice: "Public.",
        },
        garments: [],
        looks: [],
        outfits: [
          {
            id: "look",
            title: "Look",
            garmentIds: ["missing"],
            rationale: "Test.",
            missingPieces: [],
            occasions: ["casual"],
            seasons: ["spring"],
            tags: ["test"],
          },
        ],
      }),
    ).toThrow(/unknown garment/);
  });

  it("rejects photographed looks that reference missing garments", () => {
    expect(() =>
      parseCatalog({
        schemaVersion: 1,
        updatedAt: "2026-08-02T12:00:00.000Z",
        profile: {
          displayName: "Wardrobe owner",
          wardrobeName: "Test wardrobe",
          genderContext: "menswear",
          locationContext: "London",
          typicalClothingSize: "L",
          shoeSize: "EU 44",
          heightCmApprox: 180,
          fitPreferences: ["regular"],
          styleDirection: ["casual"],
          publicNotice: "Public.",
        },
        garments: [],
        looks: [
          {
            id: "worn-look",
            title: "Worn look",
            images: [
              {
                src: "/media/look.jpg",
                alt: "A look",
                role: "worn",
                width: 10,
                height: 20,
                garmentIds: ["missing"],
                variantLabel: null,
                unindexedPieces: [],
              },
            ],
            unindexedPieces: [],
            notes: "Test.",
            occasions: ["casual"],
            seasons: ["spring"],
            tags: ["test"],
            privacyTreatment: "as-is",
            addedAt: "2026-08-02T12:00:00.000Z",
          },
        ],
        outfits: [],
      }),
    ).toThrow(/unknown garment/);
  });
});
