// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { buildHasExamples } from '@/ui/vite-examples';

let root: string;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'vite-examples-'));
    vi.stubEnv('APP_ENV', undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
});

test.each([
    ['local', true],
    ['testing', true],
    ['production', false],
    ['staging', false],
])('a build with APP_ENV=%s in .env has the examples: %s', (env, has) => {
    writeFileSync(join(root, '.env'), `APP_NAME=Laravel\nAPP_ENV=${env}\n`);

    expect(buildHasExamples(root)).toBe(has);
});

test('APP_ENV on the command line wins over .env', () => {
    writeFileSync(join(root, '.env'), 'APP_ENV=local\n');
    vi.stubEnv('APP_ENV', 'production');

    expect(buildHasExamples(root)).toBe(false);
});

// Laravel reads no APP_ENV as production.
test('a build with no APP_ENV has no examples', () => {
    expect(buildHasExamples(root)).toBe(false);
});
