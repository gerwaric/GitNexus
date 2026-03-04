#!/usr/bin/env bash
# Build tree-sitter-cobol WASM for GitNexus Web UI.
# Run from gitnexus-web: ./scripts/build-cobol-wasm.sh
# Or: npm run build:cobol-wasm
# Requires: git, node (and Emscripten for build-wasm: install locally or use amd64 host)
#
# We pin tree-sitter-cli to 0.20.8 so the WASM ABI matches web-tree-sitter 0.20.x.
# Building with a newer CLI can cause "Cannot read properties of undefined (reading 'apply')"
# when the COBOL external scanner runs. See docs/design/cobol-wasm-fix-options.md.
#
# On arm64, the CLI's Docker-based Emscripten is amd64-only and fails with "exec format error".
# On arm64 we use Emscripten installed locally (emcc in PATH); if not found, we print install steps.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$WEB_ROOT/public/wasm/cobol"
REPO_URL="https://github.com/yutaro-sakamoto/tree-sitter-cobol.git"
# Use main; pin to a tag/commit in production if needed
BRANCH="main"
TREE_SITTER_CLI_VERSION="0.20.8"
BUILD_DIR=$(mktemp -d)
BUILD_DIR_ABS=$(cd "$BUILD_DIR" && pwd)
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "Cloning tree-sitter-cobol ($BRANCH)..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$BUILD_DIR"

ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  if ! command -v emcc &>/dev/null; then
    echo ""
    echo "On arm64, Emscripten must be installed locally (Docker amd64 emulation is not used)."
    echo ""
    echo "Install Emscripten (e.g. macOS with Homebrew: brew install emscripten)"
    echo "  or from source: https://emscripten.org/docs/getting_started/downloads.html"
    echo "Then ensure 'emcc' is in your PATH and re-run this script."
    echo ""
    echo "Alternatively, run this script on an amd64 machine or in CI and copy"
    echo "  public/wasm/cobol/tree-sitter-cobol.wasm into this repo."
    exit 1
  fi
  echo "Detected arm64: using local Emscripten ($(command -v emcc))"
fi

cd "$BUILD_DIR"
echo "Building WASM with tree-sitter-cli@${TREE_SITTER_CLI_VERSION} (ABI match for web-tree-sitter 0.20.x)..."
npx -y "tree-sitter-cli@${TREE_SITTER_CLI_VERSION}" build-wasm .

# 0.20.x outputs e.g. tree-sitter-cobol.wasm in the repo root (no -o flag)
WASM_OUTPUT=$(find "$BUILD_DIR_ABS" -maxdepth 1 -name '*.wasm' -print -quit)
if [[ -z "$WASM_OUTPUT" || ! -f "$WASM_OUTPUT" ]]; then
  echo "Error: No .wasm file produced by build-wasm"
  exit 1
fi

mkdir -p "$DEST"
cp "$WASM_OUTPUT" "$DEST/tree-sitter-cobol.wasm"
echo "Done: $DEST/tree-sitter-cobol.wasm"
