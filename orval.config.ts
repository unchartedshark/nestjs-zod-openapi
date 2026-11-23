import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: { target: './openapi.json' },
    output: {
      target: './src/generated/api.ts',
      schemas: './src/generated/models',
      mode: 'single',
      client: 'fetch',
      httpClient: 'fetch',
      mock: {
        generators: [
          { type: 'faker', useExamples: true, generateEachHttpStatus: false },
        ],
      },
    },
  },
});
