import assert from 'node:assert/strict';
import test from 'node:test';
import { extractWideIptvMasterUrl } from '../api/wideiptv.js';

test('extrait le master WideIPTV avec le chemin SPTPlus', () => {
  const html = 'streamUrl: "https://ds164.bluetier.top/SPTPlus/index.m3u8?token=abc%3D.def"';
  assert.equal(
    extractWideIptvMasterUrl(html, 'SPTPlus'),
    'https://ds164.bluetier.top/SPTPlus/index.m3u8?token=abc%3D.def'
  );
});

test('rejette un autre hote WideIPTV', () => {
  assert.throws(() =>
    extractWideIptvMasterUrl('streamUrl: "https://example.com/SPORTING/index.m3u8?token=abc"')
  );
});
