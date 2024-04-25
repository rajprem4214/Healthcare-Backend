import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';
import { env } from './src/config/env';

dotenv.config({
  path: path.resolve(__dirname, './.env'),
});

if (
  !process.env.DATABASE_HOST ||
  !process.env.DATABASE_USERNAME ||
  !process.env.DATABASE_PASSWORD ||
  !process.env.DATABASE
) {
  throw Error('Missing creds for db');
}

export default {
  schema: './src/db/schemas/*',
  out: './drizzle',
  driver: 'mysql2',
  verbose: true,
  dbCredentials: {
    uri: env.DATABASE_URL,
  },
} satisfies Config;
