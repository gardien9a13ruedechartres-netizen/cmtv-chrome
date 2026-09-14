(() => {
  const video = document.getElementById('video');
  const panel = document.getElementById('panel');
  const status = document.getElementById('status');
  const playButton = document.getElementById('play');
  let hls = null;
  let currentUrl = '';

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
      const response = await fetch('/api/stream', { cache: 'no-store' });
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

