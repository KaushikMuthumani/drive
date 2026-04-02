import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/driveindia'
const isProd = process.env.NODE_ENV === 'production'
const pool = new Pool({
  connectionString,
  max: 10,
  // Hosted Postgres providers such as Supabase require SSL in serverless deployments.
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
})
export const db = drizzle(pool, { schema })
