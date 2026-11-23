import 'reflect-metadata';

// Authentication runs with an isolated SQLite database for each test process.
// The secret is test-only, never deployed or used by an actual account.
process.env.AUTH_DATABASE_PATH = ':memory:';
process.env.BETTER_AUTH_SECRET ??= 'test-only-not-for-production-please-replace-this-32-chars';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
