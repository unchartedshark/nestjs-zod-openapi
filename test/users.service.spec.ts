import { describe, expect, it } from 'vitest';
import { UserNotFoundError, UserAlreadyExistsError } from '../src/users/users.errors.js';
import { UserSchema, UsersResultSchema } from '../src/users/users.schema.js';
import { UsersService } from '../src/users/users.service.js';

const service = new UsersService();

describe('mock user service', () => {
  it('returns mocked records and provides the public contract', () => {
    const raw = service.findOne('00000000-0000-4000-8000-000000000001');
    expect(raw).toHaveProperty('internalSecret');
    expect(raw.createdAt).toBeInstanceOf(Date);
    const user = UserSchema.parse(raw);
    expect(user).not.toHaveProperty('internalSecret');
    expect(user.createdAt).toBe('2026-10-01T12:00:00.000Z');
  });
  it('filters without a database', () => {
    const result = service.search({ role: 'admin', limit: 1 });
    expect(result.users[0].createdAt).toBeInstanceOf(Date);
    expect(UsersResultSchema.parse(result).users[0].createdAt).toBe('2026-10-01T12:00:00.000Z');
    expect(result.total).toBe(1);
  });
  it('creates a Date internally while exposing ISO datetime through the response schema', () => {
    const result = service.create({
      email: 'fresh@example.test',
      displayName: 'Fresh',
      role: 'member',
    });

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(UserSchema.parse(result).createdAt).toBe(result.createdAt.toISOString());
  });

  it('raises transport-neutral errors', () => {
    expect(() => service.findOne('00000000-0000-4000-8000-000000000099')).toThrow(UserNotFoundError);
    expect(() => service.create({ email: 'alice@example.test', displayName: 'Duplicate', role: 'member' })).toThrow(UserAlreadyExistsError);
  });
});
