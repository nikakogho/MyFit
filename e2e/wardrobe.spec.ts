import { expect, test } from "@playwright/test";

test("browses and filters the public wardrobe", async ({ page }) => {
  await page.goto("/");
  const wardrobe = page.locator(".wardrobe-section");
  const launchpad = page.getByLabel("Wardrobe launchpad");
  await expect(page.getByRole("heading", { name: /Start with/ })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveCount(2);
  await expect(page.getByRole("searchbox", { name: "Search wardrobe", exact: true })).toHaveCount(
    0,
  );
  await expect(launchpad.getByText("21 matches", { exact: true })).toBeVisible();
  await expect(launchpad.locator('a[href^="/garments/"]')).toHaveCount(3);
  await page
    .getByRole("searchbox", { name: "Search wardrobe from the landing panel" })
    .fill("brogue");
  await expect(launchpad.getByText("1 match", { exact: true })).toBeVisible();
  await expect(launchpad.getByText("Charcoal brogue hybrid shoes", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search wardrobe from the landing panel" }).fill("");
  await expect(wardrobe.getByRole("heading", { name: "Nycra-R lightweight jacket" })).toBeVisible();
  await expect(wardrobe.locator('a[href^="/garments/"]')).toHaveCount(21);
  await expect(wardrobe.locator(".item-number")).toHaveText(
    Array.from({ length: 21 }, (_, index) => String(index + 1).padStart(2, "0")),
  );
  await launchpad.getByRole("button", { name: "Show shirts wardrobe pieces" }).click();
  await expect(wardrobe.locator('a[href^="/garments/"]')).toHaveCount(6);
  await expect(
    wardrobe.getByRole("heading", { name: "Teenage Mutant Ninja Turtles graphic T-shirt" }),
  ).toBeVisible();
  await expect(wardrobe.getByRole("heading", { name: "Nycra-R lightweight jacket" })).toBeHidden();
  await launchpad.getByRole("button", { name: "Show trousers wardrobe pieces" }).click();
  await expect(wardrobe.locator('a[href^="/garments/"]')).toHaveCount(2);
  await expect(
    wardrobe.getByRole("heading", { name: "Blacksquad black utility cargo trousers" }),
  ).toBeVisible();
  await expect(
    wardrobe.getByRole("heading", { name: "Dark navy tactical cargo trousers" }),
  ).toBeVisible();
  await expect(
    wardrobe.getByRole("heading", { name: "Teenage Mutant Ninja Turtles graphic T-shirt" }),
  ).toBeHidden();
  await launchpad.getByRole("button", { name: "Show all wardrobe pieces" }).click();
  await launchpad
    .getByRole("searchbox", { name: "Search wardrobe from the landing panel" })
    .fill("sneakers");
  await expect(
    wardrobe.getByRole("heading", { name: "Blue, white, and orange sneakers" }),
  ).toBeVisible();
  await expect(wardrobe.getByRole("heading", { name: "Grey paneled sneakers" })).toBeVisible();
  await expect(wardrobe.getByRole("heading", { name: "Nycra-R lightweight jacket" })).toBeHidden();
  await launchpad
    .getByRole("searchbox", { name: "Search wardrobe from the landing panel" })
    .fill("brogue");
  await expect(
    wardrobe.getByRole("heading", { name: "Charcoal brogue hybrid shoes" }),
  ).toBeVisible();
  await expect(wardrobe.getByRole("heading", { name: "Grey paneled sneakers" })).toBeHidden();
});

test("opens a garment with styling context", async ({ page }) => {
  await page.goto("/");
  await page
    .locator(".wardrobe-section")
    .getByRole("heading", { name: "Nycra-R lightweight jacket" })
    .click();
  await expect(page).toHaveURL(/\/garments\/cp-company-nycra-r-jacket$/);
  await expect(page.getByRole("heading", { name: "Nycra-R lightweight jacket" })).toBeVisible();
  await expect(page.getByText("Styling notes")).toBeVisible();
});

test("shows every published angle in multi-photo garment galleries", async ({ page }) => {
  const galleries = [
    ["black-modular-pocket-hoodie", 6],
    ["black-hooded-technical-coat", 3],
    ["blacksquad-black-utility-cargo-trousers", 2],
    ["dark-navy-tactical-cargo-trousers", 2],
    ["grey-distressed-hooded-coat", 5],
    ["white-skull-collage-long-sleeve-tshirt", 7],
    ["black-utility-pocket-tshirt", 3],
    ["white-snap-collar-high-neck-top", 3],
    ["distressed-black-zip-high-tops", 3],
    ["charcoal-brogue-hybrid-shoes", 3],
    ["hermes-grey-paneled-sneakers", 4],
    ["hermes-cream-brown-paneled-sneakers", 3],
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

test("keeps garment gallery thumbnails in compact cards", async ({ page }) => {
  await page.goto("/garments/brown-field-jacket");

  const thumbnailRatios = await page.locator(".gallery-image-button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const { width, height } = button.getBoundingClientRect();
      return width / height;
    }),
  );

  expect(thumbnailRatios).not.toHaveLength(0);
  expect(thumbnailRatios.every((ratio) => Math.abs(ratio - 0.76) < 0.02)).toBe(true);
});

test("opens garment photos in a wraparound lightbox", async ({ page }) => {
  await page.goto("/garments/brown-field-jacket");
  const firstPhoto = page.getByRole("button", { name: "Open photo 1 of 5" });
  await firstPhoto.click();

  const lightbox = page.getByRole("dialog", { name: "Brown field jacket photo viewer" });
  await expect(lightbox).toBeVisible();
  await expect(lightbox.getByText("01 / 05", { exact: true })).toBeVisible();

  await lightbox.getByRole("button", { name: "Previous image" }).click();
  await expect(lightbox.getByText("05 / 05", { exact: true })).toBeVisible();
  await lightbox.getByRole("button", { name: "Next image" }).click();
  await expect(lightbox.getByText("01 / 05", { exact: true })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(lightbox.getByText("02 / 05", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(lightbox.getByText("01 / 05", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(firstPhoto).toBeFocused();
});

test("opens the saved outfit direction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Soft utility, colour pop" }).click();
  await expect(page).toHaveURL(/\/outfits\/soft-utility-color-pop$/);
  await expect(page.getByText("Complete the look")).toBeVisible();
});

test("filters and opens photo-backed looks by garment combination", async ({ page }) => {
  await page.goto("/#looks");
  await expect(page.getByRole("heading", { name: "Photographed looks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Black modular utility layers" })).toBeVisible();

  const filter = page.getByLabel("Add garment to look filter");
  await filter.selectOption("black-modular-pocket-hoodie");
  await expect(page.getByRole("heading", { name: "Black modular utility layers" })).toBeVisible();
  await filter.selectOption("distressed-black-zip-high-tops");
  await expect(page.getByRole("heading", { name: "Black modular utility layers" })).toBeVisible();
  await expect(page.locator(".look-card-image img")).toHaveAttribute(
    "src",
    "/media/black-modular-pocket-hoodie-worn-front.jpg",
  );
  await page.getByRole("button", { name: "Clear garments" }).click();
  await filter.selectOption("black-modular-pocket-hoodie");
  await filter.selectOption("blacksquad-black-utility-cargo-trousers");
  await expect(page.getByText(/No photographed look contains that combination yet/)).toBeVisible();
  await page.getByRole("button", { name: "Clear garments" }).click();
  await expect(page.getByRole("heading", { name: "Black modular utility layers" })).toBeVisible();

  await page.getByRole("heading", { name: "Black modular utility layers" }).click();
  await expect(page).toHaveURL(/\/looks\/black-modular-utility-look$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator(".detail-gallery img")).toHaveCount(5);
  await expect(page.getByText("Visible but not identified")).toBeVisible();
  await expect(page.getByText("Uncatalogued boots variant", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Distressed zip high-tops variant", { exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Open photo 1 of 5" }).click();
  const lightbox = page.getByRole("dialog", {
    name: "Black modular utility layers photo viewer",
  });
  await expect(lightbox.getByText("01 / 05", { exact: true })).toBeVisible();
  await lightbox.getByRole("button", { name: "Previous image" }).click();
  await expect(lightbox.getByText("05 / 05", { exact: true })).toBeVisible();
});

test("links garments back to photographed looks", async ({ page }) => {
  await page.goto("/garments/black-modular-pocket-hoodie");
  await expect(
    page.getByRole("heading", { name: "Photographed looks with this piece" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Black modular utility layers" })).toBeVisible();

  await page.goto("/garments/distressed-black-zip-high-tops");
  await expect(
    page.getByRole("heading", { name: "Photographed looks with this piece" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Black modular utility layers" })).toBeVisible();

  await page.goto("/garments/blacksquad-black-utility-cargo-trousers");
  await expect(
    page.getByRole("heading", { name: "Photographed looks with this piece" }),
  ).toHaveCount(0);
});
