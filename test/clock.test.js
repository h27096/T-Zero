import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, restore, transition, manualValue, clockParts, parseLaunch, launchInput, MAX_DURATION } from '../clock.js';

test('countdown crosses T− to T+ only at the deadline', () => {
  assert.equal(clockParts(-1).sign, '−');
  assert.equal(clockParts(-1).seconds, '01');
  assert.deepEqual(clockParts(0), { sign: '+', hours: '00', minutes: '00', seconds: '00' });
  assert.equal(clockParts(1999).seconds, '01');
});
test('hours do not wrap after a day', () => {
  assert.equal(clockParts(-100 * 3600_000).hours, '100');
  assert.equal(clockParts(1000 * 3600_000).hours, '1000');
});
test('manual run survives serialization, time away, and launch', () => {
  const state = defaults();
  state.manual = transition(state.manual, 'start', 1000);
  const loaded = restore(JSON.stringify(state));
  assert.equal(manualValue(loaded.manual, 1000 + 600_000 + 5000), 5000);
});
test('hold and resume exclude hold duration, including in T+', () => {
  let m = transition(defaults().manual, 'start', 1000);
  m = transition(m, 'hold', 2500);
  assert.equal(manualValue(m, 1e8), -598500);
  m = transition(m, 'start', 10000);
  assert.equal(manualValue(m, 608500), 0);
  m = transition(m, 'hold', 610000);
  assert.equal(manualValue(m, 1e8), 1500);
  m = transition(m, 'start', 1e8);
  assert.equal(manualValue(m, 1e8 + 500), 2000);
  m = transition(m, 'reset', 1e8);
  assert.equal(m.phase, 'ready'); assert.equal(m.value, -600000); assert.equal(m.anchor, null);
});
test('start is idempotent and ready cannot be held', () => {
  const ready = defaults().manual;
  assert.deepEqual(transition(ready, 'hold', 100), ready);
  const running = transition(ready, 'start', 100);
  assert.deepEqual(transition(running, 'start', 300), running);
});
test('zero duration starts as elapsed and maximum duration formats correctly', () => {
  const m = transition({ duration: 0, value: 0, anchor: null, phase: 'ready' }, 'start', 100);
  assert.equal(manualValue(m, 1100), 1000);
  assert.deepEqual(clockParts(-MAX_DURATION), { sign: '−', hours: '999', minutes: '59', seconds: '59' });
});
test('malformed or incompatible persistence safely resets', () => {
  for (const raw of [null, '{', '{}', 'null', JSON.stringify({ ...defaults(), version: 2 }),
    JSON.stringify({ ...defaults(), manual: { ...defaults().manual, duration: -1 } }),
    JSON.stringify({ ...defaults(), manual: { ...defaults().manual, phase: 'running', anchor: null } })]) {
    assert.deepEqual(restore(raw), defaults());
  }
});
test('exact launch is stored as an absolute instant across reload', () => {
  const target = parseLaunch('2030-07-20T20:17:40', 'utc');
  const state = restore(JSON.stringify({ ...defaults(), mode: 'exact', target }));
  assert.equal(state.target, Date.parse('2030-07-20T20:17:40Z'));
  assert.equal(clockParts(target - 1000 - state.target).sign, '−');
  assert.equal(clockParts(target + 1000 - state.target).sign, '+');
});
test('date parsing rejects invalid dates and round trips UTC and local', () => {
  assert.equal(parseLaunch('2030-02-30T12:00', 'utc'), null);
  assert.equal(parseLaunch('', 'local'), null);
  assert.equal(parseLaunch('garbage', 'utc'), null);
  for (const zone of ['local', 'utc']) {
    const value = parseLaunch('2030-07-20T20:17:40', zone);
    assert.equal(launchInput(value, zone), '2030-07-20T20:17:40');
  }
});
