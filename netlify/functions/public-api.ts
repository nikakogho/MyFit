import { createPublicApiHandler } from "@myfit/server";
import { parseCatalog } from "@myfit/contracts";

import catalogJson from "../../content/wardrobe.json" with { type: "json" };

const handler = createPublicApiHandler(parseCatalog(catalogJson));

export default (request: Request): Response => handler(request);
