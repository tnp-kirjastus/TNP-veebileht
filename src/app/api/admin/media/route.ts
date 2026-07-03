import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { processAndUpload, getMediaInfo, removeUnreferencedObject } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || !["editor", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Luba puudub" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Vigane sisend" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;

  if (!file || !productId) {
    return NextResponse.json({ error: "Fail või productId puudub" }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Fail on liiga suur (max 50 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const info = await getMediaInfo(buffer);
  if (!info.signature) {
    return NextResponse.json({ error: "Fail ei ole toetatud pildivormingus (JPG, PNG, WebP, AVIF, TIFF)" }, { status: 400 });
  }

  const result = await processAndUpload(buffer, productId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    objectKey: result.objectKey,
    width: result.width,
    height: result.height,
    byteSize: result.byteSize,
    contentHash: result.contentHash,
    warning: info.warning,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || !["editor", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Luba puudub" }, { status: 403 });
  }

  const { objectKey } = await request.json().catch(() => ({ objectKey: null }));
  if (!objectKey || !objectKey.startsWith("products/")) {
    return NextResponse.json({ error: "Vigane objectKey" }, { status: 400 });
  }

  try {
    await removeUnreferencedObject(objectKey);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Eemaldamine ebaõnnestus" }, { status: 500 });
  }
}
