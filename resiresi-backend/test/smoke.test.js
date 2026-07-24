import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// Minimal smoke tests using built-in node:test + fetch (Node 20+)
// Run: npm test (requires DATABASE_URL to be set)

const app = createApp();
let server;
let baseUrl;

test('setup', async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test('GET /healthz returns 200 or 503', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.ok([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}`);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('GET /openapi.yaml returns 200 with yaml content-type', async () => {
  const res = await fetch(`${baseUrl}/openapi.yaml`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('yaml'));
});

test('GET /docs returns 200 HTML', async () => {
  const res = await fetch(`${baseUrl}/docs`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('html'));
});

test('GET /v1/restaurants needs no credential', async () => {
  const res = await fetch(`${baseUrl}/v1/restaurants`);
  // 200 with a live DB, 500 without one — never 401/403: this origin is open.
  assert.ok([200, 500].includes(res.status), `Expected 200 or 500, got ${res.status}`);
});

test('key-management routes no longer exist', async () => {
  for (const path of ['/v1/restaurants/any/api-keys', '/v1/platform/api-keys']) {
    const res = await fetch(`${baseUrl}${path}`);
    assert.equal(res.status, 404, `${path} should be gone`);
  }
});

test('unknown route returns 404', async () => {
  const res = await fetch(`${baseUrl}/v1/does-not-exist`);
  assert.equal(res.status, 404);
});

test('x-request-id header is always present', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.ok(res.headers.get('x-request-id'));
});

test('teardown', async () => {
  await new Promise((resolve) => server.close(resolve));
});
