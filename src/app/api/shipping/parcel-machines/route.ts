import { NextResponse } from "next/server";
import {
  fetchParcelMachines,
  getMachinesByCarrier,
  sortMachinesByCity,
  groupMachinesByCity,
} from "@/lib/shipping/maksekeskus-shipping";

export async function GET() {
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
  } catch {
    return NextResponse.json(
      { omniva: [], smartpost: [] },
      { status: 200 }
    );
  }
}
