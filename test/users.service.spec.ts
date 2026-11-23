import { describe, expect, it } from 'vitest';
import { UserNotFoundError, UserAlreadyExistsError } from '../src/users/users.errors.js';
import { UserSchema, UsersResultSchema } from '../src/users/users.schema.js';
import { UsersService } from '../src/users/users.service.js';

const service = new UsersService();

describe('mock user service', () => {
  it('returns mocked records and provides the public contract', () => {
    const raw = service.findOne('00000000-0000-4000-8000-000000000001');
    expect(raw).toHaveProperty('internalSecret');
    const user = UserSchema.parse(raw);
    expect(user).not.toHaveProperty('internalSecret');
  });
  it('filters without a database', () => {
    const result = service.search({ role: 'admin', limit: 1 });
    expect(UsersResultSchema.safeParse(result).success).toBe(true);
    expect(result.total).toBe(1);
  });
  it('raises transport-neutral errors', () => {
    expect(() => service.findOne('00000000-0000-4000-8000-000000000099')).toThrow(UserNotFoundError);
    expect(() => service.create({ email: 'alice@example.test', displayName: 'Duplicate', role: 'member' })).toThrow(UserAlreadyExistsError);
  });
});
