(() => {
  const AMAZINGTIER_PLAYER_CHANNELS = Object.freeze({
    cmtvpt: 'CMTVPT', rtp1: 'RTP1', rtp2: 'RTP2', rtpafrica: 'RTPAfrica',
    rtp3: 'RTP3', tvi: 'TVI', 'tvi-int': 'TVI-INT', tvireality: 'TVIReality',
    'tvi-ficcao': 'TVI_Ficcao', vplustvi: 'VPlusTVI', recordeuropa: 'RecordEuropa',
    sic: 'SIC', 'sic-noticias': 'SIC-NOTICIAS', 'tcv-int': 'TCV-INT', 'cnn-pt': 'CNN-PT'
  });
  const AMAZINGTIER_CHANNELS = new Set([
    'cmtvpt', 'rtp1', 'rtp2', 'rtpafrica', 'rtp3', 'tvi', 'tvi-int',
    'tvireality', 'tvi-ficcao', 'vplustvi', 'recordeuropa', 'sic',
    'sic-noticias', 'tcv-int', 'cnn-pt'
  ]);
  const WIDEIPTV_PLAYER_CHANNELS = Object.freeze({
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
  const WIDEIPTV_CHANNELS = new Set([
    'btv1', 'tf1fr', 'canalplfr', 'beinsport1fr', 'beinsport2fr',
    'beinsport3fr', 'sptplus', 'spt1', 'spt2', 'spt3', 'spt4', 'spt5',
    'footplusfr', 'euro1pt', 'euro2pt', 'abola', 'eleven1', 'eleven2',
    'eleven3', 'eleven4', 'eleven5', 'sporting', 'portocanal', 'canal11',
    'm6fr', 'cnewsfr', 'canals360', 'canalsportfr', 'euro1fr', 'euro2fr',
    'rmcsport1fr', 'rmcsport2fr', 'er1fr', 'canalpldocs'
  ]);
  const CHANNEL_ALIASES = Object.freeze({
    cmtv: 'cmtvpt', rtpa: 'rtpafrica', 'rtp-africa': 'rtpafrica',
    'tvi-reality': 'tvireality', tvificcao: 'tvi-ficcao', tvi_ficcao: 'tvi-ficcao',
    'v-plus-tvi': 'vplustvi', record: 'recordeuropa', sicnoticias: 'sic-noticias',
    tcvint: 'tcv-int', cnnpt: 'cnn-pt', 'cnn-portugal': 'cnn-pt'
  });
  const NORMAL_REFRESH_MS = 120000;
  const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000, 30000, 60000];

  const video = document.getElementById('video');
  const panel = document.getElementById('panel');
  const status = document.getElementById('status');
  const playButton = document.getElementById('play');
  let hls = null;
  let currentUrl = '';
  let refreshPromise = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let panelTimer = null;

  const requested = new URLSearchParams(location.search).get('channel') || 'cmtvpt';
  const normalized = requested.trim().toLowerCase();
  const channel = CHANNEL_ALIASES[normalized] || normalized;
  const apiPath = AMAZINGTIER_CHANNELS.has(channel)
    ? `/api/stream?channel=${encodeURIComponent(channel)}`
    : WIDEIPTV_CHANNELS.has(channel)
      ? `/api/wideiptv?channel=${encodeURIComponent(channel)}`
      : '';

  document.title = `${channel.toUpperCase()} — TV en direct`;

  if (AMAZINGTIER_CHANNELS.has(channel) || WIDEIPTV_CHANNELS.has(channel)) {
    const frame = document.createElement('iframe');
    const provider = AMAZINGTIER_CHANNELS.has(channel) ? 'AmazingTier' : 'WideIPTV';
    frame.title = `${channel.toUpperCase()} — ${provider}`;
    frame.setAttribute('sandbox', 'allow-scripts allow-forms');
    frame.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
    frame.setAttribute('allowfullscreen', '');
    frame.referrerPolicy = 'no-referrer';
    const origin = AMAZINGTIER_CHANNELS.has(channel) ? 'https://amazingtier.top' : 'https://wideiptv.top';
    const providerChannel = AMAZINGTIER_PLAYER_CHANNELS[channel] || WIDEIPTV_PLAYER_CHANNELS[channel];
    frame.src = `${origin}/player/${encodeURIComponent(providerChannel)}`;
    video.hidden = true;
    panel.classList.add('hidden');
    document.querySelector('main').appendChild(frame);
    return;
  }

  function show(message) {
    if (panelTimer) clearTimeout(panelTimer);
    status.textContent = message;
    panel.classList.remove('hidden');
  }

  function hidePanelSoon() {
    if (panelTimer) clearTimeout(panelTimer);
    panelTimer = setTimeout(() => panel.classList.add('hidden'), 1500);
  }

  function resetRecovery() {
    retryAttempt = 0;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }

  function scheduleRecovery() {
    if (retryTimer) return;
    const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
    retryAttempt += 1;
    show(`Reconnexion dans ${Math.ceil(delay / 1000)} s…`);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      refresh(true);
    }, delay);
  }

  async function play() {
    try {
      await video.play();
      panel.classList.add('hidden');
    } catch {
      show('Clique sur le bouton pour lancer la lecture.');
    }
  }

  function ensureHls() {
    if (hls) return hls;
    hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      resetRecovery();
      play();
    });
    hls.on(Hls.Events.ERROR, (_event, details) => {
      if (!details?.fatal) return;
      if (details.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else if (details.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      }
      scheduleRecovery();
    });
    return hls;
  }

  async function doRefresh(forceReload = false) {
    try {
      if (!apiPath) throw new Error(`Chaîne inconnue : ${requested}`);
      const response = await fetch(apiPath, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Flux indisponible');

      if (forceReload || data.url !== currentUrl) {
        currentUrl = data.url;
        if (window.Hls && Hls.isSupported()) {
          ensureHls().loadSource(currentUrl);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = currentUrl;
          await play();
        } else {
          throw new Error('HLS non pris en charge par ce navigateur.');
        }
      }
      show('Flux actualisé avec succès.');
      hidePanelSoon();
    } catch (error) {
      if (video.readyState < 2) {
        show(error instanceof Error ? error.message : 'Flux indisponible');
      }
      scheduleRecovery();
    }
  }

  function refresh(forceReload = false) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = doRefresh(forceReload).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  playButton.addEventListener('click', play);
  video.addEventListener('playing', resetRecovery);
  video.addEventListener('error', scheduleRecovery);
  video.addEventListener('stalled', scheduleRecovery);
  window.addEventListener('online', () => refresh(true));
  refresh();
  setInterval(refresh, NORMAL_REFRESH_MS);
})();

