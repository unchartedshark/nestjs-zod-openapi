/** Transport-independent domain errors; REST and GraphQL render them differently. */
export abstract class UserDomainError extends Error {
  constructor(
    public readonly code: 'USER_NOT_FOUND' | 'USER_ALREADY_EXISTS',
    public readonly httpStatus: 404 | 409,
    public readonly problemType: string,
    message: string,
  ) {
    super(message);
    this.name = code;
  }
}

export class UserNotFoundError extends UserDomainError {
  constructor(id: string) {
    super('USER_NOT_FOUND', 404, 'https://example.test/problems/user-not-found', `User '${id}' was not found.`);
  }
}

export class UserAlreadyExistsError extends UserDomainError {
  constructor(email: string) {
    super('USER_ALREADY_EXISTS', 409, 'https://example.test/problems/user-already-exists', `User '${email}' already exists.`);
  }
}
