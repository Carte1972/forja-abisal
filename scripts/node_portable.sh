#!/bin/bash
# Funciones comunes de jugar.command (macOS) y jugar.sh (Linux). No se ejecuta sola: se carga
# con `source` desde el lanzador, que ya debe estar en la carpeta del proyecto.
#
# forja_prepare_node deja en el PATH un Node.js válido:
#   1. El del sistema, si cumple la versión mínima de package.json.
#   2. Si no, la copia portátil de .forja_node/ (descargada en una ejecución anterior).
#   3. Si no la hay, descarga la versión LTS oficial de nodejs.org, comprueba su suma SHA-256
#      y la descomprime en .forja_node/. No necesita administrador ni toca nada fuera del juego.
# Con FORJA_FORCE_PORTABLE=1 se ignora el Node del sistema (sirve para probar la descarga).

# Rama LTS que se descarga. Se actualiza sola dentro de la rama (parches de seguridad).
FORJA_NODE_BRANCH="latest-v22.x"
FORJA_NODE_DIST="https://nodejs.org/dist/$FORJA_NODE_BRANCH"
FORJA_NODE_URL="https://nodejs.org/es/download"
FORJA_NODE_DIR="$PWD/.forja_node"

forja_node_ok() {
  "$1" scripts/check_node.cjs >/dev/null 2>&1
}

forja_fetch() {
  # forja_fetch URL DESTINO [progreso]
  if command -v curl >/dev/null 2>&1; then
    if [ -n "$3" ]; then
      curl -fL --retry 2 --progress-bar -o "$2" "$1"
    else
      curl -fsSL --retry 2 -o "$2" "$1"
    fi
  elif command -v wget >/dev/null 2>&1; then
    if [ -n "$3" ]; then wget -q --show-progress -O "$2" "$1"; else wget -q -O "$2" "$1"; fi
  else
    echo "No se ha encontrado curl ni wget para descargar Node.js."
    return 1
  fi
}

forja_sha256() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d ' ' -f 1
  else
    sha256sum "$1" | cut -d ' ' -f 1
  fi
}

forja_download_node() {
  local os arch sums line expected file work actual
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *)
      echo "Sistema no compatible para descargar Node.js: $(uname -s)."
      return 1
      ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch="x64" ;;
    arm64 | aarch64) arch="arm64" ;;
    *)
      echo "Procesador no compatible para descargar Node.js: $(uname -m)."
      return 1
      ;;
  esac

  work="$(mktemp -d "${TMPDIR:-/tmp}/forja_node.XXXXXX")" || return 1
  sums="$work/SHASUMS256.txt"
  echo "Descargando Node.js desde nodejs.org (solo esta vez)…"
  if ! forja_fetch "$FORJA_NODE_DIST/SHASUMS256.txt" "$sums"; then
    rm -rf "$work"
    return 1
  fi
  line="$(grep -E "  node-v[0-9.]+-$os-$arch\.tar\.gz$" "$sums" | head -n 1)"
  if [ -z "$line" ]; then
    echo "nodejs.org no ofrece Node.js para $os-$arch."
    rm -rf "$work"
    return 1
  fi
  expected="${line%% *}"
  file="${line##* }"

  echo "  $file"
  if ! forja_fetch "$FORJA_NODE_DIST/$file" "$work/$file" progress; then
    rm -rf "$work"
    return 1
  fi
  actual="$(forja_sha256 "$work/$file")"
  if [ "$actual" != "$expected" ]; then
    echo "La descarga de Node.js está dañada (la suma SHA-256 no coincide). Vuelve a intentarlo."
    rm -rf "$work"
    return 1
  fi

  mkdir -p "$work/node"
  if ! tar -xzf "$work/$file" -C "$work/node" --strip-components 1; then
    echo "No se ha podido descomprimir Node.js."
    rm -rf "$work"
    return 1
  fi
  rm -rf "$FORJA_NODE_DIR"
  mv "$work/node" "$FORJA_NODE_DIR"
  rm -rf "$work"
  echo "Node.js $("$FORJA_NODE_DIR/bin/node" -v) listo en .forja_node/."
  echo
}

forja_prepare_node() {
  if [ "$FORJA_FORCE_PORTABLE" != "1" ] && command -v node >/dev/null 2>&1 &&
    command -v npm >/dev/null 2>&1 && forja_node_ok node; then
    return 0
  fi

  if [ "$FORJA_FORCE_PORTABLE" != "1" ] && command -v node >/dev/null 2>&1; then
    echo "Tu Node.js ($(node -v)) es demasiado antiguo para el juego."
  elif [ "$FORJA_FORCE_PORTABLE" != "1" ]; then
    echo "No se ha encontrado Node.js en este equipo."
  fi

  if ! [ -x "$FORJA_NODE_DIR/bin/node" ] || ! forja_node_ok "$FORJA_NODE_DIR/bin/node"; then
    echo "Se usará una copia de Node.js solo para el juego, dentro de su carpeta."
    if ! forja_download_node || ! forja_node_ok "$FORJA_NODE_DIR/bin/node"; then
      echo
      echo "No se ha podido preparar Node.js automáticamente."
      echo "Comprueba tu conexión a internet y vuelve a abrir el lanzador, o bien"
      echo "instala Node.js $(forja_min_version) o superior (versión LTS) desde:"
      echo "  $FORJA_NODE_URL"
      return 1
    fi
  fi
  export PATH="$FORJA_NODE_DIR/bin:$PATH"
}

forja_min_version() {
  sed -n 's/.*"node": *">=\([0-9]*\.[0-9]*\).*/\1/p' package.json
}

forja_wait_key() {
  echo
  read -n 1 -s -r -p "Pulsa cualquier tecla para cerrar esta ventana..."
  echo
}

# Arranca el juego con el Node preparado; si falla, deja la ventana abierta para leer el error.
forja_run() {
  if ! forja_prepare_node; then
    forja_wait_key
    return 1
  fi
  node scripts/launcher.mjs "$@"
  local status=$?
  if [ $status -ne 0 ]; then
    echo
    echo "El juego se ha cerrado por un error (código $status)."
    forja_wait_key
  fi
  return $status
}
