import { describe, expect, it } from "vitest";
import { calculateMaksekeskusMac, verifyMaksekeskusMac } from "./mac";

describe("Maksekeskus MAC", () => {
  it("uses uppercase SHA-512 of the exact JSON followed by the secret", () => {
    const json = '{"status":"COMPLETED","amount":"27.60"}';
    const mac = calculateMaksekeskusMac(json, "test-secret");
    expect(mac).toMatch(/^[0-9A-F]{128}$/);
    expect(verifyMaksekeskusMac(json, "test-secret", mac.toLowerCase())).toBe(true);
  });

  it("rejects changed bodies and malformed MACs", () => {
    const mac = calculateMaksekeskusMac("{}", "test-secret");
    expect(verifyMaksekeskusMac('{"changed":true}', "test-secret", mac)).toBe(false);
    expect(verifyMaksekeskusMac("{}", "test-secret", "bad")).toBe(false);
  });
});
