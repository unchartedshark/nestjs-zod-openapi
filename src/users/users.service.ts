import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserAlreadyExistsError, UserNotFoundError } from './users.errors.js';
import type { CreateUser, SearchUsers, User } from './users.schema.js';

/**
 * Stateless demonstration service: no database or network dependencies.
 *
 * Seed data includes an internal-only field on purpose so transport tests can
 * demonstrate that REST Zod serialization and GraphQL field selection do not
 * expose private properties.
 * `create()` generates a result but does not persist it in the seed collection.
 */
@Injectable()
export class UsersService {
  private readonly mockUsers = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'alice@example.test',
      displayName: 'Alice',
      role: 'admin',
      createdAt: new Date('2026-10-01T12:00:00.000Z'),
      internalSecret: 'never expose this',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      email: 'bob@example.test',
      displayName: 'Bob',
      role: 'member',
      createdAt: new Date('2026-10-02T12:00:00.000Z'),
      internalSecret: 'also private',
    },
  ] as const;

  /** Returns one seeded user, or throws a transport-independent domain error. */
  findOne(id: string) {
    const user = this.mockUsers.find((item) => item.id === id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  /** Searches case-insensitively with deterministic fixture results. */
  search(criteria: SearchUsers) {
    const needle = criteria.query?.toLowerCase();
    const matches = this.mockUsers.filter((user) => {
      const matchingRole = !criteria.role || user.role === criteria.role;
      const matchingText = !needle ||
        user.email.toLowerCase().includes(needle) ||
        user.displayName.toLowerCase().includes(needle);

      return matchingRole && matchingText;
    });

    return { total: matches.length, users: matches.slice(0, criteria.limit) };
  }

  /** Creates a response only; the test fixture never mutates. */
  create(input: CreateUser): User {
    if (this.mockUsers.some((user) => user.email === input.email)) {
      throw new UserAlreadyExistsError(input.email);
    }

    return { id: randomUUID(), ...input, createdAt: new Date() };
  }
}
