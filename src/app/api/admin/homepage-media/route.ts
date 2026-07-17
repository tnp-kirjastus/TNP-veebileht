import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "covers";
const MAX_SIZE = 10 * 1024 * 1024;
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;
const WEBP_QUALITY = 86;

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
  const section = formData.get("section") as string | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fail puudub" }, { status: 400 });
  }
  if (!section) {
    return NextResponse.json({ error: "Sektsioon puudub" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fail on liiga suur (max 10 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
  } catch {
    return NextResponse.json({ error: "Fail ei ole toetatud pildivormingus" }, { status: 400 });
  }
  if (!meta.width || !meta.height) {
    return NextResponse.json({ error: "Pildi mootmed on maaramata" }, { status: 400 });
  }

  const pipeline = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate()
    .resize({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 });

  let processed: Buffer;
  try {
    processed = await pipeline.toBuffer();
  } catch {
    return NextResponse.json({ error: "Pildi tootlemine ebaonnestus" }, { status: 422 });
  }

  if (processed.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: `Toodeldud pilt uletab ${MAX_SIZE / 1024 / 1024} MB piiri` }, { status: 422 });
  }

  const hash = createHash("sha256").update(processed).digest("hex");
  const objectKey = `homepage/${section}/${hash}.webp`;

  const db = createAdminClient();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(objectKey, processed, {
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: `Uleslaadimine ebaonnestus: ${uploadError.message}` }, { status: 500 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co")
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectKey}`;

  return NextResponse.json({ url: publicUrl, objectKey });
}
