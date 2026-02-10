import { env } from '$env/dynamic/private';

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export type Db = typeof db;
