import { z } from 'zod';

/**
 * Serializes a JavaScript Date as an ISO 8601 UTC datetime string.
 *
 * The direction is deliberate: NestJS's StandardSchemaSerializerInterceptor
 * invokes the schema's Standard Schema validator on a handler's return value.
 * Zod codec decoding therefore runs Date -> ISO string for REST responses.
 * The reverse operation (ISO string -> Date) uses `z.encode()`.
 *
 * OpenAPI uses the codec's output JSON Schema: string, format: date-time.
 * Keep this codec transport-neutral; feature schemas can reuse it directly.
 */
export const DateTimeSchema = z.codec(
  z.date(),
  z.iso.datetime(),
  {
    decode: (date) => date.toISOString(),
    encode: (isoDateTime) => new Date(isoDateTime),
  },
);
