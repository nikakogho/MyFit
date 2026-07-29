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
});
