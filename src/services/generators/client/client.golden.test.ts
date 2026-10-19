import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import { generateClient } from './client';

// fileURLToPath: a `new URL('./x', import.meta.url)` whose path contains %20 fails readFileSync here.
const golden = (name: string): string =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '__golden__', name), 'utf8');

const expectGolden = (
  name: string,
  recipe: RecipeId,
  fn: string,
  method: HttpMethod | null,
  language: ClientLanguage,
  slug: string,
): void => {
  expect(generateClient({ slug, recipe, fn, method, language })).toBe(golden(name));
};

describe('fetch', () => {
  it('fetch-r1-get', () => {
    expectGolden('fetch-r1-get.js.txt', 'R1', 'get', 'GET', 'fetch', 'read-contacts');
  });

  it('fetch-r2-post', () => {
    expectGolden('fetch-r2-post.js.txt', 'R2', 'post', 'POST', 'fetch', 'validate-request');
  });

  it('fetch-r4-get', () => {
    expectGolden('fetch-r4-get.js.txt', 'R4', 'get', 'GET', 'fetch', 'dataverse-crud');
  });

  it('fetch-r4-put', () => {
    expectGolden('fetch-r4-put.js.txt', 'R4', 'put', 'PUT', 'fetch', 'dataverse-crud');
  });

  it('fetch-r5-del', () => {
    expectGolden('fetch-r5-del.js.txt', 'R5', 'del', 'DELETE', 'fetch', 'external-service');
  });
});

describe('jquery', () => {
  it('jquery-r1-get', () => {
    expectGolden('jquery-r1-get.js.txt', 'R1', 'get', 'GET', 'jquery', 'read-contacts');
  });

  it('jquery-r2-post', () => {
    expectGolden('jquery-r2-post.js.txt', 'R2', 'post', 'POST', 'jquery', 'validate-request');
  });

  it('jquery-r4-del', () => {
    expectGolden('jquery-r4-del.js.txt', 'R4', 'del', 'DELETE', 'jquery', 'dataverse-crud');
  });

  it('jquery-r10-patch', () => {
    expectGolden('jquery-r10-patch.js.txt', 'R10', 'patch', 'PATCH', 'jquery', 'custom-api');
  });
});
