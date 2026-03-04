#!/usr/bin/env bash
# Build tree-sitter-fortran WASM for GitNexus Web UI.
# Run from gitnexus-web: ./scripts/build-fortran-wasm.sh
# Or: npm run build:fortran-wasm
# Requires: git, node, tree-sitter CLI (npm install -g tree-sitter-cli)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$WEB_ROOT/public/wasm/fortran"
REPO_URL="https://github.com/stadelmanma/tree-sitter-fortran.git"
TAG="v0.1.0"
BUILD_DIR=$(mktemp -d)
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "Cloning tree-sitter-fortran $TAG..."
git clone --depth 1 --branch "$TAG" "$REPO_URL" "$BUILD_DIR"
cd "$BUILD_DIR"

echo "Building WASM (requires tree-sitter CLI: npm install -g tree-sitter-cli)..."
tree-sitter build --wasm -o tree-sitter-fortran.wasm 2>/dev/null || npx -y tree-sitter-cli build --wasm -o tree-sitter-fortran.wasm

mkdir -p "$DEST"
cp tree-sitter-fortran.wasm "$DEST/"
echo "Done: $DEST/tree-sitter-fortran.wasm"
