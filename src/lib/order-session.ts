import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

function secretKey() {
  const env = serverEnv();
  const secret = env.CART_SESSION_SECRET
    ?? (env.NODE_ENV === "production" ? "" : "tnp-development-cart-secret-change-me");
  return new TextEncoder().encode(secret);
}

export interface ParcelMachineInfo {
  carrier: string;
  id: string;
  name: string;
  city: string;
  address: string;
  zip: string;
}

export interface OrderSnapshot {
  orderNumber: string;
  total: number;
  totalCents: number;
  subtotal?: number;
  shippingCost?: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    shippingMethod: string;
    shippingCarrier?: string;
  };
  parcelMachine?: ParcelMachineInfo | null;
  items: Array<{
    slug: string;
    title: string;
    author: string;
    price: number;
    salePrice: number | null;
    quantity: number;
  }>;
}

export async function createOrderToken(snapshot: OrderSnapshot): Promise<string> {
  return new SignJWT({ order: snapshot, purpose: "order_snapshot" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyOrderToken(token: string): Promise<OrderSnapshot | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "order_snapshot" || !payload.order) return null;
    return payload.order as OrderSnapshot;
  } catch {
    return null;
  }
}
