// Create an empty default workspace row so the app has somewhere to save to.
// Safe to run repeatedly (idempotent). Run: npm run db:init
import 'dotenv/config';
import { prisma } from './db.mjs';

const slug = process.env.WMS_WORKSPACE_SLUG || 'carease-default';
try {
  const ws = await prisma.workspace.upsert({
    where: { slug },
    create: { slug, label: 'Carease Warehouse', state: {}, version: 1 },
    update: {}, // leave existing state untouched
  });
  console.log(`Workspace ready: "${ws.slug}" (version ${ws.version}).`);
} catch (e) {
  console.error('init failed:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
