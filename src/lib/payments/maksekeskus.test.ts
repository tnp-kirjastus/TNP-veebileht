import { describe, expect, it } from "vitest";
import { euroDecimalToCents } from "../money";

describe("euroDecimalToCents", () => {
  it.each([["0", 0], ["1.2", 120], ["27.60", 2760], [32, 3200]])("converts %s without floating point arithmetic", (input, expected) => {
    expect(euroDecimalToCents(input)).toBe(expected);
  });

  it.each(["-1", "1.234", "NaN", "12,50", Number.POSITIVE_INFINITY])("rejects invalid money %s", (input) => {
    expect(() => euroDecimalToCents(input)).toThrow("invalid_order_total");
  });
});
