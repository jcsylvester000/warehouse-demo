// Single shared Prisma client (avoids exhausting Neon connections on hot-reload).
import { PrismaClient } from '@prisma/client';

const g = globalThis;
export const prisma =
  g.__careasePrisma ?? new PrismaClient({ log: ['warn', 'error'] });
if (process.env.NODE_ENV !== 'production') g.__careasePrisma = prisma;
