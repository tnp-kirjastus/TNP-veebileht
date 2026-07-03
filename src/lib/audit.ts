import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function audit(
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  options?: { before?: Record<string, unknown>; after?: Record<string, unknown>; correlationId?: string },
) {
  const db = createAdminClient();
  const summary: Record<string, unknown> = {};
  if (options?.before) {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(options.before)) {
      if (v === undefined) continue;
      safe[k] = typeof v === "string" ? v.slice(0, 1000) : v;
    }
    summary.before = safe;
  }
  if (options?.after) {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(options.after)) {
      if (v === undefined) continue;
      safe[k] = typeof v === "string" ? v.slice(0, 1000) : v;
    }
    summary.after = safe;
  }
  await db.schema("system").from("audit_log").insert({
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    correlation_id: options?.correlationId ?? null,
    before_summary: summary.before ?? null,
    after_summary: summary.after ?? null,
  });
}
