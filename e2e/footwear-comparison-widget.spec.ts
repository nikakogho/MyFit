import { expect, test } from "@playwright/test";

import { footwearComparisonWidgetHtml } from "../apps/server/src/footwear-comparison-widget.js";

const shoeImage =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e9e7e3"/><path d="M70 185c70-5 105-72 165-52l33 26 75 27c13 5 15 31-2 39H91c-34 0-46-35-21-40Z" fill="#24242a"/><path d="M86 217h252" stroke="#8d6aff" stroke-width="12"/></svg>',
  );

const comparison = {
  trouserName: "black cargo trousers",
  trouserDescription: "Black straight-leg cargo trousers with utility pockets",
  trouserStyle: "cargo",
  rankedFootwear: [
    {
      rank: 1,
      score: 95,
      rationale: "The distressed finish and high-top shape echo the utility details.",
      stylingTip: "Let the trouser cuff meet the padded collar.",
      garment: {
        id: "black-high-tops",
        name: "Distressed black zip high-tops",
        brand: null,
        images: [{ src: shoeImage, alt: "Black high-top sneaker" }],
      },
    },
    {
      rank: 2,
      score: 86,
      rationale: "The grey panels soften an otherwise all-black combination.",
      stylingTip: "Keep the trouser hem clean and slightly cropped.",
      garment: {
        id: "grey-sneakers",
        name: "Grey paneled sneakers",
        brand: "Hermès",
        images: [{ src: shoeImage, alt: "Grey paneled sneaker" }],
      },
    },
  ],
};

test("renders and switches a footwear comparison without a remote trouser image", async ({
  page,
}) => {
  await page.setContent(footwearComparisonWidgetHtml);
  await page.evaluate((data) => {
    (
      window as typeof window & {
        render: (value: typeof comparison) => void;
      }
    ).render(data);
  }, comparison);

  await expect(
    page.getByRole("heading", { name: "What works with black cargo trousers?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Generic dark trouser silhouette")).toBeVisible();
  await expect(page.getByText("95 / 100")).toBeVisible();

  await page.getByRole("button", { name: /Show rank 2/ }).click();
  await expect(
    page.locator(".winner").getByRole("heading", { name: "Hermès Grey paneled sneakers" }),
  ).toBeVisible();
  await expect(page.locator(".winner").getByText("86 / 100")).toBeVisible();
});
