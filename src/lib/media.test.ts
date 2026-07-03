import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { getCoverUrlClient } from "@/lib/media-url";
import {
  normalizeIsbn,
  isbn10To13,
  isValidZipEntryPath,
} from "@/lib/media";

describe("media-url", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("getCoverUrlClient", () => {
    it("returns null for null/undefined/empty", () => {
      expect(getCoverUrlClient(null)).toBeNull();
      expect(getCoverUrlClient(undefined)).toBeNull();
      expect(getCoverUrlClient("")).toBeNull();
    });

    it("returns legacy path for plain filenames", () => {
      expect(getCoverUrlClient("9789916178409.webp")).toBe("/covers/9789916178409.webp");
    });

    it("returns Storage URL for products/<id>/<hash>.webp keys", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      const url = getCoverUrlClient("products/abc-123/def456.webp");
      expect(url).toBe("https://example.supabase.co/storage/v1/object/public/covers/products/abc-123/def456.webp");
    });

    it("passes through absolute HTTP URLs unchanged", () => {
      expect(getCoverUrlClient("https://cdn.example.com/cover.jpg")).toBe("https://cdn.example.com/cover.jpg");
    });

    it("strips /rest/v1/ suffix from Supabase URL", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/rest/v1";
      const url = getCoverUrlClient("products/x/y.webp");
      expect(url).toBe("https://example.supabase.co/storage/v1/object/public/covers/products/x/y.webp");
    });
  });
});

describe("media — ISBN and filename normalization", () => {
  describe("normalizeIsbn", () => {
    it("removes non-alphanumeric characters", () => {
      expect(normalizeIsbn("978-9916-17-840-9")).toBe("9789916178409");
    });

    it("uppercases X check digit", () => {
      expect(normalizeIsbn("123456789x")).toBe("123456789X");
    });

    it("returns cleaned string for non-ISBN input", () => {
      expect(normalizeIsbn("hello")).toBe("");
    });

    it("handles whitespace", () => {
      expect(normalizeIsbn("  9789916178409  ")).toBe("9789916178409");
    });
  });

  describe("isbn10To13", () => {
    it("converts a valid ISBN-10 to ISBN-13", () => {
      const result = isbn10To13("9949850402");
      expect(result).toBe("9789949850402");
    });

    it("returns null for invalid ISBN-10", () => {
      expect(isbn10To13("123")).toBeNull();
      expect(isbn10To13("abcdefghij")).toBeNull();
    });

    it("handles X check digit", () => {
      const result = isbn10To13("080442957X");
      expect(result).toBe("9780804429573");
    });
  });
});

describe("media — ZIP entry validation", () => {
  describe("isValidZipEntryPath", () => {
    it("rejects empty strings", () => {
      expect(isValidZipEntryPath("")).toBe(false);
    });

    it("rejects paths with .. traversal", () => {
      expect(isValidZipEntryPath("../etc/passwd")).toBe(false);
      expect(isValidZipEntryPath("foo/../../bar.jpg")).toBe(false);
      expect(isValidZipEntryPath("..\\windows\\system32")).toBe(false);
    });

    it("rejects absolute paths", () => {
      expect(isValidZipEntryPath("/etc/passwd")).toBe(false);
    });

    it("accepts normal relative paths", () => {
      expect(isValidZipEntryPath("covers/9789916178409.jpg")).toBe(true);
      expect(isValidZipEntryPath("9789916178409.webp")).toBe(true);
      expect(isValidZipEntryPath("sub/dir/image.png")).toBe(true);
    });

    it("rejects __MACOSX and .DS_Store", () => {
      expect(isValidZipEntryPath("__MACOSX/._cover.jpg")).toBe(false);
      expect(isValidZipEntryPath(".DS_Store")).toBe(false);
    });

    it("rejects paths with angle brackets and special chars", () => {
      expect(isValidZipEntryPath("file<.jpg")).toBe(false);
    });
  });
});
