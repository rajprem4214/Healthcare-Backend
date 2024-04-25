import { migrate } from 'drizzle-orm/planetscale-serverless/migrator';
import { connection, db } from '../config/database';

// This will run migrations on the database, skipping the ones already applied
async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  // Don't forget to close the connection, otherwise the script will hang
}
main();
