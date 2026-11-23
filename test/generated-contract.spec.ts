import { describe, expect, it } from 'vitest';
import { getFindUserResponseMock, getSearchUsersResponseMock } from '../src/generated/api.faker.js';
import { UserSchema, UsersResultSchema } from '../src/users/users.schema.js';

describe('Orval Faker fixtures generated FROM actual OpenAPI 3.2', () => {
  it('generates a valid public user', () => {
    const fake = getFindUserResponseMock();
    expect(UserSchema.safeParse(fake).success).toBe(true);
  });
  it('generates a valid QUERY search response', () => {
    const fake = getSearchUsersResponseMock();
    expect(UsersResultSchema.safeParse(fake).success).toBe(true);
  });
});
