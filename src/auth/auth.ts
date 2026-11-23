import { DatabaseSync } from 'node:sqlite';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';

/**
 * Minimal Better Auth configuration for this standalone NestJS example.
 *
 * Only authentication uses SQLite; the example UsersService stays mocked.
 * Use a persistent database in a real deployment. Tests override the path to
 * ':memory:' so no account data survives a test run.
 */
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('Set BETTER_AUTH_SECRET to a random value of at least 32 characters.');
}

export const authDatabase = new DatabaseSync(
  process.env.AUTH_DATABASE_PATH ?? 'auth.sqlite',
);

export const auth = betterAuth({
  database: authDatabase,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret,
  emailAndPassword: { enabled: true },
  plugins: [admin()],
});
