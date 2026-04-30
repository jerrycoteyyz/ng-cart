import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host:     process.env['DB_HOST']     || 'localhost',
  port:     Number(process.env['DB_PORT'] || 5432),
  database: process.env['DB_NAME']     || 'ngcart',
  user:     process.env['DB_USER']     || 'ngcart',
  password: process.env['DB_PASSWORD'] || 'ngcart_dev',
});
