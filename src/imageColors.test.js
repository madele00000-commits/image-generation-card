import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePalette } from './imageColors.js';

test('keeps distinct warm and cool regions rather than making one muddy color', () => {
  const pixels = new Uint8ClampedArray(6 * 6 * 4);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      pixels.set(x < 2 ? [230, 120, 40, 255] : [30, 150, 220, 255], (y * 6 + x) * 4);
    }
  }
  const colors = samplePalette(pixels, 6, 6);
  assert.deepEqual(colors[0], [230, 120, 40]);
  assert.deepEqual(colors[2], [30, 150, 220]);
  assert.notDeepEqual(colors[0], colors[2]);
});

test('transparent black does not darken the detected image colors', () => {
  const colors = samplePalette(new Uint8ClampedArray([220, 100, 40, 255, 0, 0, 0, 0]), 2, 1, 1, 1);
  assert.deepEqual(colors, [[220, 100, 40]]);
});

test('fully transparent images leave the selected loading color available as fallback', () => {
  assert.equal(samplePalette(new Uint8ClampedArray(4 * 4 * 4), 4, 4), null);
});

test('tiny images and empty spatial cells retain the available image color', () => {
  assert.deepEqual(samplePalette(new Uint8ClampedArray([180, 70, 30, 255]), 1, 1),
    Array.from({ length: 9 }, () => [180, 70, 30]));
});
