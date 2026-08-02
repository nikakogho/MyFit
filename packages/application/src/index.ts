import type { Catalog, Garment, Look, Outfit, StyleProfile, StyleTag } from "@myfit/domain";

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

export interface LookFilter {
  query?: string | undefined;
  garmentIds?: string[] | undefined;
  match?: "contains" | "exact" | undefined;
  season?: Look["seasons"][number] | undefined;
  occasion?: string | undefined;
}

export interface OutfitOptionsTarget {
  request: string;
  requiredGarmentIds?: string[] | undefined;
  season?: Garment["seasons"][number] | undefined;
  occasion?: string | undefined;
  location?: string | undefined;
  date?: string | undefined;
  temperatureC?: number | undefined;
  precipitationExpected?: boolean | undefined;
  weatherSummary?: string | undefined;
  desiredMood?: string | undefined;
  limitPerCategory?: number | undefined;
}

export interface RankedLookOption {
  look: Look;
  matchingImages: Look["images"];
  score: number;
  matchReasons: string[];
}

export interface RankedGarmentOption {
  garment: Garment;
  score: number;
  matchReasons: string[];
}

export type TrouserStyle = "cargo" | "straight" | "wide-leg" | "tailored" | "slim" | "other";

export interface FootwearAdviceTarget {
  trouserName: string;
  trouserDescription: string;
  trouserStyle: TrouserStyle;
  trouserColors?: string[] | undefined;
  occasion?: string | undefined;
  season?: Garment["seasons"][number] | undefined;
  desiredMood?: string | undefined;
  preferredContrast?: "low" | "balanced" | "high" | undefined;
}

export interface RankedFootwearAdvice {
  garment: Garment;
  score: number;
  rationale: string;
  stylingTip: string;
  styleProfile: StyleProfile;
}

const formalityOrder = ["casual", "smart-casual", "formal"] as const;
const visualWeightOrder = ["light", "medium", "substantial"] as const;
const statementOrder = ["quiet", "balanced", "bold"] as const;
const styleTagWeights: Record<StyleTag, number> = {
  directional: 4,
  heritage: 6,
  minimal: 5,
  refined: 7,
  relaxed: 5,
  rugged: 6,
  sporty: 6,
  techwear: 7,
  utility: 7,
};
const knownColors = [
  "black",
  "charcoal",
  "grey",
  "gray",
  "white",
  "cream",
  "ecru",
  "brown",
  "tan",
  "olive",
  "green",
  "navy",
  "blue",
  "orange",
  "red",
  "burgundy",
] as const;

const neutralColors = new Set([
  "black",
  "charcoal",
  "grey",
  "white",
  "cream",
  "ecru",
  "brown",
  "tan",
  "navy",
  "olive",
]);

const styleKeywordTags: Array<[RegExp, StyleTag]> = [
  [/\b(?:tech|techwear|tactical)\b/i, "techwear"],
  [/\b(?:cargo|utility|workwear)\b/i, "utility"],
  [/\b(?:rugged|distressed|washed|lug)\b/i, "rugged"],
  [/\b(?:minimal|clean|simple|quiet)\b/i, "minimal"],
  [/\b(?:sport|sporty|athletic|trainer)\b/i, "sporty"],
  [/\b(?:tailored|smart|office|polished)\b/i, "refined"],
  [/\b(?:directional|avant|graphic|aggressive)\b/i, "directional"],
  [/\b(?:relaxed|loose|wide)\b/i, "relaxed"],
  [/\b(?:heritage|brogue|classic)\b/i, "heritage"],
];

const trouserStyleTargets: Record<
  TrouserStyle,
  {
    formality: StyleProfile["formality"];
    visualWeight: StyleProfile["visualWeight"];
    tags: StyleTag[];
  }
> = {
  cargo: {
    formality: "casual",
    visualWeight: "substantial",
    tags: ["utility", "techwear", "directional"],
  },
  straight: {
    formality: "casual",
    visualWeight: "medium",
    tags: ["minimal", "relaxed"],
  },
  "wide-leg": {
    formality: "casual",
    visualWeight: "substantial",
    tags: ["directional", "relaxed"],
  },
  tailored: {
    formality: "smart-casual",
    visualWeight: "medium",
    tags: ["refined", "minimal"],
  },
  slim: {
    formality: "smart-casual",
    visualWeight: "light",
    tags: ["minimal", "refined"],
  },
  other: {
    formality: "casual",
    visualWeight: "medium",
    tags: ["minimal"],
  },
};

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

function garmentIdsForLook(look: Look): string[] {
  return [...new Set(look.images.flatMap((image) => image.garmentIds))];
}

function lookSearchText(look: Look, catalog: Catalog): string {
  const garmentNames = garmentIdsForLook(look)
    .map((id) => catalog.garments.find((garment) => garment.id === id)?.name ?? "")
    .join(" ");
  return [
    look.title,
    look.notes,
    look.unindexedPieces.join(" "),
    look.occasions.join(" "),
    look.seasons.join(" "),
    look.tags.join(" "),
    garmentNames,
  ].join(" ");
}

function imageMatchesGarments(
  imageGarmentIds: string[],
  requiredGarmentIds: string[],
  match: "contains" | "exact",
): boolean {
  const imageIds = new Set(imageGarmentIds);
  const containsEveryRequired = requiredGarmentIds.every((id) => imageIds.has(id));
  return (
    containsEveryRequired &&
    (match === "contains" || imageIds.size === new Set(requiredGarmentIds).size)
  );
}

export function matchingLookImages(
  look: Look,
  filter: Pick<LookFilter, "garmentIds" | "match"> = {},
): Look["images"] {
  const requiredGarmentIds = filter.garmentIds ?? [];
  if (requiredGarmentIds.length === 0) return look.images;
  const match = filter.match ?? "contains";
  return look.images.filter((image) =>
    imageMatchesGarments(image.garmentIds, requiredGarmentIds, match),
  );
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

export function searchLooks(catalog: Catalog, filter: LookFilter = {}): Look[] {
  const requiredGarmentIds = filter.garmentIds ?? [];
  const match = filter.match ?? "contains";
  return catalog.looks.filter(
    (look) =>
      (!filter.season || look.seasons.includes(filter.season)) &&
      (!filter.occasion ||
        look.occasions.some((occasion) => includes(occasion, filter.occasion))) &&
      (requiredGarmentIds.length === 0 ||
        matchingLookImages(look, { garmentIds: requiredGarmentIds, match }).length > 0) &&
      includes(lookSearchText(look, catalog), filter.query),
  );
}

export function getGarment(catalog: Catalog, id: string): Garment | undefined {
  return catalog.garments.find((garment) => garment.id === id);
}

export function getOutfit(catalog: Catalog, id: string): Outfit | undefined {
  return catalog.outfits.find((outfit) => outfit.id === id);
}

export function getLook(catalog: Catalog, id: string): Look | undefined {
  return catalog.looks.find((look) => look.id === id);
}

export function searchEverything(catalog: Catalog, query: string): Array<Garment | Look | Outfit> {
  return [
    ...searchGarments(catalog, { query }),
    ...searchLooks(catalog, { query }),
    ...searchOutfits(catalog, { query }),
  ];
}

const contextStopWords = new Set([
  "about",
  "anything",
  "clothes",
  "could",
  "from",
  "have",
  "outfit",
  "please",
  "should",
  "suggest",
  "that",
  "these",
  "this",
  "tomorrow",
  "wear",
  "what",
  "with",
]);

function contextTokens(value: string): string[] {
  return [
    ...new Set(
      value
        .toLocaleLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && !contextStopWords.has(token)),
    ),
  ];
}

function contextOverlap(text: string, target: OutfitOptionsTarget): string[] {
  const targetText = [
    target.request,
    target.occasion ?? "",
    target.desiredMood ?? "",
    target.weatherSummary ?? "",
  ].join(" ");
  const haystack = text.toLocaleLowerCase();
  return contextTokens(targetText).filter((token) => haystack.includes(token));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function occasionMatches(occasions: string[], targetOccasion: string): boolean {
  const normalizedTarget = targetOccasion.toLocaleLowerCase();
  const targetTokens = contextTokens(targetOccasion);
  return occasions.some((occasion) => {
    const normalizedOccasion = occasion.toLocaleLowerCase();
    return (
      normalizedOccasion.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedOccasion) ||
      targetTokens.some((token) => normalizedOccasion.includes(token))
    );
  });
}

function rankLook(
  catalog: Catalog,
  look: Look,
  target: OutfitOptionsTarget,
): Omit<RankedLookOption, "matchingImages"> {
  let score = 45;
  const matchReasons: string[] = [];
  const required = target.requiredGarmentIds ?? [];
  const lookGarmentIds = new Set(garmentIdsForLook(look));
  if (required.length > 0 && required.every((id) => lookGarmentIds.has(id))) {
    score += 20;
    matchReasons.push("Contains every required garment.");
  }
  if (target.season) {
    if (look.seasons.includes(target.season)) {
      score += 15;
      matchReasons.push(`Photographed look is tagged for ${target.season}.`);
    } else {
      score -= 15;
    }
  }
  if (target.occasion && occasionMatches(look.occasions, target.occasion)) {
    score += 15;
    matchReasons.push(`Occasion tags overlap with ${target.occasion}.`);
  }
  const overlap = contextOverlap(lookSearchText(look, catalog), target);
  if (overlap.length > 0) {
    score += Math.min(15, overlap.length * 4);
    matchReasons.push(`Context overlap: ${overlap.slice(0, 4).join(", ")}.`);
  }
  if (target.precipitationExpected) {
    const lookText = lookSearchText(look, catalog);
    if (/\b(?:rain|waterproof|weatherproof|shell|parka|nylon)\b/i.test(lookText)) {
      score += 8;
      matchReasons.push("Includes weather-protective characteristics for expected precipitation.");
    }
  }
  if (matchReasons.length === 0) {
    matchReasons.push("Real photographed combination available for comparison.");
  }
  return { look, score: clampScore(score), matchReasons };
}

const warmthOrder = ["very-light", "light", "medium", "warm"] as const;

function targetOuterwearWarmth(temperatureC: number): (typeof warmthOrder)[number] {
  if (temperatureC <= 5) return "warm";
  if (temperatureC <= 12) return "medium";
  if (temperatureC <= 20) return "light";
  return "very-light";
}

function rankGarment(garment: Garment, target: OutfitOptionsTarget): RankedGarmentOption {
  let score = 45;
  const matchReasons: string[] = [];
  if (target.requiredGarmentIds?.includes(garment.id)) {
    score += 40;
    matchReasons.push("Required by the user.");
  }
  if (target.season) {
    if (garment.seasons.includes(target.season)) {
      score += 15;
      matchReasons.push(`Suitable for ${target.season}.`);
    } else {
      score -= 20;
    }
  }
  if (target.occasion && occasionMatches(garment.occasions, target.occasion)) {
    score += 15;
    matchReasons.push(`Occasion metadata overlaps with ${target.occasion}.`);
  }
  const searchable = garmentSearchText(garment);
  const overlap = contextOverlap(searchable, target);
  if (overlap.length > 0) {
    score += Math.min(12, overlap.length * 3);
    matchReasons.push(`Context overlap: ${overlap.slice(0, 4).join(", ")}.`);
  }
  if (target.precipitationExpected && garment.category === "outerwear") {
    if (/\b(?:rain|waterproof|weatherproof|shell|parka|nylon)\b/i.test(searchable)) {
      score += 12;
      matchReasons.push("Useful weather protection for expected precipitation.");
    }
  }
  if (target.temperatureC !== undefined && garment.category === "outerwear" && garment.warmth) {
    const targetWarmth = targetOuterwearWarmth(target.temperatureC);
    const distance = Math.abs(
      warmthOrder.indexOf(garment.warmth) - warmthOrder.indexOf(targetWarmth),
    );
    score += Math.max(-12, 12 - distance * 8);
    if (distance <= 1) {
      matchReasons.push(`Warmth is plausible around ${target.temperatureC}°C.`);
    }
  }
  if (matchReasons.length === 0) {
    matchReasons.push("Available owned garment for ChatGPT to evaluate in the assembled outfit.");
  }
  return { garment, score: clampScore(score), matchReasons };
}

export function getOutfitOptions(catalog: Catalog, target: OutfitOptionsTarget) {
  const required = target.requiredGarmentIds ?? [];
  const photographedLooks = catalog.looks
    .filter(
      (look) =>
        required.length === 0 ||
        look.images.some((image) => imageMatchesGarments(image.garmentIds, required, "contains")),
    )
    .map((look) => ({
      ...rankLook(catalog, look, target),
      matchingImages: matchingLookImages(look, { garmentIds: required }),
    }))
    .sort((left, right) => right.score - left.score || left.look.id.localeCompare(right.look.id));

  const limit = target.limitPerCategory ?? 5;
  const categories = ["outerwear", "tops", "bottoms", "footwear", "accessories"] as const;
  const candidatesByCategory = Object.fromEntries(
    categories.map((category) => [
      category,
      catalog.garments
        .filter((garment) => garment.category === category)
        .map((garment) => rankGarment(garment, target))
        .sort(
          (left, right) =>
            right.score - left.score || left.garment.id.localeCompare(right.garment.id),
        )
        .slice(0, limit),
    ]),
  ) as Record<(typeof categories)[number], RankedGarmentOption[]>;

  return { photographedLooks, candidatesByCategory };
}

function textForGarment(garment: Garment): string {
  return [
    garment.name,
    garment.subcategory,
    garment.colorDescription,
    garment.silhouette,
    garment.stylingNotes.join(" "),
    garment.searchTerms.join(" "),
  ].join(" ");
}

function inferStyleTags(text: string): StyleTag[] {
  return styleKeywordTags.filter(([pattern]) => pattern.test(text)).map(([, tag]) => tag);
}

export function resolveStyleProfile(garment: Garment): StyleProfile {
  if (garment.styleProfile) {
    return garment.styleProfile;
  }

  const text = textForGarment(garment);
  const tags = inferStyleTags(text);
  const isHighTopOrChunky = /\b(?:high-top|chunky|lug|substantial|rugged)\b/i.test(text);
  const isRefined = /\b(?:brogue|refined|smart casual|dress)\b/i.test(text);
  const isBold = /\b(?:bold|distressed|colour|color|statement|zip)\b/i.test(text);
  const isWarm = garment.colors.some((color) => /brown|cream|tan|orange|burgundy/i.test(color));
  const isCool = garment.colors.some((color) => /blue|navy|grey|gray|charcoal/i.test(color));

  return {
    formality: isRefined ? "smart-casual" : "casual",
    visualWeight: isHighTopOrChunky ? "substantial" : "medium",
    statementLevel: isBold ? "bold" : "balanced",
    palette: isWarm && isCool ? "mixed" : isWarm ? "warm" : isCool ? "cool" : "neutral",
    styleTags: tags.length > 0 ? [...new Set(tags)] : ["minimal"],
  };
}

function normalizeColor(color: string): string {
  const normalized = color.toLocaleLowerCase().trim();
  return normalized === "gray" ? "grey" : normalized;
}

function inferTargetColors(target: FootwearAdviceTarget): string[] {
  const explicit = target.trouserColors?.map(normalizeColor).filter(Boolean) ?? [];
  if (explicit.length > 0) {
    return [...new Set(explicit)];
  }
  const text = `${target.trouserName} ${target.trouserDescription}`.toLocaleLowerCase();
  return [
    ...new Set(
      knownColors
        .filter((color) => new RegExp(`\\b${color}\\b`, "i").test(text))
        .map(normalizeColor),
    ),
  ];
}

function inferTargetTags(target: FootwearAdviceTarget): StyleTag[] {
  const base = trouserStyleTargets[target.trouserStyle].tags;
  const inferred = inferStyleTags(
    `${target.trouserName} ${target.trouserDescription} ${target.desiredMood ?? ""}`,
  );
  return [...new Set([...base, ...inferred])];
}

function targetFormality(target: FootwearAdviceTarget): StyleProfile["formality"] {
  const text = `${target.occasion ?? ""} ${target.desiredMood ?? ""}`;
  if (/\b(?:formal|wedding|black tie)\b/i.test(text)) return "formal";
  if (/\b(?:office|smart|dinner|date|polished)\b/i.test(text)) return "smart-casual";
  return trouserStyleTargets[target.trouserStyle].formality;
}

function targetStatementLevel(target: FootwearAdviceTarget): StyleProfile["statementLevel"] {
  if (target.preferredContrast === "low") return "quiet";
  if (target.preferredContrast === "high") return "bold";
  if (/\b(?:bold|statement|colour|color|loud|aggressive)\b/i.test(target.desiredMood ?? "")) {
    return "bold";
  }
  if (/\b(?:quiet|minimal|subtle|restrained)\b/i.test(target.desiredMood ?? "")) {
    return "quiet";
  }
  return "balanced";
}

function distanceScore<T extends string>(
  actual: T,
  target: T,
  order: readonly T[],
  scores: readonly [number, number, number],
): number {
  const distance = Math.abs(order.indexOf(actual) - order.indexOf(target));
  return scores[Math.min(distance, 2)] ?? 0;
}

function dominantColorCompatibility(targetColors: string[], garment: Garment): number {
  if (targetColors.length === 0) return 7;

  const dominant = normalizeColor(garment.colors[0] ?? "");
  const secondary = garment.colors.slice(1).map(normalizeColor);
  let best = 4;

  for (const target of targetColors) {
    if (dominant === target) {
      best = Math.max(best, 12);
    } else if (target === "black") {
      if (dominant === "charcoal") best = Math.max(best, 11);
      else if (dominant === "grey") best = Math.max(best, 10);
      else if (["brown", "navy", "olive"].includes(dominant)) best = Math.max(best, 8);
      else if (["white", "cream", "ecru"].includes(dominant)) best = Math.max(best, 7);
      else best = Math.max(best, 5);
    } else if (neutralColors.has(dominant) && neutralColors.has(target)) {
      best = Math.max(best, 10);
    } else if (target === "navy" && ["orange", "cream", "brown", "grey"].includes(dominant)) {
      best = Math.max(best, 9);
    } else if (target === "olive" && ["cream", "brown", "black", "grey"].includes(dominant)) {
      best = Math.max(best, 9);
    }

    if (secondary.includes(target)) {
      best = Math.max(best, 8);
    }
  }

  return best;
}

function overlap<T>(left: T[], right: T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function buildRationale(
  garment: Garment,
  profile: StyleProfile,
  target: FootwearAdviceTarget,
  targetColors: string[],
  matchingTags: StyleTag[],
): string {
  const sentences: string[] = [];
  if (profile.visualWeight === trouserStyleTargets[target.trouserStyle].visualWeight) {
    sentences.push(
      `Its ${profile.visualWeight} visual weight balances the ${target.trouserStyle} shape.`,
    );
  }
  if (targetColors.length > 0) {
    sentences.push(
      `The ${garment.colors.slice(0, 2).join(" and ")} palette works with ${targetColors.join(" and ")}.`,
    );
  }
  if (matchingTags.length > 0) {
    sentences.push(
      `Its ${matchingTags.slice(0, 2).join(" and ")} details reinforce the intended character.`,
    );
  }
  if (sentences.length === 0) {
    sentences.push(`${garment.silhouette} gives the outfit a coherent proportion.`);
  }
  return sentences.join(" ");
}

function buildStylingTip(garment: Garment, target: FootwearAdviceTarget): string {
  if (/\bhigh-top\b/i.test(garment.subcategory + " " + garment.silhouette)) {
    return "Let the trouser hem meet or slightly overlap the padded collar.";
  }
  if (target.trouserStyle === "cargo" || target.trouserStyle === "wide-leg") {
    return "Keep the hem clean so the sole and upper remain visible beneath the heavier trouser.";
  }
  if (target.trouserStyle === "tailored") {
    return "Use a clean hem with little or no break to keep the pairing deliberate.";
  }
  return garment.stylingNotes[0] ?? "Keep the rest of the outfit visually simple.";
}

export function adviseFootwear(
  catalog: Catalog,
  target: FootwearAdviceTarget,
): RankedFootwearAdvice[] {
  const targetColors = inferTargetColors(target);
  const targetTags = inferTargetTags(target);
  const desiredFormality = targetFormality(target);
  const desiredWeight = trouserStyleTargets[target.trouserStyle].visualWeight;
  const desiredStatement = targetStatementLevel(target);

  return catalog.garments
    .filter((garment) => garment.category === "footwear")
    .map((garment) => {
      const profile = resolveStyleProfile(garment);
      const matchingTags = overlap(profile.styleTags, targetTags);
      const formalityScore = distanceScore(
        profile.formality,
        desiredFormality,
        formalityOrder,
        [12, 7, 1],
      );
      const weightScore = distanceScore(
        profile.visualWeight,
        desiredWeight,
        visualWeightOrder,
        [16, 9, 2],
      );
      const statementScore = distanceScore(
        profile.statementLevel,
        desiredStatement,
        statementOrder,
        [3, 1, 0],
      );
      const tagScore = Math.min(
        18,
        matchingTags.reduce((total, tag) => total + styleTagWeights[tag], 0),
      );
      const colorScore = dominantColorCompatibility(targetColors, garment);
      const occasionScore =
        target.occasion && garment.occasions.some((occasion) => includes(occasion, target.occasion))
          ? 5
          : 0;
      const seasonScore = target.season && garment.seasons.includes(target.season) ? 4 : 0;
      const score = Math.min(
        99,
        48 +
          formalityScore +
          weightScore +
          statementScore +
          tagScore +
          colorScore +
          occasionScore +
          seasonScore,
      );

      return {
        garment,
        score,
        rationale: buildRationale(garment, profile, target, targetColors, matchingTags),
        stylingTip: buildStylingTip(garment, target),
        styleProfile: profile,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.garment.name.localeCompare(right.garment.name, "en"),
    );
}
