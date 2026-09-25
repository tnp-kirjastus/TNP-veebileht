import { describe, it, expect } from "vitest";
import { parseFlag, parseEtDate, parseReleaseDate } from "@/lib/import-parse";

describe("parseFlag — tõeväärtuse veerud (Ilmumas, Ettetellimus, Arhiiv)", () => {
  it('"x" tähendab jah (ka suurtähena ja tühikutega)', () => {
    expect(parseFlag("x")).toBe(true);
    expect(parseFlag("X")).toBe(true);
    expect(parseFlag(" x ")).toBe(true);
  });

  it("aktsepteerib jah-sõnu", () => {
    expect(parseFlag("jah")).toBe(true);
    expect(parseFlag("true")).toBe(true);
    expect(parseFlag("yes")).toBe(true);
    expect(parseFlag("1")).toBe(true);
  });

  it("tühi lahter ja muud väärtused tähendavad ei", () => {
    expect(parseFlag("")).toBe(false);
    expect(parseFlag(null)).toBe(false);
    expect(parseFlag(undefined)).toBe(false);
    expect(parseFlag("ei")).toBe(false);
  });
});

describe("parseEtDate — Eesti kuupäevad ja Exceli seriaalid", () => {
  it("DD.MM.YYYY → ISO", () => {
    expect(parseEtDate("12.05.2010")).toBe("2010-05-12");
    expect(parseEtDate("1.1.2024")).toBe("2024-01-01");
  });

  it("ISO kuupäev läbib muutmata", () => {
    expect(parseEtDate("2010-05-12")).toBe("2010-05-12");
  });

  it("Exceli seriaal → ISO", () => {
    // 40310 = 12.05.2010
    expect(parseEtDate("40310")).toBe("2010-05-12");
  });

  it("kehtetu kuupäev → null", () => {
    expect(parseEtDate("31.02.2010")).toBeNull();
    expect(parseEtDate("midagi")).toBeNull();
    expect(parseEtDate("")).toBeNull();
  });
});

describe("parseReleaseDate — |-eraldatud trükiloend", () => {
  it("üks kuupäev", () => {
    expect(parseReleaseDate("12.05.2010")).toBe("2010-05-12");
  });

  it("release_date on esmatrüki (varaseim) kuupäev, olenemata järjekorrast", () => {
    expect(parseReleaseDate("15.03.2018|12.05.2010")).toBe("2010-05-12");
    expect(parseReleaseDate("12.05.2010|15.03.2018|02.11.2021")).toBe("2010-05-12");
  });

  it("tühi väärtus → null", () => {
    expect(parseReleaseDate("")).toBeNull();
    expect(parseReleaseDate(null)).toBeNull();
    expect(parseReleaseDate(undefined)).toBeNull();
  });

  it("kui ükski osa pole parsitav, tagastab null (midagi ei kirjutata)", () => {
    expect(parseReleaseDate("tundmatu|vale")).toBeNull();
  });
});
