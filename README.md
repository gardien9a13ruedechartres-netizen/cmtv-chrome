# Lecteur Vercel AmazingTier et WideIPTV

AmazingTier utilise le lecteur officiel dans une iframe avec `sandbox="allow-scripts allow-forms"`. Les pop-ups, téléchargements et navigations de la page principale ne sont pas autorisés. Ce sandbox ne garantit pas de supprimer les publicités affichées à l’intérieur de la vidéo ou du lecteur. Le fournisseur gère le renouvellement des flux : aucun PC local ni extension ne sont nécessaires.

WideIPTV conserve le lecteur HLS et `/api/wideiptv`. L’ancien `/api/stream` AmazingTier reste présent pour compatibilité, mais les pages AmazingTier ne l’appellent plus : la récupération serveur reçoit actuellement un défi Cloudflare.

Exemple : https://cmtv-chrome-publish.vercel.app/?channel=cmtv

Validation : `node --test`, correspondance des15chaînes et sandbox ; lecture réelle Chrome vérifiée pour CMTV, RTP1 et TVI.
