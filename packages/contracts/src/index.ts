import {
  catalogSchema,
  garmentSchema,
  imageSchema,
  lookImageSchema,
  lookSchema,
  outfitSchema,
  profileSchema,
  styleProfileSchema,
} from "@myfit/domain";
import { z } from "zod";

export {
  catalogSchema,
  garmentSchema,
  imageSchema,
  lookImageSchema,
  lookSchema,
  outfitSchema,
  parseCatalog,
  profileSchema,
  styleProfileSchema,
  styleTagSchema,
  type Catalog,
  type Garment,
  type Look,
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

export const lookFilterSchema = z.object({
  query: z.string().max(200).optional(),
  garmentIds: z.array(z.string().min(1)).max(12).optional(),
  match: z.enum(["contains", "exact"]).default("contains"),
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

export const publicLookImageSchema = lookImageSchema.extend({
  src: z.string().url(),
});

export const publicLookSchema = lookSchema.extend({
  images: z.array(publicLookImageSchema).min(1),
});

export const garmentListSchema = z.object({
  garments: z.array(publicGarmentSchema),
  count: z.number().int().nonnegative(),
});

export const lookListSchema = z.object({
  looks: z.array(publicLookSchema),
  count: z.number().int().nonnegative(),
});

export const outfitOptionsInputSchema = z.object({
  request: z.string().min(1).max(500),
  requiredGarmentIds: z.array(z.string().min(1)).max(12).optional(),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  occasion: z.string().min(1).max(120).optional(),
  location: z.string().min(1).max(120).optional(),
  date: z.string().min(1).max(80).optional(),
  temperatureC: z.number().min(-30).max(50).optional(),
  precipitationExpected: z.boolean().optional(),
  weatherSummary: z.string().min(1).max(240).optional(),
  desiredMood: z.string().min(1).max(160).optional(),
  limitPerCategory: z.number().int().min(1).max(10).default(5),
});

export const outfitCandidateGarmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  category: garmentSchema.shape.category,
  subcategory: z.string(),
  colors: z.array(z.string()),
  silhouette: z.string(),
  fit: z.string().nullable(),
  warmth: garmentSchema.shape.warmth,
  seasons: garmentSchema.shape.seasons,
  occasions: garmentSchema.shape.occasions,
  stylingNotes: garmentSchema.shape.stylingNotes,
  image: publicImageSchema,
  score: z.number().int().min(0).max(100),
  matchReasons: z.array(z.string()),
});

export const photographedLookMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string(),
  occasions: z.array(z.string()),
  seasons: z.array(z.string()),
  tags: z.array(z.string()),
  unindexedPieces: z.array(z.string()),
  privacyTreatment: lookSchema.shape.privacyTreatment,
  score: z.number().int().min(0).max(100),
  matchReasons: z.array(z.string()),
  images: z.array(publicLookImageSchema),
  garments: z.array(outfitCandidateGarmentSchema.omit({ score: true, matchReasons: true })),
  url: z.string().url(),
});

export const outfitOptionsOutputSchema = z.object({
  strategy: z.literal("photographed-looks-first"),
  context: outfitOptionsInputSchema,
  tier1: z.object({
    photographedLooks: z.array(photographedLookMatchSchema),
    count: z.number().int().nonnegative(),
  }),
  tier2: z.object({
    candidatesByCategory: z.object({
      outerwear: z.array(outfitCandidateGarmentSchema),
      tops: z.array(outfitCandidateGarmentSchema),
      bottoms: z.array(outfitCandidateGarmentSchema),
      footwear: z.array(outfitCandidateGarmentSchema),
      accessories: z.array(outfitCandidateGarmentSchema),
    }),
  }),
  guidance: z.string(),
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
export type LookFilter = z.infer<typeof lookFilterSchema>;
export type OutfitFilter = z.infer<typeof outfitFilterSchema>;
export type OutfitOptionsInput = z.infer<typeof outfitOptionsInputSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type PublicationManifest = z.infer<typeof publicationManifestSchema>;
