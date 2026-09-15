const AMAZINGTIER_PLAYER_ORIGIN = 'https://amazingtier.top';
const AMAZINGTIER_STREAM_ORIGIN = 'https://simple.amazingtier.top';
const AMAZINGTIER_REFRESH_URL = `${AMAZINGTIER_PLAYER_ORIGIN}/api/refresh_token.php`;
const MAX_SOURCE_SIZE = 1_000_000;

// Keep the resolver closed to the channels already configured in the player.
const CHANNEL_ALIASES = Object.freeze({
  cmtv: 'CMTVPT',
  cmtvpt: 'CMTVPT',
  rtp1: 'RTP1',
  rtp2: 'RTP2',
  'rtp-africa': 'RTPAfrica',
  rtpa: 'RTPAfrica',
  rtpafrica: 'RTPAfrica',
  rtp3: 'RTP3',
  tvi: 'TVI',
  'tvi-int': 'TVI-INT',
  'tvi-internacional': 'TVI-INT',
  'tvi-reality': 'TVIReality',
  tvireality: 'TVIReality',
  'tvi-ficcao': 'TVI_Ficcao',
  tvificcao: 'TVI_Ficcao',
  tvi_ficcao: 'TVI_Ficcao',
  'v-plus-tvi': 'VPlusTVI',
  vplustvi: 'VPlusTVI',
  record: 'RecordEuropa',
  recordeuropa: 'RecordEuropa',
  sic: 'SIC',
  'sic-noticias': 'SIC-NOTICIAS',
  sicnoticias: 'SIC-NOTICIAS',
  'tcv-int': 'TCV-INT',
  tcvint: 'TCV-INT',
  'cnn-portugal': 'CNN-PT',
  'cnn-pt': 'CNN-PT',
  cnnpt: 'CNN-PT'
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
  const key = String(value || 'cmtvpt').trim().toLowerCase();
  return CHANNEL_ALIASES[key] || '';
}

function decodeSourceString(value) {
  return String(value || '')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/&amp;/gi, '&');
}

function parseMasterUrl(html, channel) {
  const normalized = String(html || '').replace(/\\\//g, '/').replace(/&amp;/gi, '&');
  const streamMatch = normalized.match(/streamUrl\s*:\s*["']((?:\\.|[^"'])+)["']/i);
  const fallbackMatch = normalized.match(/https:\/\/simple\.amazingtier\.top\/[^"'\s<>]+/i);
  const rawUrl = streamMatch?.[1] || fallbackMatch?.[0] || '';
  if (!rawUrl) throw new Error('Master AmazingTier introuvable.');

  const url = new URL(decodeSourceString(rawUrl));
  const expectedPath = `/${channel}/index.m3u8`;
  if (
    url.origin !== AMAZINGTIER_STREAM_ORIGIN ||
    url.pathname !== expectedPath ||
    !url.searchParams.has('token')
  ) {
    throw new Error('Master AmazingTier invalide.');
  }
  return url;
}

export function extractMasterUrl(html, channel = 'CMTVPT') {
  return parseMasterUrl(html, channel).href;
}

async function fetchSourcePage(channel) {
  const response = await fetch(`${AMAZINGTIER_PLAYER_ORIGIN}/player/${encodeURIComponent(channel)}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
      referer: `${AMAZINGTIER_PLAYER_ORIGIN}/`,
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
  const response = await fetch(AMAZINGTIER_REFRESH_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: AMAZINGTIER_PLAYER_ORIGIN,
      referer: `${AMAZINGTIER_PLAYER_ORIGIN}/player/${encodeURIComponent(channel)}`,
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
  let lastError = new Error('AmazingTier master unavailable');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const html = await fetchSourcePage(channel);
      const master = parseMasterUrl(html, channel);
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
          referer: `${AMAZINGTIER_PLAYER_ORIGIN}/player/${encodeURIComponent(channel)}`,
          'user-agent': 'Mozilla/5.0'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(5000)
      });
      const contentType = String(response.headers.get('content-type') || '');
      const text = await response.text();
      if (!response.ok || !/mpegurl|m3u8/i.test(contentType) || !text.trimStart().startsWith('#EXTM3U')) {
        throw new Error(`AmazingTier master ${response.status}`);
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
    if (!channel) return jsonResponse({ ok: false, error: 'Chaîne AmazingTier non autorisée.' }, 400);

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
        event: 'stream_lookup_failed',
        channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
      return jsonResponse({ ok: false, error: 'Flux temporairement indisponible.' }, 502);
    }
  }
};
