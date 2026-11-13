import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainCloudError } from '../lib/cloud-errors.mjs';
test('erros da nuvem viram explicação', () => {
  assert.equal(explainCloudError(new Error('permission_denied')).code, 'PERMISSION_DENIED');
  assert.equal(explainCloudError(Object.assign(new Error('x'), { code: 'PERMISSION_DENIED' })).code, 'PERMISSION_DENIED');
  assert.equal(explainCloudError(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })).code, 'TIMEOUT');
  assert.equal(explainCloudError(new Error('too_big at /x')).code, 'TOO_BIG');
  assert.match(explainCloudError(new Error('algo estranho')).error, /algo estranho/);
});
