#!/usr/bin/env bash
# Refresh vendor/tree-sitter-fortran from upstream v0.1.0.
# Run from repo root or gitnexus/. Removes devDependencies so npm install
# does not pull in tree-sitter-cli (which fails on some platforms).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITNEXUS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENDOR_DIR="$GITNEXUS_DIR/vendor/tree-sitter-fortran"
TARBALL_URL="https://github.com/stadelmanma/tree-sitter-fortran/archive/refs/tags/v0.1.0.tar.gz"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading tree-sitter-fortran v0.1.0..."
curl -sL -o "$TMP_DIR/fortran.tar.gz" "$TARBALL_URL"
tar xzf "$TMP_DIR/fortran.tar.gz" -C "$TMP_DIR"
rm -rf "$VENDOR_DIR"
mv "$TMP_DIR/tree-sitter-fortran-0.1.0" "$VENDOR_DIR"

# Remove devDependencies so npm install does not pull tree-sitter-cli
echo "Removing devDependencies from vendor package.json..."
PKG_JSON="$VENDOR_DIR/package.json"
PKG_JSON="$PKG_JSON" node -e "
const p = require(process.env.PKG_JSON);
delete p.devDependencies;
require('fs').writeFileSync(process.env.PKG_JSON, JSON.stringify(p, null, 2));
"

echo "Done: $VENDOR_DIR"
echo "Run npm install in gitnexus to rebuild the native addon."
