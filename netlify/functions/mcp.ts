import { handleMcpRequest } from "@myfit/server";
import { parseCatalog } from "@myfit/contracts";

import catalogJson from "../../content/wardrobe.json" with { type: "json" };

const catalog = parseCatalog(catalogJson);

export default async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id",
      },
    });
  }
  const response = await handleMcpRequest(request, catalog);
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
