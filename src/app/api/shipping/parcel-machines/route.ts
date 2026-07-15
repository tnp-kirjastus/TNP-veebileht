import { NextResponse } from "next/server";
import {
  fetchParcelMachines,
  getMachinesByCarrier,
  sortMachinesByCity,
  groupMachinesByCity,
} from "@/lib/shipping/maksekeskus-shipping";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await consumeRateLimit("parcel_machines", clientKey, 60, 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const allMachines = await fetchParcelMachines();

    const carriers = ["omniva", "smartpost"] as const;
    const result: Record<string, ReturnType<typeof groupMachinesByCity>> = {};

    for (const carrier of carriers) {
      const filtered = getMachinesByCarrier(allMachines, carrier);
      const sorted = sortMachinesByCity(filtered);
      result[carrier] = groupMachinesByCity(sorted);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("parcel_machines_fetch_failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Pakiautomaatide laadimine ebaõnnestus." },
      { status: 502 }
    );
  }
}
