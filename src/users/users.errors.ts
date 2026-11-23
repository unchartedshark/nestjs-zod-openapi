import { DomainError } from '../problems/domain.error.js';

/** Stable problem type identifiers for the Users feature. */
export const USER_NOT_FOUND_PROBLEM_TYPE =
  'https://example.test/problems/user-not-found';
export const USER_ALREADY_EXISTS_PROBLEM_TYPE =
  'https://example.test/problems/user-already-exists';

/** No transport-specific exception or shared filter registration is required. */
export class UserNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'USER_NOT_FOUND',
      404,
      USER_NOT_FOUND_PROBLEM_TYPE,
      `User '${id}' was not found.`,
    );
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(
      'USER_ALREADY_EXISTS',
      409,
      USER_ALREADY_EXISTS_PROBLEM_TYPE,
      `User '${email}' already exists.`,
    );
  }
}
