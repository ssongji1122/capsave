import test from 'node:test';
import assert from 'node:assert/strict';
import { connectNativeNavigation } from '../native-navigation.js';

function setup(hash = '') {
  const events = {};
  const removed = [];
  const location = { hash };
  const errors = [];
  let closes = 0;
  let busy = false;
  const disconnect = connectNativeNavigation({
    addEventListener(name, handlers) {
      events[name] = handlers;
      return () => removed.push(name);
    },
  }, { location, isBusy: () => busy, close: async () => { closes++; }, onError: error => errors.push(error) });
  return { events, location, errors, removed, disconnect, closes: () => closes, setBusy: value => { busy = value; } };
}

test('native back returns from an editor to the archive', async () => {
  const state = setup('#new');
  await state.events.backEvent.onEvent();
  assert.equal(state.location.hash, '');
  assert.equal(state.closes(), 0);
});

test('native back on archive closes the miniapp', async () => {
  const state = setup();
  await state.events.backEvent.onEvent();
  assert.equal(state.closes(), 1);
});

test('native home opens archive and navigation waits for a pending save', async () => {
  const state = setup('#capture/example');
  state.setBusy(true);
  await state.events.backEvent.onEvent();
  await state.events.homeEvent.onEvent();
  assert.equal(state.location.hash, '#capture/example');
  assert.equal(state.closes(), 0);
  state.setBusy(false);
  await state.events.homeEvent.onEvent();
  assert.equal(state.location.hash, '');
  assert.equal(state.closes(), 0);
});

test('navigation reports bridge errors and removes both listeners', async () => {
  const state = setup();
  const failure = new Error('bridge unavailable');
  state.events.backEvent.onError(failure);
  assert.deepEqual(state.errors, [failure]);
  state.disconnect();
  assert.deepEqual(state.removed.sort(), ['backEvent', 'homeEvent']);
  const errors = [];
  let onBack;
  connectNativeNavigation({ addEventListener(name, handlers) { if (name === 'backEvent') onBack = handlers.onEvent; return () => {}; } }, {
    location: { hash: '' }, isBusy: () => false,
    close: async () => { throw failure; }, onError: error => errors.push(error),
  });
  await onBack();
  assert.deepEqual(errors, [failure]);
});
