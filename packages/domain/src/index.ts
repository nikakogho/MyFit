import { z } from "zod";

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const imageSchema = z.object({
  src: z.string().startsWith("/media/"),
  alt: z.string().min(1),
  role: z.enum(["catalog", "front", "back", "detail", "worn"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const styleTagSchema = z.enum([
  "directional",
  "heritage",
  "minimal",
  "refined",
  "relaxed",
  "rugged",
  "sporty",
  "techwear",
  "utility",
]);

export const styleProfileSchema = z.object({
  formality: z.enum(["casual", "smart-casual", "formal"]),
  visualWeight: z.enum(["light", "medium", "substantial"]),
  statementLevel: z.enum(["quiet", "balanced", "bold"]),
  palette: z.enum(["cool", "neutral", "warm", "mixed"]),
  styleTags: z.array(styleTagSchema).min(1),
});

export const garmentSchema = z.object({
  id: slug,
  name: z.string().min(1),
  brand: z.string().min(1).nullable(),
  category: z.enum(["outerwear", "tops", "bottoms", "footwear", "accessories"]),
  subcategory: z.string().min(1),
  colors: z.array(z.string().min(1)).min(1),
  colorDescription: z.string().min(1),
  materials: z.array(z.string().min(1)),
  silhouette: z.string().min(1),
  fit: z.string().min(1).nullable(),
  warmth: z.enum(["very-light", "light", "medium", "warm"]).nullable(),
  seasons: z.array(z.enum(["spring", "summer", "autumn", "winter"])).min(1),
  occasions: z.array(z.string().min(1)).min(1),
  stylingNotes: z.array(z.string().min(1)),
  searchTerms: z.array(z.string().min(1)),
  styleProfile: styleProfileSchema.optional(),
  status: z.literal("available"),
  images: z.array(imageSchema).min(1),
  addedAt: z.iso.datetime(),
});

export const outfitSchema = z.object({
  id: slug,
  title: z.string().min(1),
  garmentIds: z.array(slug).min(1),
  rationale: z.string().min(1),
  missingPieces: z.array(z.string().min(1)),
  occasions: z.array(z.string().min(1)),
  seasons: z.array(z.enum(["spring", "summer", "autumn", "winter"])).min(1),
  tags: z.array(z.string().min(1)),
});

export const lookImageSchema = imageSchema.extend({
  garmentIds: z.array(slug).min(1),
  variantLabel: z.string().min(1).max(120).nullable(),
  unindexedPieces: z.array(z.string().min(1)),
});

export const lookSchema = z.object({
  id: slug,
  title: z.string().min(1),
  images: z.array(lookImageSchema).min(1),
  unindexedPieces: z.array(z.string().min(1)),
  notes: z.string().min(1),
  occasions: z.array(z.string().min(1)).min(1),
  seasons: z.array(z.enum(["spring", "summer", "autumn", "winter"])).min(1),
  tags: z.array(z.string().min(1)),
  privacyTreatment: z.enum(["as-is", "face-cropped", "face-and-background-redacted"]),
  addedAt: z.iso.datetime(),
});

export const profileSchema = z.object({
  displayName: z.string().min(1),
  wardrobeName: z.string().min(1),
  genderContext: z.string().min(1),
  locationContext: z.string().min(1),
  typicalClothingSize: z.string().min(1),
  shoeSize: z.string().min(1),
  heightCmApprox: z.number().int().positive(),
  fitPreferences: z.array(z.string().min(1)),
  styleDirection: z.array(z.string().min(1)),
  publicNotice: z.string().min(1),
});

export const catalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.iso.datetime(),
    profile: profileSchema,
    garments: z.array(garmentSchema),
    looks: z.array(lookSchema),
    outfits: z.array(outfitSchema),
  })
  .superRefine((catalog, context) => {
    const garmentIds = new Set(catalog.garments.map(({ id }) => id));
    for (const outfit of catalog.outfits) {
      for (const garmentId of outfit.garmentIds) {
        if (!garmentIds.has(garmentId)) {
          context.addIssue({
            code: "custom",
            message: `Outfit ${outfit.id} references unknown garment ${garmentId}`,
            path: ["outfits", catalog.outfits.indexOf(outfit), "garmentIds"],
          });
        }
      }
    }
    for (const look of catalog.looks) {
      for (const image of look.images) {
        for (const garmentId of image.garmentIds) {
          if (!garmentIds.has(garmentId)) {
            context.addIssue({
              code: "custom",
              message: `Look ${look.id} references unknown garment ${garmentId}`,
              path: [
                "looks",
                catalog.looks.indexOf(look),
                "images",
                look.images.indexOf(image),
                "garmentIds",
              ],
            });
          }
        }
      }

      const imageLevelUnindexedPieces = [
        ...new Set(look.images.flatMap((image) => image.unindexedPieces)),
      ].toSorted();
      const lookLevelUnindexedPieces = [...new Set(look.unindexedPieces)].toSorted();
      if (
        imageLevelUnindexedPieces.length !== lookLevelUnindexedPieces.length ||
        imageLevelUnindexedPieces.some((piece, index) => piece !== lookLevelUnindexedPieces[index])
      ) {
        context.addIssue({
          code: "custom",
          message: `Look ${look.id} unindexedPieces must equal the union of its image-level unindexedPieces`,
          path: ["looks", catalog.looks.indexOf(look), "unindexedPieces"],
        });
      }
    }
  });

export type Catalog = z.infer<typeof catalogSchema>;
export type Garment = z.infer<typeof garmentSchema>;
export type Look = z.infer<typeof lookSchema>;
export type Outfit = z.infer<typeof outfitSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type StyleProfile = z.infer<typeof styleProfileSchema>;
export type StyleTag = z.infer<typeof styleTagSchema>;

export function parseCatalog(input: unknown): Catalog {
  return catalogSchema.parse(input);
}
