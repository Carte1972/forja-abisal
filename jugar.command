#!/bin/bash
# Lanzador de Forja Abisal para macOS: haz doble clic en este archivo desde Finder.
# La primera vez, macOS puede bloquearlo: clic derecho → Abrir.

# Versión mínima de Node.js (la misma que "engines" en package.json).
MIN_NODE_MAJOR=22
MIN_NODE_MINOR=12
NODE_URL="https://nodejs.org/es/download"

cd "$(dirname "$0")" || exit 1

esperar_tecla() {
  echo
  read -n 1 -s -r -p "Pulsa cualquier tecla para cerrar esta ventana..."
  echo
}

# Desde Finder el PATH puede venir recortado: añadimos las rutas habituales de Node.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "No se ha encontrado Node.js en este equipo."
  echo "Instala Node.js $MIN_NODE_MAJOR.$MIN_NODE_MINOR o superior (versión LTS) desde:"
  echo "  $NODE_URL"
  esperar_tecla
  exit 1
fi

if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>$MIN_NODE_MAJOR||(a===$MIN_NODE_MAJOR&&b>=$MIN_NODE_MINOR)?0:1)"; then
  echo "Tu versión de Node.js ($(node -v)) es demasiado antigua."
  echo "Necesitas Node.js $MIN_NODE_MAJOR.$MIN_NODE_MINOR o superior. Descárgalo desde:"
  echo "  $NODE_URL"
  esperar_tecla
  exit 1
fi

node scripts/launcher.mjs "$@"
status=$?
if [ $status -ne 0 ]; then
  echo
  echo "El juego se ha cerrado por un error (código $status)."
  esperar_tecla
fi
exit $status
