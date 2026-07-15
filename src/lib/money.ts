export function euroDecimalToCents(value: unknown): number {
  const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("invalid_order_total");
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("invalid_order_total");
  return cents;
}

export function roundEuro(value: number): number {
  if (!Number.isFinite(value)) throw new Error("invalid_order_total");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
