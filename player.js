(() => {
  const AMAZINGTIER_CHANNELS = new Set([
    'cmtvpt', 'rtp1', 'rtp2', 'rtpafrica', 'rtp3', 'tvi', 'tvi-int',
    'tvireality', 'tvi-ficcao', 'vplustvi', 'recordeuropa', 'sic',
    'sic-noticias', 'tcv-int', 'cnn-pt'
  ]);
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

  const video = document.getElementById('video');
  const panel = document.getElementById('panel');
  const status = document.getElementById('status');
  const playButton = document.getElementById('play');
  let hls = null;
  let currentUrl = '';
  const requested = new URLSearchParams(location.search).get('channel') || 'cmtvpt';
  const normalized = requested.trim().toLowerCase();
  const channel = CHANNEL_ALIASES[normalized] || normalized;
  const apiPath = AMAZINGTIER_CHANNELS.has(channel)
    ? `/api/stream?channel=${encodeURIComponent(channel)}`
    : WIDEIPTV_CHANNELS.has(channel)
      ? `/api/wideiptv?channel=${encodeURIComponent(channel)}`
      : '';

  document.title = `${channel.toUpperCase()} — TV en direct`;

  function show(message) {
    status.textContent = message;
    panel.classList.remove('hidden');
  }

  async function play() {
    try {
      await video.play();
      panel.classList.add('hidden');
    } catch {
      show('Clique sur le bouton pour lancer la lecture.');
    }
  }

  async function refresh() {
    try {
      if (!apiPath) throw new Error(`Chaîne inconnue : ${requested}`);
      const response = await fetch(apiPath, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Flux indisponible');

      if (data.url !== currentUrl) {
        currentUrl = data.url;
        if (window.Hls && Hls.isSupported()) {
          if (!hls) {
            hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, play);
            hls.on(Hls.Events.ERROR, (_event, details) => {
              if (details && details.fatal) show('Erreur HLS, nouvelle tentative en cours…');
            });
          }
          hls.loadSource(currentUrl);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = currentUrl;
          await play();
        } else {
          throw new Error('HLS non pris en charge par ce navigateur.');
        }
      }
      show('Flux actualisé avec succès.');
      setTimeout(() => panel.classList.add('hidden'), 1500);
    } catch (error) {
      show(error instanceof Error ? error.message : 'Flux indisponible');
    }
  }

  playButton.addEventListener('click', play);
  refresh();
  setInterval(refresh, 120000);
})();
