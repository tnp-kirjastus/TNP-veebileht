import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(
    { shippingRates: settings.shipping.rates, vatPercent: settings.vat.percent },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
