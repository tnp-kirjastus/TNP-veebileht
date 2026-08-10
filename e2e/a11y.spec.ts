import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const PAGES = ["/", "/raamatud", "/pakkumised", "/kirjastus", "/kontakt", "/ostukorv"];

for (const path of PAGES) {
  test(`${path} — ligipääsetavuse skann`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} el`)).toEqual([]);
  });
}
