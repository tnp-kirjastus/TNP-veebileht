import { test, expect } from "@playwright/test";
import { testDb } from "./helpers/supabase";

/**
 * KOGU REFAKTORI TÕESTUS: andmebaasi muudatus on poes kohe näha,
 * ilma rebuildi või deploy'ta.
 */
test.describe("admin → live ilma deployta", () => {
  test("toote pealkirja muudatus DB-s peegeldub kohe poes", async ({ page }) => {
    const db = testDb();
    const marker = `TESTMARKER-${Date.now()}`;

    // Võta suvaline aktiivne toode ja sea ajutine pealkiri
    const { data: product } = await db.schema("commerce").from("products")
      .select("id, slug, title_et").eq("is_archived", false).limit(1).single();
    if (!product) {
      test.skip(true, "tooteid pole");
      return;
    }
    const p = product as { id: string; slug: string; title_et: string };

    const originalTitle = p.title_et;
    try {
      await db.schema("commerce").from("products")
        .update({ title_et: `${originalTitle} ${marker}` }).eq("id", p.id);

      // Poe tooteleht peab näitama uut pealkirja KOHE (ilma cache-torkimiseta)
      await page.goto(`/raamat/${p.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(marker);
    } finally {
      await db.schema("commerce").from("products")
        .update({ title_et: originalTitle }).eq("id", p.id);
    }
  });

  test("seadete muudatus jõustub kassas kohe", async ({ page, request }) => {
    const db = testDb();
    const { data: row } = await db.schema("content").from("settings")
      .select("vat").eq("key", "store").maybeSingle();
    const original = (row?.vat as { percent?: number } | null)?.percent ?? 9;
    const probe = original === 9 ? 8 : 9;

    try {
      await db.schema("content").from("settings")
        .upsert({ key: "store", vat: { percent: probe }, updated_at: new Date().toISOString() }, { onConflict: "key" });

      const response = await request.get("/api/storefront-config");
      const config = await response.json();
      expect(config.vatPercent).toBe(probe);
    } finally {
      await db.schema("content").from("settings")
        .upsert({ key: "store", vat: { percent: original }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    }
    void page; // API-tase piisab; UI kasutab sama endpointi
  });

  test("admini tooteloetelu ja toote vorm on kasutatavad", async ({ page }) => {
    await page.goto("/haldus/tooted");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tooted");
    // Ava esimene toode
    await page.locator("table tbody tr a").first().click();
    await page.waitForURL(/\/haldus\/tooted\//);
    await expect(page.getByRole("button", { name: /Salvesta|Loo/ })).toBeVisible();
  });
});
