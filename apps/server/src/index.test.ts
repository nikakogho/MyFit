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
      category: "outerwear",
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
  outfits: [],
};

describe("public API", () => {
  it("serves and filters garments", async () => {
    const handler = createPublicApiHandler(catalog);
    const response = handler(new Request("https://example.com/api/garments?query=overshirt"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ count: 1 });
  });
});

describe("MCP server", () => {
  it("exposes searchable read-only wardrobe tools", async () => {
    const server = createMcpServer(catalog, "https://example.com");
    const client = new Client({ name: "test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    expect(client.getInstructions()).toContain("display those URLs directly");

    const tools = await client.listTools();
    expect(tools.tools.map(({ name }) => name)).toContain("search");
    const result = await client.callTool({ name: "search", arguments: { query: "brown" } });
    expect(result.structuredContent).toMatchObject({
      results: [{ id: "brown-jacket" }],
    });

    const garmentResult = await client.callTool({
      name: "search_garments",
      arguments: { category: "outerwear" },
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

    await client.close();
    await server.close();
  });
});
