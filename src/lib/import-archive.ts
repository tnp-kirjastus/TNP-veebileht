import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "import-archives";
const MAX_SIZE = 200 * 1024 * 1024; // 200 MB
const PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.zip$/;

/**
 * Loob signeeritud üleslaadimis-URL-i — brauser laeb ZIP-i otse Storage'isse.
 * Nii ei läbi sadu megasaidi server action'i piire.
 */
export async function createArchiveUploadUrl(): Promise<{ path: string; token: string }> {
  const db = createAdminClient();
  const path = `${crypto.randomUUID()}.zip`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Signeeritud URL-i loomine ebaõnnestus: ${error?.message}`);
  return { path, token: data.token };
}

/** Laeb arhiivi serverisse töötlemiseks. Path on valideeritud traversal-rünnaku vältimiseks. */
export async function downloadArchive(path: string): Promise<Buffer> {
  if (!PATH_RE.test(path)) throw new Error("Vigane arhiivi asukoht");
  const db = createAdminClient();
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Arhiivi allalaadimine ebaõnnestus: ${error?.message}`);
  if (data.size > MAX_SIZE) throw new Error("ZIP-arhiiv on liiga suur (max 200 MB)");
  return Buffer.from(await data.arrayBuffer());
}

/** Kustutab töödeldud arhiivi (või orphan'u). Ei tee vaikselt midagi, kui ebaõnnestub. */
export async function deleteArchive(path: string): Promise<void> {
  if (!PATH_RE.test(path)) return;
  try {
    await createAdminClient().storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error("import archive cleanup failed", path, err);
  }
}
