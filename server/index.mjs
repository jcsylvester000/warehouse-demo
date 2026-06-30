// Carease Health — Warehouse WMS · API server
// Express + Prisma + Neon (PostgreSQL).
//
// Phase 1: persists the whole app state as one JSON document per workspace.
//   GET  /api/health            -> { ok, db }
//   GET  /api/state?slug=...     -> { slug, label, version, state }
//   PUT  /api/state              -> { slug, state, version? }  (upsert + snapshot)
//   GET  /api/snapshots?slug=... -> recent saved versions (audit / undo)
//
// Run:  npm run server   (after `npx prisma generate` and `npx prisma db push`)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './db.mjs';

const app = express();
app.use(cors()); // tighten to your front-end origin in production
app.use(express.json({ limit: '12mb' })); // app state can be large

const SLUG = process.env.WMS_WORKSPACE_SLUG || 'carease-default';
const ok = (res, body) => res.json(body);
const fail = (res, code, msg) => res.status(code).json({ error: msg });

// --- health -----------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, { ok: true, db: 'up' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'down', error: String(e.message || e) });
  }
});

// --- read state --------------------------------------------------------------
app.get('/api/state', async (req, res) => {
  try {
    const slug = String(req.query.slug || SLUG);
    const ws = await prisma.workspace.findUnique({ where: { slug } });
    if (!ws) return ok(res, { slug, label: 'Carease Warehouse', version: 0, state: null });
    ok(res, { slug: ws.slug, label: ws.label, version: ws.version, state: ws.state });
  } catch (e) {
    fail(res, 500, String(e.message || e));
  }
});

// --- write state (upsert + append-only snapshot) -----------------------------
app.put('/api/state', async (req, res) => {
  try {
    const { slug = SLUG, state, label, note } = req.body || {};
    if (state == null || typeof state !== 'object') return fail(res, 400, 'state (object) is required');

    const existing = await prisma.workspace.findUnique({ where: { slug } });
    const nextVersion = (existing?.version || 0) + 1;

    const ws = await prisma.workspace.upsert({
      where: { slug },
      create: { slug, label: label || 'Carease Warehouse', state, version: 1 },
      update: { state, version: nextVersion, ...(label ? { label } : {}) },
    });

    // best-effort audit trail; never block the save on it
    prisma.stateSnapshot
      .create({ data: { workspace: slug, version: ws.version, state, note: note || null } })
      .catch(() => {});

    ok(res, { slug: ws.slug, version: ws.version, updatedAt: ws.updatedAt });
  } catch (e) {
    fail(res, 500, String(e.message || e));
  }
});

// --- snapshots (audit / undo) -----------------------------------------------
app.get('/api/snapshots', async (req, res) => {
  try {
    const slug = String(req.query.slug || SLUG);
    const rows = await prisma.stateSnapshot.findMany({
      where: { workspace: slug },
      orderBy: { version: 'desc' },
      take: Math.min(Number(req.query.limit) || 20, 100),
      select: { id: true, version: true, note: true, createdAt: true },
    });
    ok(res, rows);
  } catch (e) {
    fail(res, 500, String(e.message || e));
  }
});

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`Carease WMS API on http://localhost:${PORT}  (workspace: ${SLUG})`);
});
