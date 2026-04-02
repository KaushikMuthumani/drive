import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/driveindia'
const pool = new Pool({ connectionString, max: 10 })
export const db = drizzle(pool, { schema })
