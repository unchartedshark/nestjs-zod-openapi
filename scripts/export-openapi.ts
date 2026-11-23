import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/openapi.js';

const app = await NestFactory.create(AppModule, { logger: false });
try {
  const document = configureApp(app);
  await app.init();
  await writeFile('openapi.json', JSON.stringify(document, null, 2) + '\n');
  console.log('Wrote openapi.json (OpenAPI 3.2)');
} finally {
  await app.close();
}
