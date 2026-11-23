/**
 * Base contract for expected application errors, independent of NestJS.
 *
 * Feature-specific errors extend this class and supply a stable code, HTTP
 * status and RFC 9457 problem type URI. The global exception filter handles
 * only this shared contract; adding a new feature needs no filter changes.
 */
export abstract class DomainError extends Error {
  protected constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly problemType: string,
    message: string,
  ) {
    super(message);
    this.name = code;
  }
}
