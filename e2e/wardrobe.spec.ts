import { expect, test } from "@playwright/test";

test("browses and filters the public wardrobe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dress with/ })).toBeVisible();
  await expect(page.getByLabel("Wardrobe highlights").getByText("06")).toBeVisible();
  await expect(page.getByText("Nycra-R lightweight jacket")).toBeVisible();
  await expect(page.locator('a[href^="/garments/"]')).toHaveCount(6);
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

test("opens the saved outfit direction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Soft utility, colour pop" }).click();
  await expect(page).toHaveURL(/\/outfits\/soft-utility-color-pop$/);
  await expect(page.getByText("Complete the look")).toBeVisible();
});
