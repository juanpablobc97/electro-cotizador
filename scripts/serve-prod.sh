#!/usr/bin/env bash
# Inicia la app en modo produccion y la reinicia automaticamente si se cae.
# Uso: bash scripts/serve-prod.sh   (o:  npm run serve  que ademas compila antes)

set -u

HOST="0.0.0.0"
PORT="3000"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR" || exit 1

echo "Iniciando servidor de produccion en http://$HOST:$PORT"
echo "Para detenerlo: presiona Ctrl+C"

# Si no existe el build, lo generamos.
if [ ! -d ".next" ]; then
  echo "No hay build previo. Compilando..."
  npm run build || { echo "Fallo la compilacion"; exit 1; }
fi

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Arrancando Next.js..."
  npx next start -H "$HOST" -p "$PORT"
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] El servidor termino (codigo $EXIT_CODE). Reiniciando en 2s..."
  sleep 2
done
