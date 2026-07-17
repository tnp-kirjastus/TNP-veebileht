import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "covers";
const MAX_COMPRESSED_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 1800;
const WEBP_QUALITY = 86;
const RECOMMENDED_MIN_WIDTH = 600;
const RECOMMENDED_MIN_HEIGHT = 900;

const ALLOWED_SIGNATURES: Array<[readonly number[], string]> = [
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0x52, 0x49, 0x46, 0x46], "image/webp"],
  [[0x49, 0x49, 0x2a, 0x00], "image/tiff"],
  [[0x4d, 0x4d, 0x00, 0x2a], "image/tiff"],
];

function detectSignature(buffer: Buffer): string | null {
  const head = buffer.subarray(0, 12);
  for (const [sig, mime] of ALLOWED_SIGNATURES) {
    if (sig.every((b, i) => head[i] === b)) {
      if (mime === "image/webp" && head[4] === 0x46 && head[5] === 0x54 && head[6] === 0x59 && head[7] === 0x50) {
        return "image/webp";
      }
      if (mime === "image/webp") {
        return head[8] === 0x56 && head[9] === 0x50 && head[10] === 0x38 ? "image/webp" : null;
      }
      return mime;
    }
  }
  const isAvif = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70 &&
    (head[8] === 0x61 && head[9] === 0x76 && head[10] === 0x69 && head[11] === 0x66);
  if (isAvif) return "image/avif";
  return null;
}

export interface MediaValidationInfo {
  signature: string | null;
  width: number | null;
  height: number | null;
  mime: string | null;
  warning: string | null;
}

export interface ProcessedMedia {
  buffer: Buffer;
  width: number;
  height: number;
  byteSize: number;
  contentHash: string;
  objectKey: string;
}

export interface MediaUploadResult {
  success: boolean;
  objectKey: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  contentHash: string | null;
  error: string | null;
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function getMediaInfo(buffer: Buffer): Promise<MediaValidationInfo> {
  const signature = detectSignature(buffer);
  let width: number | null = null;
  let height: number | null = null;
  let warning: string | null = null;

  try {
    const meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: "none" }).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    const fmt = meta.format ?? null;
    if (width && width < RECOMMENDED_MIN_WIDTH) warning = `Allikas on alla ${RECOMMENDED_MIN_WIDTH}px lai (${width}px)`;
    else if (height && height < RECOMMENDED_MIN_HEIGHT) warning = `Allikas on alla ${RECOMMENDED_MIN_HEIGHT}px kõrge (${height}px)`;
  } catch {
    warning = "Pildi metainfo lugemine ebaõnnestus";
  }

  return { signature, width, height, mime: signature, warning };
}

export async function processImage(source: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(source, { limitInputPixels: MAX_PIXELS, failOn: "error" });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Pildi mõõtmed on määramata");
  }

<<<<<<< HEAD
  const pipeline = image
=======
  let pipeline = image
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
    .rotate()
    .resize({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 });

  const output = await pipeline.toBuffer();

  if (output.byteLength > MAX_COMPRESSED_BYTES) {
    throw new Error(`Töödeldud pilt ületab ${MAX_COMPRESSED_BYTES / 1024 / 1024} MB piiri`);
  }

  const outMeta = await sharp(output, { limitInputPixels: MAX_PIXELS }).metadata();
  return {
    buffer: output,
    width: outMeta.width ?? 0,
    height: outMeta.height ?? 0,
  };
}

export function generateObjectKey(productId: string, contentHash: string): string {
  return `products/${productId}/${contentHash}.webp`;
}

export async function uploadCover(
  buffer: Buffer,
  productId: string,
  contentHash: string,
): Promise<string> {
  const db = createAdminClient();
  const objectKey = generateObjectKey(productId, contentHash);
  const { error } = await db.storage.from(BUCKET).upload(objectKey, buffer, {
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
    upsert: true,
  });
  if (error) throw new Error(`Üleslaadimine ebaõnnestus: ${error.message}`);
  return objectKey;
}

export async function removeUnreferencedObject(objectKey: string): Promise<void> {
  const db = createAdminClient();
  await db.storage.from(BUCKET).remove([objectKey]);
}

export async function processAndUpload(
  source: Buffer,
  productId: string,
): Promise<MediaUploadResult> {
  try {
    const processed = await processImage(source);
    const hash = sha256(processed.buffer);
    const objectKey = await uploadCover(processed.buffer, productId, hash);
    return {
      success: true,
      objectKey,
      width: processed.width,
      height: processed.height,
      byteSize: processed.buffer.byteLength,
      contentHash: hash,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      objectKey: null,
      width: null,
      height: null,
      byteSize: null,
      contentHash: null,
      error: err instanceof Error ? err.message : "Töötlemine ebaõnnestus",
    };
  }
}

export function detectSignatureFromFile(buffer: Buffer): string | null {
  return detectSignature(buffer);
}

const EXCLUDED_ZIP_ENTRY_PATTERNS = [
  /^\.\./,
  /\/\.\./,
  /\\\.\./,
  /^[A-Za-z]:\\/,
  /^\//,
  /^\w+:/,
  /__MACOSX/,
  /\.DS_Store$/,
  /Thumbs\.db$/i,
  /@eaDir/,
];

export function isValidZipEntryPath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  const decoded = decodeURIComponent(path);
  if (decoded.includes("..")) return false;
  if (/[<>:"|?*\\]/.test(path)) return false;
  for (const pattern of EXCLUDED_ZIP_ENTRY_PATTERNS) {
    if (pattern.test(path)) return false;
  }
  return true;
}

export function normalizeIsbn(value: string): string {
  const cleaned = String(value).replace(/[^0-9X]/gi, "").toUpperCase();
  if (!/^\d{9}[\dX]$/i.test(cleaned) && !/^\d{13}$/.test(cleaned)) return cleaned;
  return cleaned;
}

export function isbn10To13(value: string): string | null {
  const cleaned = String(value).replace(/[^0-9X]/gi, "").toUpperCase();
  if (!/^\d{9}[\dX]$/i.test(cleaned)) return null;
  const first = `978${cleaned.slice(0, 9)}`;
  const sum = [...first].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${first}${(10 - (sum % 10)) % 10}`;
}
