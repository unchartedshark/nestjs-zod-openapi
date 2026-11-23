import { getMigrations } from 'better-auth/db/migration';
import { auth } from '../src/auth/auth.js';

/**
 * Applies Better Auth's SQLite tables and admin-plugin columns.
 *
 * Run this before starting the application. Unlike an auto-migration in
 * bootstrap, this remains an explicit deployment operation.
 */
const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
console.log('Better Auth database is ready.');
