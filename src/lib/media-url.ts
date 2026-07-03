function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
}

export function getCoverUrl(coverImage: string | null | undefined): string | null {
  if (!coverImage) return null;

  if (coverImage.startsWith("products/")) {
    return `${getSupabaseUrl()}/storage/v1/object/public/covers/${coverImage}`;
  }

  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage;
  }

  return `/covers/${coverImage}`;
}

export function getCoverUrlClient(
  coverImage: string | null | undefined,
): string | null {
  return getCoverUrl(coverImage);
}
