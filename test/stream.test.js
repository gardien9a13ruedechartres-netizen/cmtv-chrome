import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMasterUrl } from '../api/stream.js';

test('extrait le master avec des slashs échappés', () => {
  const html = String.raw`streamUrl: "https:\/\/simple.amazingtier.top\/CMTVPT\/index.m3u8?token=abc%3D.def"`;
  assert.equal(extractMasterUrl(html), 'https://simple.amazingtier.top/CMTVPT/index.m3u8?token=abc%3D.def');
});

test('rejette les autres domaines', () => {
  assert.throws(() => extractMasterUrl('https://example.com/CMTVPT/index.m3u8?token=abc'));
});

