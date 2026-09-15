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

test('le point d’entrée utilise CMTVPT par défaut', async () => {
  const sourceFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/player/CMTVPT')) {
      return new Response(String.raw`streamUrl: "https:\/\/simple.amazingtier.top\/CMTVPT\/index.m3u8?token=abc.def"`);
    }
    if (url.includes('/api/refresh_token.php')) return Response.json({ success: false });
    if (url.includes('/CMTVPT/index.m3u8')) {
      return new Response('#EXTM3U\n#EXT-X-VERSION:3', { headers: { 'content-type': 'application/vnd.apple.mpegurl' } });
    }
    throw new Error(`URL inattendue: ${url}`);
  };

  try {
    const handler = (await import('../api/stream.js')).default;
    const response = await handler.fetch(new Request('https://example.test/api/stream'));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.channel, 'CMTVPT');
    assert.equal(data.ok, true);
  } finally {
    globalThis.fetch = sourceFetch;
  }
});
