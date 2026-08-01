import { expect, test } from "@playwright/test";

test("browses and filters the public wardrobe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dress with/ })).toBeVisible();
  await expect(page.getByLabel("Wardrobe highlights").getByText("13")).toBeVisible();
  await expect(page.getByText("Nycra-R lightweight jacket")).toBeVisible();
  await expect(page.locator('a[href^="/garments/"]')).toHaveCount(13);
  await expect(page.locator(".item-number")).toHaveText(
    Array.from({ length: 13 }, (_, index) => String(index + 1).padStart(2, "0")),
  );
  await page.getByRole("button", { name: "shirts", exact: true }).click();
  await expect(page.locator('a[href^="/garments/"]')).toHaveCount(3);
  await expect(page.getByText("Teenage Mutant Ninja Turtles graphic T-shirt")).toBeVisible();
  await expect(page.getByText("Nycra-R lightweight jacket")).toBeHidden();
  await page.getByRole("button", { name: "all", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search wardrobe" }).fill("sneakers");
  await expect(page.getByText("Blue, white, and orange sneakers")).toBeVisible();
  await expect(page.getByText("Grey paneled sneakers")).toBeVisible();
  await expect(page.getByText("Nycra-R lightweight jacket")).toBeHidden();
  await page.getByRole("searchbox", { name: "Search wardrobe" }).fill("brogue");
  await expect(page.getByText("Charcoal brogue hybrid shoes")).toBeVisible();
  await expect(page.getByText("Grey paneled sneakers")).toBeHidden();
});

test("opens a garment with styling context", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Nycra-R lightweight jacket").click();
  await expect(page).toHaveURL(/\/garments\/cp-company-nycra-r-jacket$/);
  await expect(page.getByRole("heading", { name: "Nycra-R lightweight jacket" })).toBeVisible();
  await expect(page.getByText("Styling notes")).toBeVisible();
});

test("shows every published angle in multi-photo garment galleries", async ({ page }) => {
  const galleries = [
    ["brown-field-jacket", 5],
    ["taupe-lightweight-zip-jacket", 4],
    ["tmnt-graphic-tshirt", 3],
    ["black-worldwide-680-rain-parka", 5],
  ] as const;

  for (const [garmentId, imageCount] of galleries) {
    await page.goto(`/garments/${garmentId}`);
    await expect(page.locator(".detail-gallery img")).toHaveCount(imageCount);
  }
});

test("opens the saved outfit direction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Soft utility, colour pop" }).click();
  await expect(page).toHaveURL(/\/outfits\/soft-utility-color-pop$/);
  await expect(page.getByText("Complete the look")).toBeVisible();
});
