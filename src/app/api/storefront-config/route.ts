import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(
    { shippingRates: settings.shipping.rates, vatPercent: settings.vat.percent },
    // Admini seadete muudatused peavad kassas kohe jõustuma — ei cache'i.
    { headers: { "Cache-Control": "no-store" } },
  );
}
