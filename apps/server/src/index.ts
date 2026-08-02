import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  adviseFootwear,
  getGarment,
  getLook,
  getOutfit,
  getOutfitOptions,
  matchingLookImages,
  searchEverything,
  searchGarments,
  searchLooks,
  searchOutfits,
} from "@myfit/application";
import {
  footwearAdviceInputSchema,
  footwearAdviceOutputSchema,
  fetchInputSchema,
  fetchOutputSchema,
  footwearComparisonInputSchema,
  footwearComparisonOutputSchema,
  garmentFilterSchema,
  garmentListSchema,
  lookFilterSchema,
  lookListSchema,
  outfitFilterSchema,
  outfitListSchema,
  outfitOptionsInputSchema,
  outfitOptionsOutputSchema,
  profileSchema,
  searchInputSchema,
  searchOutputSchema,
  type Catalog,
  type Garment,
  type Look,
  type LookFilter,
  type Outfit,
  type OutfitOptionsInput,
} from "@myfit/contracts";

import { footwearComparisonWidgetHtml } from "./footwear-comparison-widget.js";

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const footwearComparisonResourceUri = "ui://myfit/footwear-comparison-v2.html";

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("cache-control", "public, max-age=60, s-maxage=300");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function garmentText(garment: Garment): string {
  return [
    `${garment.brand ? `${garment.brand} ` : ""}${garment.name}.`,
    garment.colorDescription + ".",
    `${garment.silhouette}.`,
    `Good for ${garment.occasions.join(", ")} in ${garment.seasons.join(", ")}.`,
    garment.stylingNotes.join(" "),
  ].join(" ");
}

function outfitText(outfit: Outfit, catalog: Catalog): string {
  const names = outfit.garmentIds
    .map((id) => getGarment(catalog, id)?.name)
    .filter((name): name is string => Boolean(name));
  return [
    `${outfit.title}.`,
    outfit.rationale,
    `Wardrobe pieces: ${names.join(", ")}.`,
    outfit.missingPieces.length > 0
      ? `Complete it with: ${outfit.missingPieces.join(", ")}.`
      : "This outfit is complete.",
  ].join(" ");
}

function lookText(look: Look, catalog: Catalog): string {
  const garmentIds = [...new Set(look.images.flatMap((image) => image.garmentIds))];
  const names = garmentIds
    .map((id) => getGarment(catalog, id)?.name)
    .filter((name): name is string => Boolean(name));
  return [
    `${look.title}.`,
    look.notes,
    `Photographed wardrobe pieces: ${names.join(", ")}.`,
    look.unindexedPieces.length > 0
      ? `Unindexed visible pieces: ${look.unindexedPieces.join(", ")}.`
      : "Every recorded piece in this look is indexed.",
  ].join(" ");
}

function canonicalUrl(baseUrl: string, kind: "garments" | "looks" | "outfits", id: string): string {
  return new URL(`/${kind}/${id}`, baseUrl).toString();
}

function garmentWithPublicImages(garment: Garment, baseUrl: string) {
  return {
    ...garment,
    images: garment.images.map((image) => ({
      ...image,
      src: new URL(image.src, baseUrl).toString(),
    })),
  };
}

function garmentForAdvice(
  garment: Garment,
  baseUrl: string,
  styleProfile: NonNullable<Garment["styleProfile"]>,
) {
  const image = garment.images.find(({ role }) => role === "catalog") ?? garment.images[0];
  if (!image) {
    throw new Error(`Garment "${garment.id}" has no public image.`);
  }
  return {
    id: garment.id,
    name: garment.name,
    brand: garment.brand,
    colors: garment.colors,
    silhouette: garment.silhouette,
    image: {
      ...image,
      src: new URL(image.src, baseUrl).toString(),
    },
    styleProfile,
  };
}

function lookWithPublicImages(look: Look, baseUrl: string) {
  return {
    ...look,
    images: look.images.map((image) => ({
      ...image,
      src: new URL(image.src, baseUrl).toString(),
    })),
  };
}

function lookMatchWithPublicImages(look: Look, filter: LookFilter, baseUrl: string) {
  const publicLook = lookWithPublicImages(look, baseUrl);
  const matchingSources = new Set(matchingLookImages(look, filter).map(({ src }) => src));
  return {
    ...publicLook,
    matchingImages: publicLook.images.filter(({ src }) =>
      matchingSources.has(new URL(src).pathname),
    ),
  };
}

function garmentForOutfitOptions(garment: Garment, baseUrl: string) {
  const image = garment.images.find(({ role }) => role === "catalog") ?? garment.images[0];
  if (!image) throw new Error(`Garment "${garment.id}" has no public image.`);
  return {
    id: garment.id,
    name: garment.name,
    brand: garment.brand,
    category: garment.category,
    subcategory: garment.subcategory,
    colors: garment.colors,
    silhouette: garment.silhouette,
    fit: garment.fit,
    warmth: garment.warmth,
    seasons: garment.seasons,
    occasions: garment.occasions,
    stylingNotes: garment.stylingNotes,
    image: { ...image, src: new URL(image.src, baseUrl).toString() },
  };
}

function outfitOptionsResult(catalog: Catalog, target: OutfitOptionsInput, baseUrl: string) {
  const ranked = getOutfitOptions(catalog, target);
  const photographedLooks = ranked.photographedLooks.map(
    ({ look, matchingImages, score, matchReasons }) => {
      const garmentIds = [...new Set(look.images.flatMap((image) => image.garmentIds))];
      const garments = garmentIds
        .map((id) => getGarment(catalog, id))
        .filter((garment): garment is Garment => Boolean(garment))
        .map((garment) => garmentForOutfitOptions(garment, baseUrl));
      const publicLook = lookWithPublicImages(look, baseUrl);
      const matchingSources = new Set(matchingImages.map(({ src }) => src));
      return {
        id: look.id,
        title: look.title,
        notes: look.notes,
        occasions: look.occasions,
        seasons: look.seasons,
        tags: look.tags,
        unindexedPieces: look.unindexedPieces,
        privacyTreatment: look.privacyTreatment,
        images: publicLook.images,
        matchingImages: publicLook.images.filter(({ src }) =>
          matchingSources.has(new URL(src).pathname),
        ),
        score,
        matchReasons,
        garments,
        url: canonicalUrl(baseUrl, "looks", look.id),
      };
    },
  );
  const candidatesByCategory = Object.fromEntries(
    Object.entries(ranked.candidatesByCategory).map(([category, entries]) => [
      category,
      entries.map(({ garment, score, matchReasons }) => ({
        ...garmentForOutfitOptions(garment, baseUrl),
        score,
        matchReasons,
      })),
    ]),
  );
  return {
    strategy: "photographed-looks-first" as const,
    context: target,
    tier1: { photographedLooks, count: photographedLooks.length },
    tier2: { candidatesByCategory },
    guidance:
      "Prefer a photographed look when its pieces and context genuinely fit. Otherwise assemble a new outfit from the tier-2 owned garments. Clearly label assembled combinations as suggestions, not photographed looks.",
  };
}

function routePath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  return pathname
    .replace(/^\/\.netlify\/functions\/public-api/, "")
    .replace(/^\/api/, "")
    .replace(/\/+$/, "");
}

export function createPublicApiHandler(catalog: Catalog) {
  return (request: Request): Response => {
    if (request.method === "OPTIONS") {
      return json(null, { status: 204 });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(request.url);
    const path = routePath(request);

    if (path === "" || path === "/catalog") {
      return json(catalog);
    }
    if (path === "/profile") {
      return json(catalog.profile);
    }
    if (path === "/garments") {
      const parsed = garmentFilterSchema.safeParse({
        query: url.searchParams.get("query") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        color: url.searchParams.get("color") ?? undefined,
        season: url.searchParams.get("season") ?? undefined,
        occasion: url.searchParams.get("occasion") ?? undefined,
      });
      return parsed.success
        ? json({
            garments: searchGarments(catalog, parsed.data),
            count: searchGarments(catalog, parsed.data).length,
          })
        : json({ error: "Invalid garment filters", details: parsed.error.issues }, { status: 400 });
    }
    if (path.startsWith("/garments/")) {
      const garment = getGarment(catalog, decodeURIComponent(path.slice("/garments/".length)));
      return garment ? json(garment) : json({ error: "Garment not found" }, { status: 404 });
    }
    if (path === "/looks") {
      const garmentIds = url.searchParams
        .getAll("garmentId")
        .flatMap((value) => value.split(","))
        .filter(Boolean);
      const parsed = lookFilterSchema.safeParse({
        query: url.searchParams.get("query") ?? undefined,
        garmentIds: garmentIds.length > 0 ? garmentIds : undefined,
        match: url.searchParams.get("match") ?? undefined,
        season: url.searchParams.get("season") ?? undefined,
        occasion: url.searchParams.get("occasion") ?? undefined,
      });
      if (parsed.success) {
        const looks = searchLooks(catalog, parsed.data).map((look) => ({
          ...look,
          matchingImages: matchingLookImages(look, parsed.data),
        }));
        return json({ looks, count: looks.length });
      }
      return json({ error: "Invalid look filters", details: parsed.error.issues }, { status: 400 });
    }
    if (path.startsWith("/looks/")) {
      const look = getLook(catalog, decodeURIComponent(path.slice("/looks/".length)));
      return look ? json(look) : json({ error: "Look not found" }, { status: 404 });
    }
    if (path === "/outfits") {
      const parsed = outfitFilterSchema.safeParse({
        query: url.searchParams.get("query") ?? undefined,
        season: url.searchParams.get("season") ?? undefined,
        occasion: url.searchParams.get("occasion") ?? undefined,
      });
      return parsed.success
        ? json({
            outfits: searchOutfits(catalog, parsed.data),
            count: searchOutfits(catalog, parsed.data).length,
          })
        : json({ error: "Invalid outfit filters", details: parsed.error.issues }, { status: 400 });
    }
    if (path.startsWith("/outfits/")) {
      const outfit = getOutfit(catalog, decodeURIComponent(path.slice("/outfits/".length)));
      return outfit ? json(outfit) : json({ error: "Outfit not found" }, { status: 404 });
    }
    if (path === "/outfit-options") {
      const precipitation = url.searchParams.get("precipitationExpected");
      const parsed = outfitOptionsInputSchema.safeParse({
        request: url.searchParams.get("request") ?? undefined,
        requiredGarmentIds: url.searchParams.getAll("requiredGarmentId"),
        season: url.searchParams.get("season") ?? undefined,
        occasion: url.searchParams.get("occasion") ?? undefined,
        location: url.searchParams.get("location") ?? undefined,
        date: url.searchParams.get("date") ?? undefined,
        temperatureC:
          url.searchParams.get("temperatureC") === null
            ? undefined
            : Number(url.searchParams.get("temperatureC")),
        precipitationExpected:
          precipitation === null
            ? undefined
            : precipitation === "true"
              ? true
              : precipitation === "false"
                ? false
                : precipitation,
        weatherSummary: url.searchParams.get("weatherSummary") ?? undefined,
        desiredMood: url.searchParams.get("desiredMood") ?? undefined,
        limitPerCategory:
          url.searchParams.get("limitPerCategory") === null
            ? undefined
            : Number(url.searchParams.get("limitPerCategory")),
      });
      return parsed.success
        ? json(outfitOptionsResult(catalog, parsed.data, url.origin))
        : json(
            { error: "Invalid outfit-planning context", details: parsed.error.issues },
            { status: 400 },
          );
    }
    return json({ error: "Not found" }, { status: 404 });
  };
}

export function createMcpServer(catalog: Catalog, baseUrl: string): McpServer {
  const server = new McpServer(
    { name: "myfit-wardrobe", version: "1.4.0" },
    {
      instructions:
        "Use MyFit as the read-only source of the owner's wardrobe. Never imply that an uncatalogued item is owned. For a place, date, weather, activity, or general what-should-I-wear request, resolve relevant forecast context when available, then call get_outfit_options once. Prefer a suitable photographed tier-1 look; otherwise assemble a suggestion from tier-2 owned garments, and never describe an assembled suggestion as photographed. For footwear-only comparisons, call advise_footwear directly without searching first.",
    },
  );
  const publicOrigin = new URL(baseUrl).origin;

  server.registerResource(
    "MyFit footwear comparison",
    footwearComparisonResourceUri,
    {},
    async () => ({
      contents: [
        {
          uri: footwearComparisonResourceUri,
          mimeType: "text/html;profile=mcp-app",
          text: footwearComparisonWidgetHtml,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: [],
                resourceDomains: [publicOrigin],
              },
            },
            "openai/widgetDescription":
              "Interactive MyFit comparison showing a network-free trouser reference and ranked photos of footwear the owner actually owns.",
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [publicOrigin],
            },
          },
        },
      ],
    }),
  );

  server.registerTool(
    "search",
    {
      title: "Search the wardrobe",
      description:
        "Search the public wardrobe and saved outfit ideas. Use this before fetch when looking for relevant items.",
      inputSchema: searchInputSchema,
      outputSchema: searchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    ({ query }) => {
      const results = searchEverything(catalog, query).map((item) =>
        "category" in item
          ? {
              id: item.id,
              title: `${item.brand ? `${item.brand} ` : ""}${item.name}`,
              text: garmentText(item),
              url: canonicalUrl(baseUrl, "garments", item.id),
            }
          : "images" in item
            ? {
                id: item.id,
                title: item.title,
                text: lookText(item, catalog),
                url: canonicalUrl(baseUrl, "looks", item.id),
              }
            : {
                id: item.id,
                title: item.title,
                text: outfitText(item, catalog),
                url: canonicalUrl(baseUrl, "outfits", item.id),
              },
      );
      const output = { results };
      return {
        structuredContent: output,
        content: [{ type: "text", text: JSON.stringify(output) }],
      };
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch a wardrobe record",
      description:
        "Fetch the complete public garment or outfit record for an exact id returned by search.",
      inputSchema: fetchInputSchema,
      outputSchema: fetchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    ({ id }) => {
      const garment = getGarment(catalog, id);
      const look = getLook(catalog, id);
      const outfit = getOutfit(catalog, id);
      if (garment) {
        const output = {
          id: garment.id,
          title: `${garment.brand ? `${garment.brand} ` : ""}${garment.name}`,
          text: garmentText(garment),
          url: canonicalUrl(baseUrl, "garments", garment.id),
          metadata: {
            kind: "garment",
            ...garmentWithPublicImages(garment, baseUrl),
          },
        };
        return {
          structuredContent: output,
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      }
      if (look) {
        const output = {
          id: look.id,
          title: look.title,
          text: lookText(look, catalog),
          url: canonicalUrl(baseUrl, "looks", look.id),
          metadata: { kind: "look", ...lookWithPublicImages(look, baseUrl) },
        };
        return {
          structuredContent: output,
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      }
      if (outfit) {
        const output = {
          id: outfit.id,
          title: outfit.title,
          text: outfitText(outfit, catalog),
          url: canonicalUrl(baseUrl, "outfits", outfit.id),
          metadata: { kind: "outfit", ...outfit },
        };
        return {
          structuredContent: output,
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      }
      return {
        isError: true,
        content: [{ type: "text", text: `No public wardrobe record exists for id "${id}".` }],
      };
    },
  );

  server.registerTool(
    "search_garments",
    {
      title: "Filter garments",
      description:
        "Filter available public garments by free text, category, colour, season, or occasion.",
      inputSchema: garmentFilterSchema,
      outputSchema: garmentListSchema,
      annotations: readOnlyAnnotations,
    },
    (filter) => {
      const garments = searchGarments(catalog, filter).map((garment) =>
        garmentWithPublicImages(garment, baseUrl),
      );
      const output = { garments, count: garments.length };
      return {
        structuredContent: output,
        content: [{ type: "text", text: JSON.stringify(output) }],
      };
    },
  );

  server.registerTool(
    "find_worn_looks",
    {
      title: "Find photographed looks",
      description:
        "Use this when the user asks for real photos of outfits containing one or more owned garments, or wants to browse combinations they have actually worn. garmentIds use AND semantics by default: every selected garment must appear in the same individual photo. Each result's matchingImages are the authoritative matching photos; images contains the complete related look family. Set match to exact only when no additional indexed garments may be present.",
      inputSchema: lookFilterSchema,
      outputSchema: lookListSchema,
      annotations: readOnlyAnnotations,
    },
    (filter) => {
      const looks = searchLooks(catalog, filter).map((look) =>
        lookMatchWithPublicImages(look, filter, baseUrl),
      );
      const output = { looks, count: looks.length };
      return {
        structuredContent: output,
        content: [{ type: "text", text: JSON.stringify(output) }],
      };
    },
  );

  server.registerTool(
    "search_outfits",
    {
      title: "Search saved outfit directions",
      description: "Find saved outfit directions by text, season, or occasion.",
      inputSchema: outfitFilterSchema,
      outputSchema: outfitListSchema,
      annotations: readOnlyAnnotations,
    },
    (filter) => {
      const outfits = searchOutfits(catalog, filter);
      const output = { outfits, count: outfits.length };
      return {
        structuredContent: output,
        content: [{ type: "text", text: JSON.stringify(output) }],
      };
    },
  );

  server.registerTool(
    "get_outfit_options",
    {
      title: "Plan an outfit from the owned wardrobe",
      description:
        "Use this when the user asks what to wear for a place, date, forecast, activity, or occasion, optionally requiring specific garments. Resolve relevant external context such as tomorrow's forecast before calling when that capability is available. This single call searches real photographed looks as tier 1 and returns ranked individual owned garments as tier 2. In tier 1, matchingImages are the exact photos containing every required garment while images is the complete related look family. Prefer a genuinely suitable tier-1 look; otherwise assemble a new suggestion from tier 2 and label it as unphotographed.",
      inputSchema: outfitOptionsInputSchema,
      outputSchema: outfitOptionsOutputSchema,
      annotations: readOnlyAnnotations,
    },
    (target) => {
      const output = outfitOptionsResult(catalog, target, baseUrl);
      return {
        structuredContent: output,
        content: [
          {
            type: "text",
            text: `Found ${output.tier1.count} photographed look${output.tier1.count === 1 ? "" : "s"} for tier 1 and returned ranked owned garments for tier 2. Prefer a context-appropriate photographed look; otherwise assemble and clearly label a new suggestion.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "advise_footwear",
    {
      title: "Recommend owned footwear",
      description:
        "Use this when the user asks which owned shoes work with trousers, requests a footwear ranking, or wants that comparison visualized. Pass the trouser description and any known context once; this tool ranks every available owned pair and returns the completed interactive comparison without a separate search or render call.",
      inputSchema: footwearAdviceInputSchema,
      outputSchema: footwearAdviceOutputSchema,
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: footwearComparisonResourceUri },
        "openai/outputTemplate": footwearComparisonResourceUri,
        "openai/toolInvocation/invoking": "Matching your owned footwear…",
        "openai/toolInvocation/invoked": "Footwear advice ready.",
      },
    },
    (target) => {
      const ranked = adviseFootwear(catalog, target);
      if (ranked.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "No available footwear is recorded in the wardrobe." }],
        };
      }

      const rankedFootwear = ranked.map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        rationale: entry.rationale,
        stylingTip: entry.stylingTip,
        garment: garmentForAdvice(entry.garment, baseUrl, entry.styleProfile),
      }));
      const winner = rankedFootwear[0];
      const runnerUp = rankedFootwear[1];
      const recommendationSummary = runnerUp
        ? `Best match: ${winner?.garment.name} (${winner?.score}/100). Runner-up: ${runnerUp.garment.name} (${runnerUp.score}/100).`
        : `Best match: ${winner?.garment.name} (${winner?.score}/100).`;
      const output = {
        trouserName: target.trouserName,
        trouserDescription: target.trouserDescription,
        trouserStyle: target.trouserStyle,
        recommendationSummary,
        rankedFootwear,
      };

      return {
        structuredContent: output,
        content: [
          {
            type: "text",
            text: `${recommendationSummary} ${winner?.rationale ?? ""} The attached comparison includes every owned pair.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "render_footwear_comparison",
    {
      title: "Visualize a footwear comparison",
      description:
        "Use this only when a custom model-supplied footwear ranking must be rendered. For normal advice or comparison requests, use advise_footwear instead because it searches, ranks, and renders in one call. The widget draws its own generic trouser reference.",
      inputSchema: footwearComparisonInputSchema,
      outputSchema: footwearComparisonOutputSchema,
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: footwearComparisonResourceUri },
        "openai/outputTemplate": footwearComparisonResourceUri,
        "openai/toolInvocation/invoking": "Building the wardrobe comparison…",
        "openai/toolInvocation/invoked": "Wardrobe comparison ready.",
      },
    },
    ({ trouserName, trouserDescription, trouserStyle, rankedFootwear }) => {
      const seen = new Set<string>();
      const resolved = [];

      for (const [index, item] of rankedFootwear.entries()) {
        const garment = getGarment(catalog, item.garmentId);
        if (!garment || garment.category !== "footwear") {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `No available footwear record exists for id "${item.garmentId}".`,
              },
            ],
          };
        }
        if (seen.has(garment.id)) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Footwear id "${garment.id}" appears more than once in the ranking.`,
              },
            ],
          };
        }
        seen.add(garment.id);
        resolved.push({
          rank: index + 1,
          score: item.score,
          rationale: item.rationale,
          stylingTip: item.stylingTip ?? null,
          garment: garmentWithPublicImages(garment, baseUrl),
        });
      }

      const output = {
        trouserName,
        trouserDescription,
        trouserStyle,
        rankedFootwear: resolved,
      };

      return {
        structuredContent: output,
        content: [
          {
            type: "text",
            text: `Rendered ${resolved.length} owned footwear options for ${trouserName}. The top match is ${resolved[0]?.garment.name}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_owner_profile",
    {
      title: "Get public fit profile",
      description:
        "Return the public sizing, fit, location, and style context used when suggesting outfits.",
      outputSchema: profileSchema,
      annotations: readOnlyAnnotations,
    },
    () => ({
      structuredContent: catalog.profile,
      content: [{ type: "text", text: JSON.stringify(catalog.profile) }],
    }),
  );

  return server;
}

export async function handleMcpRequest(request: Request, catalog: Catalog): Promise<Response> {
  const origin = new URL(request.url).origin;
  const server = createMcpServer(catalog, origin);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
