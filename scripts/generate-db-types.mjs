#!/usr/bin/env node
/**
 * Genereerib src/lib/supabase/database.types.ts PostgREST OpenAPI spekifukatsioonist.
 *
 * Supabase CLI vajab DB parooli, mida meil pole — seega kasutame teenuse
 * OpenAPI-dokumenti (service role key), mis kirjeldab kõiki avatud skeemide
 * tabeleid, viewsid ja RPC-funktsioone täpselt.
 *
 * Käivita: npm run db:types
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCHEMAS = ["public", "commerce", "content", "people"];

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const FORMAT_MAP = {
  integer: "number",
  bigint: "number",
  smallint: "number",
  numeric: "number",
  real: "number",
  "double precision": "number",
  boolean: "boolean",
  json: "Json",
  jsonb: "Json",
};

function tsType(prop) {
  const format = prop.format || "";
  if (format.endsWith("[]")) return "string[]";
  if (FORMAT_MAP[format]) return FORMAT_MAP[format];
  return "string"; // text, uuid, date, timestamp, tsvector, ...
}

function tableTypes(name, def) {
  const required = new Set(def.required || []);
  const props = def.properties || {};
  const row = [];
  const insert = [];
  const update = [];
  for (const [col, prop] of Object.entries(props)) {
    const base = tsType(prop);
    const nullable = !required.has(col);
    row.push(`      ${col}: ${base}${nullable ? " | null" : ""};`);
    // Insert: kohustuslik ainult siis, kui NOT NULL ja ilma defaultita
    const optional = nullable || prop.default !== undefined;
    insert.push(
      `      ${col}${optional ? "?" : ""}: ${base}${nullable ? " | null" : ""};`,
    );
    update.push(`      ${col}?: ${base}${nullable ? " | null" : ""};`);
  }
  return `    ${name}: {
      Row: {
${row.join("\n")}
      };
      Insert: {
${insert.join("\n")}
      };
      Update: {
${update.join("\n")}
      };
      Relationships: [];
    };`;
}

function functionType(name, pathItem) {
  // PostgREST: POST parameetrid on body skeemi properties all
  const bodyProps =
    pathItem?.post?.parameters?.find((p) => p.in === "body")?.schema?.properties ??
    pathItem?.post?.requestBody?.content?.["application/json"]?.schema?.properties ??
    null;
  const namedArgs = bodyProps
    ? Object.entries(bodyProps).filter(([k]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k))
    : [];
  const args = namedArgs.length
    ? namedArgs.map(([k, v]) => `      ${k}: ${tsType(v)};`)
    : ["      [_: string]: unknown;"];
  return `    ${name}: {
      Args: {
${args.join("\n")}
      };
      Returns: unknown;
    };`;
}

async function fetchSchema(url, key, schema) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Accept-Profile": schema,
    },
  });
  if (!res.ok) throw new Error(`${schema}: HTTP ${res.status}`);
  return res.json();
}

const env = loadEnv();
const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ja SUPABASE_SERVICE_ROLE_KEY peavad olema .env.local failis");
  process.exit(1);
}

const out = [
  "// SEE FAIL ON GENEREERITUD — ära redigeeri käsitsi.",
  "// Uuenda: npm run db:types",
  "/* eslint-disable @typescript-eslint/no-empty-object-type */",
  "",
  "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];",
  "",
  "export type Database = {",
];

let tableCount = 0;
let fnCount = 0;
for (const schema of SCHEMAS) {
  const spec = await fetchSchema(url, key, schema);
  const tables = [];
  const functions = [];
  for (const [name, def] of Object.entries(spec.definitions || {})) {
    if (name === "" || name.startsWith("rpc/")) continue;
    tables.push(tableTypes(name, def));
    tableCount++;
  }
  for (const [path, item] of Object.entries(spec.paths || {})) {
    if (!path.startsWith("/rpc/")) continue;
    functions.push(functionType(path.slice(5), item));
    fnCount++;
  }
  out.push(`  ${schema}: {`);
  out.push("    Tables: {");
  out.push(tables.join("\n"));
  out.push("    };");
  out.push("    Views: { [_ in never]: never };");
  if (functions.length) {
    out.push("    Functions: {");
    out.push(functions.join("\n"));
    out.push("    };");
  } else {
    out.push("    Functions: { [_ in never]: never };");
  }
  out.push("    Enums: { [_ in never]: never };");
  out.push("  },");
}
out.push("};");
out.push("");
out.push(
  'export type Tables<S extends keyof Database, T extends keyof Database[S]["Tables"]> =',
);
out.push('  Database[S]["Tables"][T] extends { Row: infer R } ? R : never;');
out.push("");

writeFileSync(join(ROOT, "src/lib/supabase/database.types.ts"), out.join("\n"), "utf8");
console.log(`database.types.ts genereeritud: ${tableCount} tabelit, ${fnCount} funktsiooni (${SCHEMAS.join(", ")})`);
