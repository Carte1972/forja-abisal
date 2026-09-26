#!/usr/bin/env bash
# Lanzador de Forja Abisal para Linux: ejecútalo con ./jugar.sh o con doble clic
# ("Ejecutar" o "Ejecutar en terminal", según el gestor de archivos).
# Toda la lógica está en scripts/node_portable.sh (Node.js) y scripts/launcher.mjs (el juego).

cd "$(dirname "$0")" || exit 1

# Con doble clic puede no haber terminal: se abre una para ver la URL y poder cerrar el juego.
if [ ! -t 1 ] && [ -z "$FORJA_IN_TERMINAL" ]; then
  export FORJA_IN_TERMINAL=1
  self="$PWD/$(basename "$0")"
  for term in x-terminal-emulator gnome-terminal konsole xfce4-terminal xterm; do
    command -v "$term" >/dev/null 2>&1 || continue
    case "$term" in
      gnome-terminal) exec "$term" -- "$self" "$@" ;;
      xfce4-terminal) exec "$term" -x "$self" "$@" ;;
      *) exec "$term" -e "$self" "$@" ;;
    esac
  done
fi

if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

# shellcheck source=scripts/node_portable.sh
. scripts/node_portable.sh
forja_run "$@"
