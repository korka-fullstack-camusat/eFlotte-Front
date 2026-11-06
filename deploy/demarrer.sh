#!/bin/sh
# Démarrage du conteneur front (docker-compose.yml).
#   FRONT_MODE=production (par défaut) : site construit puis servi tel quel (vite preview) ;
#     le code source (/src, /@vite…) n'est PAS publié.
#   FRONT_MODE=dev : serveur de développement avec rechargement à chaud (poste de développement uniquement).
# Port 5175, renvois /api et /telechargements vers VITE_PROXY_TARGET (voir vite.config.ts).
set -e
if [ "${FRONT_MODE:-production}" = "dev" ]; then
  echo "→ Front en mode DÉVELOPPEMENT (code source visible : ne pas utiliser en production)"
  exec npm run dev -- --host 0.0.0.0
fi
# Construction hors du dossier du projet (le dist/ du dépôt n'est pas modifié)
SORTIE=/tmp/eflotte-dist
echo "→ Construction du site (production)…"
VITE_API_URL="${VITE_API_URL:-}" npx vite build --outDir "$SORTIE" --emptyOutDir
echo "→ Site servi sur le port 5175 (fichiers construits uniquement)"
exec npx vite preview --outDir "$SORTIE" --port 5175 --strictPort --host 0.0.0.0
