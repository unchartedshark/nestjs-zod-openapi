import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Aligns Swagger's default response media type with the HTTP exception filter.
 *
 * `@ApiResponse({ standardSchema })` automatically discovers and registers
 * named Zod models, but Swagger defaults their content type to JSON. Our
 * global exception filter returns RFC 9457 `application/problem+json` for
 * every HTTP error. There is no status-specific `@ApiProduces` decorator,
 * so this single, generic adjustment keeps the documented media type honest.
 *
 * This does not register or enumerate schemas. Controllers remain the sole
 * source of models and response declarations.
 *
 * @param document - The Swagger document generated from route decorators.
 */
export function useProblemMediaType(document: OpenAPIObject): void {
  for (const path of Object.values(document.paths)) {
    if (!path) {
      continue;
    }

    for (const operation of Object.values(path)) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) {
        continue;
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        const code = Number(status);
        if (!Number.isInteger(code) || code < 400 || code > 599) {
          continue;
        }
        if (!response || '$ref' in response) {
          continue;
        }

        const content = response.content;
        const json = content?.['application/json'];
        if (!content || !json) {
          continue;
        }

        delete content['application/json'];
        content['application/problem+json'] = json;
      }
    }
  }
}
