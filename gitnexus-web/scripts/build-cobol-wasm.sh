#!/usr/bin/env bash
# Build tree-sitter-cobol WASM for GitNexus Web UI.
# Run from gitnexus-web: ./scripts/build-cobol-wasm.sh
# Or: npm run build:cobol-wasm
# Requires: git, node, tree-sitter CLI (npm install -g tree-sitter-cli)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$WEB_ROOT/public/wasm/cobol"
REPO_URL="https://github.com/yutaro-sakamoto/tree-sitter-cobol.git"
# Use main; pin to a tag/commit in production if needed
BRANCH="main"
BUILD_DIR=$(mktemp -d)
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "Cloning tree-sitter-cobol ($BRANCH)..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$BUILD_DIR"
cd "$BUILD_DIR"

echo "Building WASM (requires tree-sitter CLI: npm install -g tree-sitter-cli)..."
tree-sitter build --wasm -o tree-sitter-cobol.wasm 2>/dev/null || npx -y tree-sitter-cli build --wasm -o tree-sitter-cobol.wasm

mkdir -p "$DEST"
cp tree-sitter-cobol.wasm "$DEST/"
echo "Done: $DEST/tree-sitter-cobol.wasm"
