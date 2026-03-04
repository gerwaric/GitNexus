#!/usr/bin/env bash
# Refresh vendor/tree-sitter-cobol from upstream main.
# Applies patches so the Node binding uses node-addon-api and the export shape
# expected by tree-sitter 0.21 (no package upgrades). Run from repo root or gitnexus/.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITNEXUS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENDOR_DIR="$GITNEXUS_DIR/vendor/tree-sitter-cobol"
PATCHES_DIR="$SCRIPT_DIR/vendor-patches/tree-sitter-cobol"
TARBALL_URL="https://github.com/yutaro-sakamoto/tree-sitter-cobol/archive/refs/heads/main.tar.gz"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading tree-sitter-cobol (main)..."
curl -sL -o "$TMP_DIR/cobol.tar.gz" "$TARBALL_URL"
tar xzf "$TMP_DIR/cobol.tar.gz" -C "$TMP_DIR"
rm -rf "$VENDOR_DIR"
mv "$TMP_DIR/tree-sitter-cobol-main" "$VENDOR_DIR"

# Remove devDependencies and switch to node-addon-api + tree-sitter ^0.21
echo "Patching package.json for tree-sitter 0.21 compatibility..."
PKG_JSON="$VENDOR_DIR/package.json"
node -e "
const p = require('$PKG_JSON');
delete p.devDependencies;
p.dependencies = {
  'node-addon-api': '^7.1.0',
  'node-gyp-build': '^4.8.0'
};
p.peerDependencies = { 'tree-sitter': '^0.21.0' };
p.peerDependenciesMeta = { tree_sitter: { optional: true } };
p.scripts = p.scripts || {};
p.scripts.install = 'node-gyp-build';
require('fs').writeFileSync('$PKG_JSON', JSON.stringify(p, null, 2));
"

# Apply Node binding patches (Napi export shape for tree-sitter 0.21)
echo "Applying Node binding patches..."
cp "$PATCHES_DIR/binding.cc" "$VENDOR_DIR/bindings/node/binding.cc"
cp "$PATCHES_DIR/binding.gyp" "$VENDOR_DIR/binding.gyp"
cp "$PATCHES_DIR/index.js" "$VENDOR_DIR/bindings/node/index.js"

echo "Done: $VENDOR_DIR"
echo "Run npm install in gitnexus to rebuild the native addon."
echo "See docs/design/tree-sitter-cobol-notes.md if load fails."
