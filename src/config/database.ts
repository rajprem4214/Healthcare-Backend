import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import { env } from './env';
import { schema } from '../db';

// create the connection
export const connection = connect({
  url: env.DATABASE_URL,
});

export const db = drizzle(connection, {
  schema,
  logger: env.DATABASE_LOGGING_ENABLED,
});
