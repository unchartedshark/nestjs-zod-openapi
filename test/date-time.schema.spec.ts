import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DateTimeSchema } from '../src/schemas/date-time.schema.js';

const ISO = '2026-10-01T12:34:56.789Z';

describe('shared Date -> ISO datetime codec', () => {
  it('decodes a Date to an ISO 8601 UTC string for REST serialization', () => {
    const date = new Date(ISO);
    expect(z.decode(DateTimeSchema, date)).toBe(ISO);
    expect(DateTimeSchema.parse(date)).toBe(ISO);
  });

  it('encodes an ISO datetime string back into a Date for round trips', () => {
    expect(z.encode(DateTimeSchema, ISO)).toEqual(new Date(ISO));
  });

  it('rejects invalid dates and non-ISO strings', () => {
    expect(DateTimeSchema.safeParse(new Date(Number.NaN)).success).toBe(false);
    expect(DateTimeSchema.safeParse(ISO).success).toBe(false);
    expect(z.safeEncode(DateTimeSchema, 'not a date').success).toBe(false);
  });

  it('describes the response as a formatted JSON string for Swagger and Orval', () => {
    expect(z.toJSONSchema(DateTimeSchema)).toMatchObject({
      type: 'string',
      format: 'date-time',
    });
  });
});
