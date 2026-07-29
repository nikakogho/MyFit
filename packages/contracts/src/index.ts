import { catalogSchema, garmentSchema, outfitSchema, profileSchema } from "@myfit/domain";
import { z } from "zod";

export {
  catalogSchema,
  garmentSchema,
  imageSchema,
  outfitSchema,
  parseCatalog,
  profileSchema,
  type Catalog,
  type Garment,
  type Outfit,
  type Profile,
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

export const garmentListSchema = z.object({
  garments: z.array(garmentSchema),
  count: z.number().int().nonnegative(),
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
