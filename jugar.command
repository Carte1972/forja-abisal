#!/bin/bash
# Lanzador de Forja Abisal para macOS: haz doble clic en este archivo desde Finder.
# La primera vez, macOS puede bloquearlo: clic derecho → Abrir.
# Toda la lógica está en scripts/node_portable.sh (Node.js) y scripts/launcher.mjs (el juego).

cd "$(dirname "$0")" || exit 1

# Desde Finder el PATH puede venir recortado: añadimos las rutas habituales de Node.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

# shellcheck source=scripts/node_portable.sh
. scripts/node_portable.sh
forja_run "$@"
