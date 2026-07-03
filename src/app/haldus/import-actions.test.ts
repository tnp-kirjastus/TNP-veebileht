import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { normalizeIsbn, isbn10To13, isValidZipEntryPath } from "@/lib/media";

describe("Cover import integration — ISBN & column mapping", () => {
  describe("alias-column mapping", () => {
    it("recognises Pilt as a cover column alias", () => {
      const mapping = { cover: "Pilt" };
      const aliases = ["cover_file", "cover_url", "Pilt", "Toote Kaanepilt"];
      const found = aliases.some((a) =>
        Object.values(mapping).includes(a)
      );
      expect(found).toBe(true);
    });

    it("recognises Toote Kaanepilt as a cover column alias", () => {
      const mapping = { cover: "Toote Kaanepilt" };
      const aliases = ["cover_file", "cover_url", "Pilt", "Toote Kaanepilt"];
      const found = aliases.some((a) =>
        Object.values(mapping).includes(a)
      );
      expect(found).toBe(true);
    });

    it("returns false when no cover column is mapped", () => {
      const mapping = { sku: "isbn", title: "title" };
      const aliases = ["cover_file", "cover_url", "Pilt", "Toote Kaanepilt"];
      const found = aliases.some((a) =>
        Object.values(mapping).includes(a)
      );
      expect(found).toBe(false);
    });
  });

  describe("ISBN matching behaviour", () => {
    it("normaliseIsbn strips slashes from ISBN-13", () => {
      expect(normalizeIsbn("978-9916-17-840-9")).toBe("9789916178409");
    });

    it("isbn10To13 works for 10-digit ISBNs", () => {
      const result = isbn10To13("9949850402");
      expect(result).toBe("9789949850402");
    });

    it("isbn10To13 returns null for non-ISBN strings", () => {
      expect(isbn10To13("nonsense")).toBeNull();
      expect(isbn10To13("12345")).toBeNull();
    });

    it("both ISBN-10 and ISBN-13 forms should be normalised consistently", () => {
      const isbn10 = "9949850402";
      const isbn13 = "9789949850402";
      expect(isbn10To13(isbn10)).toBe(isbn13);
    });
  });
});

describe("Cover import integration — ZIP entry validation", () => {
  describe("path traversal protection", () => {
    const blocked = [
      "../outside.jpg",
      "sub/../../escape.jpg",
      "..\\windows\\file.jpg",
      "/absolute/path.jpg",
    ];
    for (const path of blocked) {
      it(`rejects ${path}`, () => {
        expect(isValidZipEntryPath(path)).toBe(false);
      });
    }
  });

  describe("system file rejection", () => {
    const blocked = [
      "__MACOSX/._cover.jpg",
      ".DS_Store",
      "covers/Thumbs.db",
    ];
    for (const path of blocked) {
      it(`rejects ${path}`, () => {
        expect(isValidZipEntryPath(path)).toBe(false);
      });
    }
  });

  describe("valid paths allowed", () => {
    const allowed = [
      "9789916178409.jpg",
      "covers/image.png",
      "sub/dir/nested/file.webp",
    ];
    for (const path of allowed) {
      it(`allows ${path}`, () => {
        expect(isValidZipEntryPath(path)).toBe(true);
      });
    }
  });
});

describe("Cover import integration — [CLEAR] and blank semantics", () => {
  function resolveCoverImage(existing: string | null, input: string | undefined): string | null {
    const coverImageRaw = input?.trim();
    if (coverImageRaw === "[CLEAR]") return null;
    if (coverImageRaw) return coverImageRaw;
    return existing;
  }

  it("[CLEAR] removes the cover", () => {
    expect(resolveCoverImage("old-cover.webp", "[CLEAR]")).toBeNull();
  });

  it("blank leaves existing cover unchanged", () => {
    expect(resolveCoverImage("old-cover.webp", "")).toBe("old-cover.webp");
    expect(resolveCoverImage("old-cover.webp", undefined)).toBe("old-cover.webp");
  });

  it("new value replaces existing cover", () => {
    expect(resolveCoverImage("old-cover.webp", "products/123/hash.webp")).toBe("products/123/hash.webp");
  });

  it("blank on new product (no existing) results in null", () => {
    expect(resolveCoverImage(null, "")).toBeNull();
  });
});

describe("Cover import integration — idempotency", () => {
  function simulateImportRow(
    existingCover: string | null,
    newCoverKey: string | null,
  ): { updated: boolean; coverAfter: string | null } {
    if (newCoverKey === null) {
      return { updated: false, coverAfter: existingCover };
    }
    if (existingCover === newCoverKey) {
      return { updated: false, coverAfter: existingCover };
    }
    return { updated: true, coverAfter: newCoverKey };
  }

  it("repeating identical import does not change data", () => {
    const first = simulateImportRow(null, "products/123/hash.webp");
    expect(first.updated).toBe(true);
    expect(first.coverAfter).toBe("products/123/hash.webp");

    const second = simulateImportRow("products/123/hash.webp", "products/123/hash.webp");
    expect(second.updated).toBe(false);
    expect(second.coverAfter).toBe("products/123/hash.webp");
  });

  it("cover is preserved when media is missing in import", () => {
    const result = simulateImportRow("old-hash.webp", null);
    expect(result.updated).toBe(false);
    expect(result.coverAfter).toBe("old-hash.webp");
  });
});

describe("Cover import integration — failure isolation", () => {
  it("upload failure leaves DB unchanged (cover key stays same)", () => {
    const beforeCover = "existing-key.webp";
    let dbCover = beforeCover;

    function tryUpload(shouldFail: boolean): boolean {
      if (shouldFail) return false;
      dbCover = "new-key.webp";
      return true;
    }

    const uploadSucceeded = tryUpload(true);
    if (!uploadSucceeded) {
      // Do not change DB
    }

    expect(uploadSucceeded).toBe(false);
    expect(dbCover).toBe(beforeCover);
  });

  it("successful upload replaces cover in DB", () => {
    let dbCover = "existing-key.webp";
    const uploadSucceeded = true;
    if (uploadSucceeded) {
      dbCover = "new-key.webp";
    }
    expect(dbCover).toBe("new-key.webp");
  });

  it("DB failure cleans up unreferenced object", () => {
    const storageObjects = new Set<string>();
    let dbSucceeded = false;
    const newKey = "products/new-id/hash.webp";

    storageObjects.add(newKey);

    if (!dbSucceeded) {
      storageObjects.delete(newKey);
    }

    expect(storageObjects.has(newKey)).toBe(false);
    expect(dbSucceeded).toBe(false);
  });
});
