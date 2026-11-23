import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getFindUserResponseMock, getSearchUsersResponseMock } from '../src/generated/api.faker.js';
import { UserSchema, UsersResultSchema } from '../src/users/users.schema.js';

describe('Orval Faker fixtures generated FROM actual OpenAPI 3.2', () => {
  it('generates a valid public user', () => {
    const fake = getFindUserResponseMock();
    // Generated data is an API response (ISO string). z.encode reverses
    // the Date -> ISO codec to validate it as the response wire type.
    const decoded = z.encode(UserSchema, fake);
    expect(decoded.createdAt).toBeInstanceOf(Date);
    expect(z.decode(UserSchema, decoded).createdAt).toBe(fake.createdAt);
  });
  it('generates a valid QUERY search response', () => {
    const fake = getSearchUsersResponseMock();
    const decoded = z.encode(UsersResultSchema, fake);
    for (const user of decoded.users) {
      expect(user.createdAt).toBeInstanceOf(Date);
    }
    expect(z.decode(UsersResultSchema, decoded).users).toEqual(fake.users);
  });
});
