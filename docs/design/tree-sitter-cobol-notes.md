# tree-sitter-cobol — compatibility with tree-sitter 0.21

GitNexus uses **tree-sitter ^0.21**. The upstream [tree-sitter-cobol](https://github.com/yutaro-sakamoto/tree-sitter-cobol) package uses the older **NAN** (Native Abstractions for Node.js) binding and does not declare a `tree-sitter` peer dependency, so it is not built or tested for tree-sitter 0.21’s expected language export shape.

## Approach: vendored + patched binding

We **vendor** tree-sitter-cobol and **patch** the Node binding so it works with tree-sitter 0.21 **without upgrading** tree-sitter or other packages:

1. **Export shape:** tree-sitter 0.21 expects the language module to export `{ name, language }` where `language` is an Napi `External<TSLanguage>` with a specific type tag. Upstream tree-sitter-cobol uses the old NAN API and exports a different shape. We replace `bindings/node/binding.cc` with a small **node-addon-api** binding that exports that shape (same as tree-sitter-fortran).

2. **Build:** We use **node-addon-api** and **node-gyp-build**, and declare `peerDependencies: { "tree-sitter": "^0.21.0" }`. The grammar’s `parser.c` uses `LANGUAGE_VERSION` 14, which is within the range tree-sitter 0.21 accepts (13–14).

3. **No package upgrades:** tree-sitter, Node, and other dependencies stay as-is. Only the COBOL grammar’s Node binding is patched.

## How to get COBOL parsing

1. **From gitnexus directory:** run  
   `./scripts/vendor-tree-sitter-cobol.sh`  
   This downloads tree-sitter-cobol from GitHub (main) and applies the patches into `vendor/tree-sitter-cobol`.

2. Run **`npm install`** in gitnexus to build the native addon.

3. After COBOL support is wired into the pipeline (language enum, parser-loader, queries, etc.), `loadLanguage(Cobol)` and indexing of `.cbl`/`.cob` files will work.

## If loading fails

- **"Invalid language object"** — The binding is still using the old export shape; ensure the vendored copy has the patched `bindings/node/binding.cc` and `binding.gyp` from `scripts/vendor-patches/tree-sitter-cobol/`.
- **"Incompatible language version"** — The grammar was built with a different tree-sitter CLI version; our vendored parser.c uses LANGUAGE_VERSION 14, which is compatible. If upstream changes that, re-run the vendor script and check `src/parser.c` for `#define LANGUAGE_VERSION`.
- **Build failures** — Ensure `node-addon-api` and `node-gyp-build` are present in `vendor/tree-sitter-cobol/package.json` and run `npm install` from gitnexus again.

## Reference

- Fortran uses the same pattern: [docs/design/tree-sitter-upgrade-notes.md](./tree-sitter-upgrade-notes.md), [docs/design/fortran-support.md](./fortran-support.md).
- COBOL design and decisions: [docs/design/cobol-support.md](./cobol-support.md).
