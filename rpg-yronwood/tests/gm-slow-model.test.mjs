import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderModels, markSlowModel } from '../pages/api/gm.js';
test('modelo lento vai para o fim', () => {
  assert.deepEqual(orderModels(['a', 'b', 'c']), ['a', 'b', 'c']);
  markSlowModel('a', 60000);
  assert.deepEqual(orderModels(['a', 'b', 'c']), ['b', 'c', 'a']);
  markSlowModel('a', -1);
  assert.deepEqual(orderModels(['a', 'b', 'c']), ['a', 'b', 'c']);
});
