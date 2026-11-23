/**
 * User roles shared by REST and GraphQL as ordinary TypeScript values.
 *
 * Neither transport's validation machinery is needed by the other:
 * Zod uses these values for HTTP and GraphQL registers them as an enum.
 */
export const UserRole = {
  admin: 'admin',
  member: 'member',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
