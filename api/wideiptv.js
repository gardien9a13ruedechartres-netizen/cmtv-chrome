const WIDEIPTV_ORIGIN = 'https://wideiptv.top';
const DEFAULT_STREAM_HOST = 'ds164.bluetier.top';
const REFRESH_URL = `${WIDEIPTV_ORIGIN}/api/refresh_token.php`;
const MAX_SOURCE_SIZE = 1_000_000;

// Keep this resolver closed to the WideIPTV entries configured in the player.
const CHANNELS = Object.freeze({
  btv1: 'BTV1',
  tf1fr: 'TF1FR',
  canalplfr: 'CANALPLFR',
  beinsport1fr: 'BEINSPORT1FR',
  beinsport2fr: 'BEINSPORT2FR',
  beinsport3fr: 'BEINSPORT3FR',
  sptplus: 'SPTPlus',
  spt1: 'SPT1',
  spt2: 'SPT2',
  spt3: 'SPT3',
  spt4: 'SPT4',
  spt5: 'SPT5',
  footplusfr: 'FOOTPLUSFR',
  euro1pt: 'EURO1PT',
  euro2pt: 'EURO2PT',
  abola: 'ABOLA',
  eleven1: 'ELEVEN1',
  eleven2: 'ELEVEN2',
  eleven3: 'ELEVEN3',
  eleven4: 'ELEVEN4',
  eleven5: 'ELEVEN5',
  sporting: 'SPORTING',
  portocanal: 'PortoCanal',
  canal11: 'Canal11',
  m6fr: 'M6FR',
  cnewsfr: 'CNEWSFR',
  canals360: 'CANALS360',
  canalsportfr: 'CANALSPORTFR',
  euro1fr: 'Euro1FR',
  euro2fr: 'Euro2FR',
  rmcsport1fr: 'RMCSPORT1FR',
  rmcsport2fr: 'RMCSPORT2FR',
  er1fr: 'ER1FR',
  canalpldocs: 'CANALPLDOCS'
});

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store, no-cache, must-revalidate',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function resolveChannel(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return CHANNELS[key] || '';
}

function decodeSourceString(value) {
  return String(value || '')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/&amp;/gi, '&');
}

function parseStreamUrl(html, channel) {
  const normalized = String(html || '').replace(/\\\//g, '/').replace(/&amp;/gi, '&');
  const match = normalized.match(/streamUrl\s*:\s*["']((?:\\.|[^"'])+)["']/i);
  if (!match?.[1]) throw new Error('Master WideIPTV introuvable.');

  const url = new URL(decodeSourceString(match[1]));
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== DEFAULT_STREAM_HOST ||
    pathParts.length !== 2 ||
    pathParts[0].toLowerCase() !== channel.toLowerCase() ||
    pathParts[1].toLowerCase() !== 'index.m3u8' ||
    !url.searchParams.has('token')
  ) {
    throw new Error('Master WideIPTV invalide.');
  }
  return url;
}

export function extractWideIptvMasterUrl(html, channel = 'SPORTING') {
  const canonical = resolveChannel(channel) || channel;
  return parseStreamUrl(html, canonical).href;
}

async function fetchSourcePage(channel) {
  const response = await fetch(`${WIDEIPTV_ORIGIN}/player/${encodeURIComponent(channel)}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
      origin: WIDEIPTV_ORIGIN,
      referer: `${WIDEIPTV_ORIGIN}/`,
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
  return html;
}

async function refreshToken(channel, currentToken) {
  if (!currentToken) return '';
  const response = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: WIDEIPTV_ORIGIN,
      referer: `${WIDEIPTV_ORIGIN}/player/${encodeURIComponent(channel)}`,
      'user-agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({ channel, current_token: currentToken }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) return '';
  const data = await response.json().catch(() => null);
  return data?.success && typeof data.token === 'string' && data.token ? data.token : '';
}

async function fetchCurrentMaster(channel) {
  let lastError = new Error('WideIPTV master unavailable');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const html = await fetchSourcePage(channel);
      const master = parseStreamUrl(html, channel);
      const tokenMatch = html.match(/currentToken\s*:\s*["']([^"']+)["']/i);
      if (tokenMatch?.[1]) {
        const token = await refreshToken(channel, tokenMatch[1]);
        if (token) {
          master.search = '';
          master.searchParams.set('token', token);
        }
      }

      const response = await fetch(master.href, {
        headers: {
          accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*',
          origin: WIDEIPTV_ORIGIN,
          referer: `${WIDEIPTV_ORIGIN}/player/${encodeURIComponent(channel)}`,
          'user-agent': 'Mozilla/5.0'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(7000)
      });
      const contentType = String(response.headers.get('content-type') || '');
      const text = await response.text();
      if (!response.ok || !/mpegurl|m3u8/i.test(contentType) || !text.trimStart().startsWith('#EXTM3U')) {
        throw new Error(`WideIPTV master ${response.status}`);
      }
      return master.href;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError;
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return jsonResponse({ ok: true });

    const requestUrl = new URL(request.url);
    const channel = resolveChannel(requestUrl.searchParams.get('channel'));
    if (!channel) return jsonResponse({ ok: false, error: 'Chaine WideIPTV non autorisee.' }, 400);

    try {
      const url = await fetchCurrentMaster(channel);
      return jsonResponse({
        ok: true,
        channel,
        url,
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(JSON.stringify({
        event: 'wideiptv_lookup_failed',
        channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
      return jsonResponse({ ok: false, error: 'Flux WideIPTV temporairement indisponible.' }, 502);
    }
  }
};
