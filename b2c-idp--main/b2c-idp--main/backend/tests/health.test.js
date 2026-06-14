const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('health endpoint returns ok', async () => {
  const res = await request(app).get('/health').expect(200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, 'ok');
});
