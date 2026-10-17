import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHeroData, differences, heroId, normalizeMatrix, parseMatrix, sourceUpdated } from './overpicker.mjs';

const roster = { heroes: [
  { id: 'dva', role: 'tank' }, { id: 'soldier76', role: 'damage' }, { id: 'lucio', role: 'support' },
] };
const matrix = () => ({
  'D.Va': { 'D.Va': 0, 'Soldier: 76': 20, 'Lúcio': -10 },
  'Soldier: 76': { 'D.Va': -20, 'Soldier: 76': 0, 'Lúcio': 10 },
  'Lúcio': { 'D.Va': 10, 'Soldier: 76': 0, 'Lúcio': 0 },
});

test('normalizes punctuation and accents and reads JSON without evaluating source', () => {
  assert.equal(heroId('Soldier: 76'), 'soldier76');
  assert.equal(heroId('Lúcio'), 'lucio');
  assert.deepEqual(parseMatrix(`const counterMatrix = ${JSON.stringify(matrix())};`, 'counterMatrix'), matrix());
  assert.throws(() => parseMatrix('const counterMatrix = {"x": (() => 1)()};', 'counterMatrix'));
  assert.throws(() => parseMatrix('<html>unavailable</html>', 'counterMatrix'), /markup changed/);
  assert.equal(sourceUpdated('Last Update: <strong class="a">2026-10-13</strong>'), '2026-10-13');
});

test('imports every positive directional rating into the current role bucket', () => {
  const data = buildHeroData(roster, { counter: matrix(), synergy: matrix() });
  assert.deepEqual(data.dva.strong_against.damage, ['soldier76']);
  assert.deepEqual(data.soldier76.strong_against.tanks, []);
  assert.deepEqual(data.soldier76.strong_against.supports, ['lucio']);
  assert.deepEqual(data.lucio.synergizes_with.tanks, ['dva']);
  assert.deepEqual(data.dva.synergizes_with.supports, []); // no invented reverse link
  assert.deepEqual(data.dva.synergizes_with.tanks, []); // no self link
  const moved = structuredClone(roster);
  moved.heroes[1].role = 'support';
  assert.deepEqual(buildHeroData(moved, { counter: matrix(), synergy: matrix() }).dva.strong_against.supports, ['soldier76']);
});

test('fails on incomplete rows, unknown heroes, normalization collisions, and invalid scores', () => {
  const incomplete = matrix(); delete incomplete['D.Va']['Lúcio'];
  assert.throws(() => normalizeMatrix(incomplete, roster), /Incomplete/);
  const unknown = matrix(); unknown.Unknown = unknown['D.Va'];
  assert.throws(() => normalizeMatrix(unknown, roster), /coverage/);
  const collision = matrix(); collision.DVa = collision['D.Va'];
  assert.throws(() => normalizeMatrix(collision, roster), /coverage/);
  const invalid = matrix(); invalid['D.Va']['Lúcio'] = '20';
  assert.throws(() => normalizeMatrix(invalid, roster), /Invalid/);
});

test('does not cap counter or synergy coverage at three targets', () => {
  const heroes = ['ana', 'baptiste', 'brigitte', 'kiriko', 'lucio', 'mercy'];
  const fullRoster = { heroes: heroes.map(id => ({ id, role: 'support' })) };
  const full = Object.fromEntries(heroes.map(id => [id,
    Object.fromEntries(heroes.map(target => [target, id === target ? 0 : 10])),
  ]));
  const data = buildHeroData(fullRoster, { counter: full, synergy: full });
  assert.equal(data.ana.strong_against.supports.length, 5);
  assert.equal(data.ana.synergizes_with.supports.length, 5);
});

test('drift detection catches extra, missing and reversed links but ignores list order', () => {
  const expected = buildHeroData(roster, { counter: matrix(), synergy: matrix() });
  assert.deepEqual(differences(structuredClone(expected), expected), []);
  const actual = structuredClone(expected);
  actual.dva.strong_against.damage = [];
  actual.soldier76.strong_against.tanks = ['dva'];
  assert.equal(differences(actual, expected).length, 2);
});
