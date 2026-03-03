# Tree-sitter upgrade notes (0.21 → 0.25/0.26)

Attempted after Fortran support: upgrade tree-sitter so the GitHub tree-sitter-fortran (built for 0.26) could load without ABI mismatch.

## Findings

- **tree-sitter@0.26** – Not published on npm. The Node binding package `tree-sitter` on npm has versions up to **0.25.0** only. The “0.26” peer in tree-sitter-fortran’s package.json refers to a different release line (e.g. CLI/WASM).

- **tree-sitter@0.25.0** (upgrade from 0.21):
  - **Node 24**: `npm install` fails when building the tree-sitter native addon. Node 24’s V8 headers require **C++20**; the addon build does not pass `-std=c++20`, so the compile fails (e.g. `#error "C++20 or later required."`).
  - **Node 20**: In some environments, install can fail during the **tree-sitter-fortran** git dependency’s `node-gyp-build` step (e.g. node-gyp tarball extract `fchown` errors in a sandbox). With a normal system and Node 20, 0.25 may install; then grammar packages (tree-sitter-javascript, etc.) declare peer `tree-sitter ^0.21` and would show peer dependency warnings or need updating to 0.25-compatible grammar versions.

## Current state

- **tree-sitter** is left at **^0.21.0** so the existing grammar stack and Node 20 build keep working.
- **tree-sitter-fortran** is installed from GitHub with **legacy-peer-deps**; at runtime, `loadLanguage(Fortran)` can throw (TypeError) due to ABI mismatch. The parser-loader test accepts either success or that TypeError.

## If you want Fortran parsing to work

1. **Stay on 0.21** and use a Fortran grammar built for tree-sitter 0.21 (if one exists), or  
2. **Upgrade to 0.25** with Node 20, update all grammar deps to 0.25-compatible versions, and fix any API/query changes in the codebase; then tree-sitter-fortran from GitHub may still declare peer 0.26 and need legacy-peer-deps or a fork that targets 0.25.
