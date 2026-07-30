import {
  catalogSchema,
  garmentSchema,
  imageSchema,
  outfitSchema,
  profileSchema,
  styleProfileSchema,
} from "@myfit/domain";
import { z } from "zod";

export {
  catalogSchema,
  garmentSchema,
  imageSchema,
  outfitSchema,
  parseCatalog,
  profileSchema,
  styleProfileSchema,
  styleTagSchema,
  type Catalog,
  type Garment,
  type Outfit,
  type Profile,
  type StyleProfile,
  type StyleTag,
} from "@myfit/domain";

export const searchInputSchema = z.object({
  query: z.string().min(1).max(200),
});

export const fetchInputSchema = z.object({
  id: z.string().min(1),
});

export const garmentFilterSchema = z.object({
  query: z.string().max(200).optional(),
  category: garmentSchema.shape.category.optional(),
  color: z.string().max(50).optional(),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  occasion: z.string().max(80).optional(),
});

export const outfitFilterSchema = z.object({
  query: z.string().max(200).optional(),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  occasion: z.string().max(80).optional(),
});

export const searchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string().url(),
});

export const searchOutputSchema = z.object({
  results: z.array(searchResultSchema),
});

export const fetchOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string().url(),
  metadata: z.record(z.string(), z.unknown()),
});

export const publicImageSchema = imageSchema.extend({
  src: z.string().url(),
});

export const publicGarmentSchema = garmentSchema.extend({
  images: z.array(publicImageSchema).min(1),
});

export const garmentListSchema = z.object({
  garments: z.array(publicGarmentSchema),
  count: z.number().int().nonnegative(),
});

export const footwearComparisonInputSchema = z.object({
  trouserName: z.string().min(1).max(120),
  trouserDescription: z.string().min(1).max(500),
  trouserStyle: z
    .enum(["cargo", "straight", "wide-leg", "tailored", "slim", "other"])
    .default("other"),
  rankedFootwear: z
    .array(
      z.object({
        garmentId: z.string().min(1),
        score: z.number().int().min(0).max(100),
        rationale: z.string().min(1).max(500),
        stylingTip: z.string().min(1).max(300).optional(),
      }),
    )
    .min(1)
    .max(8),
});

export const footwearComparisonOutputSchema = z.object({
  trouserName: z.string(),
  trouserDescription: z.string(),
  trouserStyle: z.enum(["cargo", "straight", "wide-leg", "tailored", "slim", "other"]),
  rankedFootwear: z.array(
    z.object({
      rank: z.number().int().positive(),
      score: z.number().int().min(0).max(100),
      rationale: z.string(),
      stylingTip: z.string().nullable(),
      garment: publicGarmentSchema,
    }),
  ),
});

export const footwearAdviceInputSchema = z.object({
  trouserName: z.string().min(1).max(120),
  trouserDescription: z.string().min(1).max(500),
  trouserStyle: z
    .enum(["cargo", "straight", "wide-leg", "tailored", "slim", "other"])
    .default("other"),
  trouserColors: z.array(z.string().min(1).max(40)).max(4).optional(),
  occasion: z.string().min(1).max(80).optional(),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  desiredMood: z.string().min(1).max(160).optional(),
  preferredContrast: z.enum(["low", "balanced", "high"]).default("balanced"),
});

export const adviceFootwearGarmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  colors: z.array(z.string()),
  silhouette: z.string(),
  image: publicImageSchema,
  styleProfile: styleProfileSchema,
});

export const footwearAdviceOutputSchema = z.object({
  trouserName: z.string(),
  trouserDescription: z.string(),
  trouserStyle: z.enum(["cargo", "straight", "wide-leg", "tailored", "slim", "other"]),
  recommendationSummary: z.string(),
  rankedFootwear: z.array(
    z.object({
      rank: z.number().int().positive(),
      score: z.number().int().min(0).max(100),
      rationale: z.string(),
      stylingTip: z.string(),
      garment: adviceFootwearGarmentSchema,
    }),
  ),
});

export const outfitListSchema = z.object({
  outfits: z.array(outfitSchema),
  count: z.number().int().nonnegative(),
});

export const publicCatalogSchema = catalogSchema;
export const publicProfileSchema = profileSchema;

export const publicationAssetSchema = z.object({
  source: z.string().min(1),
  destinationName: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9.-]*\.(?:jpe?g|png|webp)$/i),
});

export const publicationManifestSchema = z.object({
  acknowledgement: z.literal("I understand these files and metadata will be public."),
  catalog: catalogSchema,
  assets: z.array(publicationAssetSchema),
});

export type GarmentFilter = z.infer<typeof garmentFilterSchema>;
export type OutfitFilter = z.infer<typeof outfitFilterSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type PublicationManifest = z.infer<typeof publicationManifestSchema>;
