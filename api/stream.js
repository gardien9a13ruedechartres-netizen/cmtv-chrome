const SOURCE_URL = 'https://amazingtier.top/player/CMTVPT';
const EXPECTED_ORIGIN = 'https://simple.amazingtier.top';
const EXPECTED_PATH = '/CMTVPT/index.m3u8';
const MAX_SOURCE_SIZE = 1_000_000;

export function extractMasterUrl(html) {
  const normalized = html.replace(/\\\//g, '/').replace(/&amp;/gi, '&');
  const match = normalized.match(/https:\/\/simple\.amazingtier\.top\/CMTVPT\/index\.m3u8\?[^"'\s<>]+/i);
  if (!match) throw new Error('Master CMTVPT introuvable.');
  const url = new URL(match[0]);
  if (url.origin !== EXPECTED_ORIGIN || url.pathname !== EXPECTED_PATH || !url.searchParams.has('token')) {
    throw new Error('Master CMTVPT invalide.');
  }
  return url.href;
}

async function fetchCurrentMaster() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
      referer: 'https://amazingtier.top/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_SOURCE_SIZE) throw new Error('Source trop volumineuse.');
  const html = await response.text();
  if (html.length > MAX_SOURCE_SIZE) throw new Error('Source trop volumineuse.');
  return extractMasterUrl(html);
}

export default {
  async fetch() {
    try {
      const url = await fetchCurrentMaster();
      return Response.json({ ok: true, url, checkedAt: new Date().toISOString() }, {
        headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
      });
    } catch (error) {
      console.error(JSON.stringify({ event: 'stream_lookup_failed', error: error instanceof Error ? error.message : 'Erreur inconnue' }));
      return Response.json({ ok: false, error: 'Flux temporairement indisponible.' }, {
        status: 502,
        headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
      });
    }
  }
};

