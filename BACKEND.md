# Carease WMS — Live Backend (Prisma + Neon)

This adds a real, shared backend to the app. Data is stored in your **Neon
PostgreSQL** database via **Prisma**, so it persists across sessions, browsers
and machines — not just in one browser tab.

The app still runs fully **local** (no backend) when `VITE_API_URL` is empty, so
nothing breaks if the server isn't running. Turn the backend on by pointing the
front-end at the API.

---

## 0) Security first — rotate the password

The connection string was shared in chat, which means it should be treated as
**compromised**. Before relying on this:

1. Neon console → your project → **Roles** → reset the password for `neondb_owner`
   (or create a dedicated app role).
2. Put the new string in `.env` only (it is **gitignored** — never commit it).

`.env` is ignored by git; `.env.example` (no secrets) is the committed template.

---

## 1) What was added

```
prisma/schema.prisma        Prisma schema (Workspace state document + snapshots)
server/index.mjs            Express API (health, GET/PUT state, snapshots)
server/db.mjs              Shared PrismaClient
server/verify-neon.mjs      Raw connectivity check (no Prisma engine needed)
server/init-workspace.mjs   Creates the empty default workspace row
src/utils/api.js            Front-end API client (no-op unless VITE_API_URL set)
src/composables/useBackendSync.js   Loads on boot, debounced save on change
.env / .env.example         Connection strings + ports (secret / template)
```

New npm scripts: `server`, `db:generate`, `db:push`, `db:studio`, `db:verify`,
`db:init`, `stack`.

---

## 2) One-time setup

```bash
npm install                 # installs prisma, express, @prisma/client, etc.
npm run db:verify           # confirms the app can reach Neon
npm run db:generate         # generates the Prisma client
npm run db:push             # creates the tables in Neon (Workspace, StateSnapshot)
npm run db:init             # creates the empty "carease-default" workspace
```

> `db:verify` / `db:generate` / `db:push` need normal internet access. They could
> not run inside the build sandbox (its firewall blocks Neon's host and Prisma's
> binary CDN), so run them on your machine — they work there.

---

## 3) Run it

**Two terminals (or one with `npm run stack`):**

```bash
npm run server              # API on http://localhost:8787
# then, with the front-end pointed at the API:
VITE_API_URL=http://localhost:8787 npm run dev
```

Or set `VITE_API_URL=http://localhost:8787` in `.env` and just run `npm run stack`.

Open the app, add some inventory / a PO — then reload, or open it in another
browser. The data is now coming from Neon.

Check it's wired: `GET http://localhost:8787/api/health` → `{ "ok": true, "db": "up" }`.

---

## 4) How it works (Phase 1)

The whole app state (items, groups, assemblies, assets, purchase/sales orders,
returns, settings, counters) is saved as **one JSON document per workspace** in
the `Workspace` table. This is the same object the app used to keep in the
browser; it now lives in Postgres.

- **Boot:** `useBackendSync` calls `GET /api/state` and patches the result into
  the Pinia store. If the backend is unreachable it silently falls back to the
  local cache.
- **On change:** the store subscription debounces (800 ms) and `PUT /api/state`,
  bumping a version and writing an append-only `StateSnapshot` (a free audit
  trail / basis for undo).

This deliberately avoids rewriting every store getter, so you get a working
shared backend now, with zero behaviour change to the app's logic.

### API

| Method | Path             | Purpose                                  |
|--------|------------------|------------------------------------------|
| GET    | `/api/health`    | liveness + DB check                      |
| GET    | `/api/state`     | load workspace state (`?slug=`)          |
| PUT    | `/api/state`     | save state (`{ slug, state, version }`)  |
| GET    | `/api/snapshots` | recent saved versions (audit/undo)       |

---

## 5) Phase 2 — normalized tables (roadmap)

When you want per-row querying/reporting in SQL (not a JSON blob), promote the
high-value collections to real tables. The models are stubbed at the bottom of
`prisma/schema.prisma`: `Item`, `Group`, `AssemblyDef`, `AssetUnit`, `Asset`,
`PurchaseOrder`, `SalesOrder`, `Return`, `Vendor`. The migration path:

1. Uncomment/flesh out the models → `npm run db:push`.
2. Add per-entity routes (`/api/items`, `/api/purchase-orders`, …) in `server/`.
3. Move the store actions from "save the whole blob" to calling those routes.

This can be done one entity at a time without breaking Phase 1.

---

## 6) Deploying

The current Netlify deploy is a **static** front-end. A live backend needs a
server somewhere:

- **API:** host `server/` on Render / Railway / Fly / a small VM, set its env to
  the Neon string, and set the front-end's `VITE_API_URL` to that public URL at
  build time. (Prisma + Neon's pooled connection is serverless-friendly.)
- **Alternative:** port the three handlers to **Netlify Functions** and keep
  everything on Netlify; use Neon's pooled URL and Prisma's data proxy / driver
  adapter for serverless. (Heavier; the standalone server above is simpler to
  start with.)

Keep `cors()` tightened to your front-end origin in production.
