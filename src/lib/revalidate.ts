import "server-only";

import { revalidatePath } from "next/cache";

const ALLOWED_PATTERNS = [
  "/",
  "/raamatud",
  "/raamat/[slug]",
  "/sarjad",
  "/sarjad/[slug]",
  "/pakkumised",
  "/uudised",
  "/uudis/[slug]",
  "/arhiiv",
  "/ostukorv",
] as const;

type AllowedPath = (typeof ALLOWED_PATTERNS)[number];

function isAllowed(path: string): path is AllowedPath {
  return ALLOWED_PATTERNS.includes(path as AllowedPath);
}

export function safeRevalidatePath(path: string) {
  if (!isAllowed(path)) {
    console.error(`Revalidation blocked: unknown path "${path}"`);
    return false;
  }
  revalidatePath(path);
  return true;
}

export function revalidateProduct(slug: string) {
  revalidatePath("/");
  revalidatePath("/raamatud");
  revalidatePath(`/raamat/${slug}`);
  revalidatePath("/arhiiv");
  revalidatePath("/sitemap.xml");
}

export function revalidateCampaign() {
  revalidatePath("/");
  revalidatePath("/pakkumised");
<<<<<<< HEAD
  revalidatePath("/haldus/kampaaniad");
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
}

export function revalidateBlog(slug?: string) {
  revalidatePath("/uudised");
  if (slug) revalidatePath(`/uudis/${slug}`);
}

export function revalidateSeries(slug?: string) {
  revalidatePath("/sarjad");
  if (slug) revalidatePath(`/sarjad/${slug}`);
}

export function revalidateHomepage() {
  revalidatePath("/");
}
