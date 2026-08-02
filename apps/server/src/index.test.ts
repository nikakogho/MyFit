import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import type { Catalog } from "@myfit/contracts";

import { createMcpServer, createPublicApiHandler } from "./index.js";

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
  garments: [
    {
      id: "brown-jacket",
      name: "Brown jacket",
      brand: "Test",
      category: "footwear",
      subcategory: "shirt-jacket",
      colors: ["brown"],
      colorDescription: "Brown",
      materials: ["nylon"],
      silhouette: "regular",
      fit: "regular",
      warmth: "light",
      seasons: ["spring"],
      occasions: ["casual"],
      stylingNotes: ["Layer it"],
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
    },
  ],
  looks: [
    {
      id: "brown-look",
      title: "Brown casual look",
      images: [
        {
          src: "/media/look.jpg",
          alt: "Brown casual look",
          role: "worn",
          width: 10,
          height: 20,
          garmentIds: ["brown-jacket"],
          variantLabel: "Brown jacket variant",
          unindexedPieces: [],
        },
      ],
      unindexedPieces: [],
      notes: "A photographed casual look.",
      occasions: ["city visit"],
      seasons: ["spring"],
      tags: ["casual"],
      privacyTreatment: "as-is",
      addedAt: "2026-08-02T12:00:00.000Z",
    },
  ],
  outfits: [],
};

describe("public API", () => {
  it("serves and filters garments", async () => {
    const handler = createPublicApiHandler(catalog);
    const response = handler(new Request("https://example.com/api/garments?query=overshirt"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ count: 1 });
  });

  it("filters photographed looks and returns tiered outfit options", async () => {
    const handler = createPublicApiHandler(catalog);
    const looksResponse = handler(
      new Request("https://example.com/api/looks?garmentId=brown-jacket&match=contains"),
    );
    await expect(looksResponse.json()).resolves.toMatchObject({
      count: 1,
      looks: [{ id: "brown-look", matchingImages: [{ src: "/media/look.jpg" }] }],
    });

    const optionsResponse = handler(
      new Request(
        "https://example.com/api/outfit-options?request=Cambridge%20tomorrow&occasion=city%20visit&season=spring",
      ),
    );
    await expect(optionsResponse.json()).resolves.toMatchObject({
      strategy: "photographed-looks-first",
      tier1: { count: 1, photographedLooks: [{ id: "brown-look" }] },
      tier2: { candidatesByCategory: { footwear: [{ id: "brown-jacket" }] } },
    });
  });
});

describe("MCP server", () => {
  it("exposes searchable read-only wardrobe tools", async () => {
    const server = createMcpServer(catalog, "https://example.com");
    const client = new Client({ name: "test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    expect(client.getInstructions()).toContain("call advise_footwear directly");

    const tools = await client.listTools();
    expect(tools.tools.map(({ name }) => name)).toContain("search");
    expect(tools.tools.map(({ name }) => name)).toContain("advise_footwear");
    expect(tools.tools.map(({ name }) => name)).toContain("render_footwear_comparison");
    expect(tools.tools.map(({ name }) => name)).toContain("find_worn_looks");
    expect(tools.tools.map(({ name }) => name)).toContain("get_outfit_options");
    const result = await client.callTool({ name: "search", arguments: { query: "brown" } });
    expect(result.structuredContent).toMatchObject({
      results: expect.arrayContaining([
        {
          id: "brown-jacket",
          title: expect.any(String),
          text: expect.any(String),
          url: expect.any(String),
        },
        {
          id: "brown-look",
          title: expect.any(String),
          text: expect.any(String),
          url: expect.any(String),
        },
      ]),
    });

    const garmentResult = await client.callTool({
      name: "search_garments",
      arguments: { category: "footwear" },
    });
    expect(garmentResult.structuredContent).toMatchObject({
      garments: [
        {
          id: "brown-jacket",
          images: [{ src: "https://example.com/media/test.jpg" }],
        },
      ],
      count: 1,
    });

    const lookResult = await client.callTool({
      name: "find_worn_looks",
      arguments: { garmentIds: ["brown-jacket"] },
    });
    expect(lookResult.structuredContent).toMatchObject({
      count: 1,
      looks: [
        {
          id: "brown-look",
          images: [{ src: "https://example.com/media/look.jpg" }],
          matchingImages: [{ src: "https://example.com/media/look.jpg" }],
        },
      ],
    });

    const optionsResult = await client.callTool({
      name: "get_outfit_options",
      arguments: {
        request: "What should I wear for a Cambridge city visit tomorrow?",
        season: "spring",
        occasion: "city visit",
      },
    });
    expect(optionsResult.structuredContent).toMatchObject({
      strategy: "photographed-looks-first",
      tier1: {
        count: 1,
        photographedLooks: [
          {
            id: "brown-look",
            matchingImages: [{ src: "https://example.com/media/look.jpg" }],
          },
        ],
      },
      guidance: expect.stringContaining("tier-2"),
    });

    const comparisonResult = await client.callTool({
      name: "render_footwear_comparison",
      arguments: {
        trouserName: "black cargo trousers",
        trouserDescription: "Black straight-leg cargo trousers with utility pockets",
        trouserStyle: "cargo",
        rankedFootwear: [
          {
            garmentId: "brown-jacket",
            score: 90,
            rationale: "Test rationale",
          },
        ],
      },
    });
    expect(comparisonResult.structuredContent).toMatchObject({
      trouserStyle: "cargo",
      rankedFootwear: [
        {
          rank: 1,
          score: 90,
          garment: {
            id: "brown-jacket",
            images: [{ src: "https://example.com/media/test.jpg" }],
          },
        },
      ],
    });

    const adviceResult = await client.callTool({
      name: "advise_footwear",
      arguments: {
        trouserName: "black cargo trousers",
        trouserDescription: "Black utility trousers",
        trouserStyle: "cargo",
        trouserColors: ["black"],
      },
    });
    expect(adviceResult.content).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("Best match: Brown jacket"),
      }),
    ]);
    expect(adviceResult.structuredContent).toMatchObject({
      trouserName: "black cargo trousers",
      recommendationSummary: expect.stringContaining("Best match"),
      rankedFootwear: [
        {
          rank: 1,
          garment: {
            id: "brown-jacket",
            image: { src: "https://example.com/media/test.jpg" },
            styleProfile: {
              formality: "casual",
            },
          },
        },
      ],
    });

    const resources = await client.listResources();
    expect(resources.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uri: "ui://myfit/footwear-comparison-v2.html" }),
      ]),
    );
    const resource = await client.readResource({
      uri: "ui://myfit/footwear-comparison-v2.html",
    });
    expect(resource.contents[0]).toMatchObject({
      mimeType: "text/html;profile=mcp-app",
      _meta: {
        ui: {
          csp: {
            resourceDomains: ["https://example.com"],
          },
        },
      },
    });

    await client.close();
    await server.close();
  });
});
