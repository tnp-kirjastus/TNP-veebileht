import "server-only";

import { maksekeskusConfig } from "@/lib/maksekeskus/config";

export interface ParcelMachine {
  carrier: string;
  id: string;
  name: string;
  city: string;
  address: string;
  zip: string;
  country?: string;
  comment?: string;
  commentEt?: string;
  availability?: string;
  x?: number;
  y?: number;
}

interface CachedMachines {
  data: ParcelMachine[];
  expires: number;
}

let cache: CachedMachines | null = null;

export async function fetchParcelMachines(): Promise<ParcelMachine[]> {
  if (cache && cache.expires > Date.now()) {
    return cache.data;
  }

  const config = maksekeskusConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${config.base}/v1/shipments/destinations`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secret}`).toString("base64")}`,
      },
      body: JSON.stringify({ type: "APT,PUP" }),
    });

    if (!response.ok) throw new Error(`destinations_fetch_${response.status}`);

    const raw = await response.json();
    const machines: ParcelMachine[] = (Array.isArray(raw) ? raw : []).map((m: Record<string, unknown>) => ({
      carrier: String(m.carrier ?? "").toLowerCase(),
      id: String(m.id ?? ""),
      name: String(m.name ?? ""),
      city: String(m.city ?? ""),
      address: String(m.address ?? ""),
      zip: String(m.zip ?? ""),
      country: String(m.country ?? "").toLowerCase(),
      comment: String(m.commentEt ?? m.comment ?? ""),
      commentEt: String(m.commentEt ?? ""),
      availability: String(m.availability ?? ""),
      x: typeof m.x === "number" ? m.x : undefined,
      y: typeof m.y === "number" ? m.y : undefined,
    })).filter((m) => !m.country || m.country === "ee" || m.country === "eesti" || m.country.startsWith("est"));

    cache = { data: machines, expires: Date.now() + 3 * 60 * 60 * 1000 };
    return machines;
  } finally {
    clearTimeout(timeout);
  }
}

export function getMachinesByCarrier(machines: ParcelMachine[], carrier: string): ParcelMachine[] {
  return machines.filter((m) => m.carrier === carrier);
}

export function sortMachinesByCity(machines: ParcelMachine[]): ParcelMachine[] {
  const priority = [
    "tallinn", "tartu linn", "tartu", "narva", "pärnu linn", "pärnu",
    "viljandi", "kohtla-järve", "rakvere", "maardu", "sillamäe", "kuressaare",
  ];

  return [...machines].sort((a, b) => {
    const aCity = a.city.toLowerCase();
    const bCity = b.city.toLowerCase();

    const aIdx = priority.findIndex((p) => aCity.startsWith(p));
    const bIdx = priority.findIndex((p) => bCity.startsWith(p));

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;

    if (aCity === bCity) return a.name.localeCompare(b.name, "et");
    return aCity.localeCompare(bCity, "et");
  });
}

export interface GroupedMachines {
  city: string;
  machines: ParcelMachine[];
}

export function groupMachinesByCity(machines: ParcelMachine[]): GroupedMachines[] {
  const map = new Map<string, ParcelMachine[]>();
  for (const m of machines) {
    const city = m.city || "Muu";
    const list = map.get(city) ?? [];
    list.push(m);
    map.set(city, list);
  }
  return [...map.entries()].map(([city, machines]) => ({ city, machines }));
}

export interface ShipmentOrder {
  orderNumber: string;
  items: Array<{ name: string; sku: string; quantity: number; price: number }>;
  customer: { name: string; email: string; phone: string; address: string };
  carrier: string;
  parcelMachineId?: string;
}

export interface ShipmentResult {
  shipmentId: string;
  trackingCode: string;
  labelUrl: string;
}

export async function createShipment(order: ShipmentOrder): Promise<ShipmentResult> {
  const config = maksekeskusConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${config.base}/v1/shipments`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        reference: order.orderNumber,
        carrier: order.carrier,
        destination: order.parcelMachineId ?? null,
        recipient: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
          address: order.customer.address,
        },
        items: order.items.map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          currency: "EUR",
        })),
      }),
    });

    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch { /* ignore */ }
      console.error("maksekeskus_shipment_create_error", { status: response.status, body: body.slice(0, 500) });
      throw new Error(`shipment_create_${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      shipmentId: String(data.id ?? data.shipment_id ?? ""),
      trackingCode: String(data.tracking_code ?? data.tracking ?? ""),
      labelUrl: String(data.label_url ?? data.label ?? ""),
    };
  } finally {
    clearTimeout(timeout);
  }
}
