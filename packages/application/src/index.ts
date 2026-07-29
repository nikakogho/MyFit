import type { Catalog, Garment, Outfit } from "@myfit/domain";

export interface GarmentFilter {
  query?: string | undefined;
  category?: Garment["category"] | undefined;
  color?: string | undefined;
  season?: Garment["seasons"][number] | undefined;
  occasion?: string | undefined;
}

export interface OutfitFilter {
  query?: string | undefined;
  season?: Outfit["seasons"][number] | undefined;
  occasion?: string | undefined;
}

function includes(haystack: string, needle: string | undefined): boolean {
  return !needle || haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

function garmentSearchText(garment: Garment): string {
  return [
    garment.name,
    garment.brand ?? "",
    garment.category,
    garment.subcategory,
    garment.colorDescription,
    garment.colors.join(" "),
    garment.materials.join(" "),
    garment.silhouette,
    garment.fit ?? "",
    garment.occasions.join(" "),
    garment.seasons.join(" "),
    garment.stylingNotes.join(" "),
    garment.searchTerms.join(" "),
  ].join(" ");
}

function outfitSearchText(outfit: Outfit): string {
  return [
    outfit.title,
    outfit.rationale,
    outfit.missingPieces.join(" "),
    outfit.occasions.join(" "),
    outfit.seasons.join(" "),
    outfit.tags.join(" "),
  ].join(" ");
}

export function searchGarments(catalog: Catalog, filter: GarmentFilter = {}): Garment[] {
  return catalog.garments.filter(
    (garment) =>
      (!filter.category || garment.category === filter.category) &&
      (!filter.color || garment.colors.some((color) => includes(color, filter.color))) &&
      (!filter.season || garment.seasons.includes(filter.season)) &&
      (!filter.occasion ||
        garment.occasions.some((occasion) => includes(occasion, filter.occasion))) &&
      includes(garmentSearchText(garment), filter.query),
  );
}

export function searchOutfits(catalog: Catalog, filter: OutfitFilter = {}): Outfit[] {
  return catalog.outfits.filter(
    (outfit) =>
      (!filter.season || outfit.seasons.includes(filter.season)) &&
      (!filter.occasion ||
        outfit.occasions.some((occasion) => includes(occasion, filter.occasion))) &&
      includes(outfitSearchText(outfit), filter.query),
  );
}

export function getGarment(catalog: Catalog, id: string): Garment | undefined {
  return catalog.garments.find((garment) => garment.id === id);
}

export function getOutfit(catalog: Catalog, id: string): Outfit | undefined {
  return catalog.outfits.find((outfit) => outfit.id === id);
}

export function searchEverything(catalog: Catalog, query: string): Array<Garment | Outfit> {
  return [...searchGarments(catalog, { query }), ...searchOutfits(catalog, { query })];
}
