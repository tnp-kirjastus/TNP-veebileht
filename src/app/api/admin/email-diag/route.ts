import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Route not found" }, { status: 404 });
}
