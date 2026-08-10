import { test, expect } from "@playwright/test";

test.describe("kataloog (andmebaasist)", () => {
  test("tootenimekiri laeb andmebaasist", async ({ page }) => {
    await page.goto("/raamatud");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Raamatud");
    // Vähemalt üks tootekaart on nähtav
    await expect(page.locator("a[href^='/raamat/']").first()).toBeVisible();
    // Lehekülgede arv on kuvatud
    await expect(page.getByText(/raamatut/)).toBeVisible();
  });

  test("otsing filtreerib tulemusi", async ({ page }) => {
    // Deterministlik: võtame DB-st tegeliku toote pealkirja sõna
    const { testDb } = await import("./helpers/supabase");
    const db = testDb();
    const { data: product } = await db.schema("commerce").from("products")
      .select("title_et, slug").eq("is_archived", false).limit(1).single();
    if (!product) {
      test.skip(true, "tooteid pole");
      return;
    }
    const p = product as { title_et: string; slug: string };
    const word = p.title_et.trim().split(/\s+/).find((w) => w.replace(/[^a-zA-ZõäöüÕÄÖÜ]/g, "").length >= 4)
      ?? p.title_et.trim().split(/\s+/)[0];

    await page.goto(`/raamatud?q=${encodeURIComponent(word)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`Otsing: "${word}"`);
    // Otsitav toode peab tulemustes olema
    await expect(page.locator(`a[href='/raamat/${p.slug}']`).first()).toBeVisible();
  });

  test("tooteleht sisaldab JSON-LD struktuurandmeid (SEO/AI)", async ({ page }) => {
    await page.goto("/raamatud");
    await page.locator("a[href^='/raamat/']").first().click();
    await page.waitForURL(/\/raamat\//);
    const jsonLd = page.locator("script[type='application/ld+json']");
    await expect(jsonLd).toHaveCount(1);
    const content = await jsonLd.textContent();
    expect(content).toContain('"Book"');
    expect(content).toContain('"Offer"');
    expect(content).toContain("priceCurrency");
  });

  test("ingliskeelne kontaktleht on eraldiseisev", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact");
    await expect(page.getByText("Tänapäev Publishers")).toBeVisible();
  });

  test("sitemap on dünaamiline ja sisaldab tooteid", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toContain("/raamat/");
    expect(body).toContain("/en/contact");
  });
});
