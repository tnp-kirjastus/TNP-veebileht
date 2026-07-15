<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Windows TLS / Node.js

Node.js uses its own CA store and may not trust the Supabase certificate on Windows.
All npm scripts set `NODE_OPTIONS=--use-system-ca` to use the Windows certificate store.
If you see `TypeError: fetch failed` with cause `unable to verify the first certificate`,
ensure `--use-system-ca` is active.

## Admin system runs against Supabase

All admin pages use `createAdminClient()` (`src/lib/supabase/admin.ts`) which connects
to the remote Supabase project using the `SUPABASE_SERVICE_ROLE_KEY`. There is no local
Supabase instance — the `.env.local` must contain valid remote credentials.
