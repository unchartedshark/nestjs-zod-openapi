import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserAlreadyExistsError, UserNotFoundError } from './users.errors.js';
import { type CreateUser, type SearchUsers, type User, UserSchema, UsersResultSchema } from './users.schema.js';

/** No database: in-memory, deterministic seed data, and synthetic create results. */
@Injectable()
export class UsersService {
  private readonly mockUsers = [
    { id: '00000000-0000-4000-8000-000000000001', email: 'alice@example.test', displayName: 'Alice', role: 'admin', internalSecret: 'never expose this' },
    { id: '00000000-0000-4000-8000-000000000002', email: 'bob@example.test', displayName: 'Bob', role: 'member', internalSecret: 'also private' },
  ] as const;

  findOne(id: string) {
    const user = this.mockUsers.find((item) => item.id === id);
    if (!user) throw new UserNotFoundError(id);
    return user; // REST serializer strips internalSecret; GraphQL resolver also parses.
  }

  search(criteria: SearchUsers) {
    const needle = criteria.query?.toLowerCase();
    const matches = this.mockUsers.filter((user) =>
      (!criteria.role || user.role === criteria.role) &&
      (!needle || user.email.includes(needle) || user.displayName.toLowerCase().includes(needle)),
    );
    return { total: matches.length, users: matches.slice(0, criteria.limit) };
  }

  create(input: CreateUser): User {
    if (this.mockUsers.some((user) => user.email === input.email)) {
      throw new UserAlreadyExistsError(input.email);
    }
    return UserSchema.parse({ id: randomUUID(), ...input });
  }

  /** Convenient transport-independent assertion used by test suites. */
  validateSearchResult(value: unknown) {
    return UsersResultSchema.parse(value);
  }
}
