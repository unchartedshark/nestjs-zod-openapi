import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Aligns Swagger's response media types with the HTTP exception filter.
 *
 * Nest Swagger discovers and registers Zod schemas from controller metadata.
 * Its default response media type is application/json, including for errors.
 * RFC 9457 errors from the global exception filter use application/problem+json.
 *
 * This generic post-processing step does not register any schema or depend on
 * a particular controller, feature, or Zod model.
 *
 * @param document - OpenAPI document generated from controller decorators.
 */
export function useProblemMediaType(document: OpenAPIObject): void {
  for (const path of Object.values(document.paths)) {
    if (!path) {
      continue;
    }

    for (const operation of Object.values(path)) {
      if (
        !operation ||
        typeof operation !== 'object' ||
        !('responses' in operation) ||
        !operation.responses ||
        typeof operation.responses !== 'object'
      ) {
        continue;
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        const statusCode = Number(status);
        if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
          continue;
        }

        if (
          !response ||
          typeof response !== 'object' ||
          '$ref' in response ||
          !('content' in response) ||
          !response.content ||
          typeof response.content !== 'object'
        ) {
          continue;
        }

        const content = response.content as Record<string, unknown>;
        const json = content['application/json'];
        if (json === undefined) {
          continue;
        }

        delete content['application/json'];
        content['application/problem+json'] = json;
      }
    }
  }
}
