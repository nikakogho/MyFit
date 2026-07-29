import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { parseCatalog } from "@myfit/contracts";

import catalogJson from "../../../content/wardrobe.json" with { type: "json" };
import { App } from "./App.js";
import "./styles.css";

const catalog = parseCatalog(catalogJson);
const root = document.querySelector("#root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App catalog={catalog} />
    </BrowserRouter>
  </StrictMode>,
);
