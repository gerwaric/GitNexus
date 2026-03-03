# Tree-sitter upgrade notes (0.21 → 0.25/0.26)

Attempted after Fortran support: upgrade tree-sitter so the GitHub tree-sitter-fortran (built for 0.26) could load without ABI mismatch.

## Why Fortran loading fails (default install)

When you install **tree-sitter-fortran** from GitHub without a ref (e.g. `"tree-sitter-fortran": "github:stadelmanma/tree-sitter-fortran"`), npm resolves to the **default branch**, which is **v0.5.1**. That version:

- Declares **peer dependency `tree-sitter == 0.26.0`**
- Is built with **tree-sitter-cli 0.26.3**, so the generated grammar embeds a **language ABI version** that tree-sitter 0.21 does not accept.

GitNexus uses **tree-sitter ^0.21**. In the 0.21 native binding, when you call `parser.setLanguage(lang)` with a language object from a 0.26-built grammar:

1. The C++ code calls `ts_language_version(language)` and compares it to `TREE_SITTER_LANGUAGE_VERSION` (14) and `TREE_SITTER_MIN_COMPATIBLE_LANGUAGE_VERSION` (13).
2. The 0.26-built grammar has a higher language version, so the binding rejects it and returns `null` from `UnwrapLanguage` instead of throwing.
3. The JS layer then calls `binding.getNodeTypeNamesById(language)`, gets `undefined`, and accesses `.length` → **TypeError: Cannot read properties of undefined (reading 'length')**.

So the failure is an **ABI / language version mismatch**, not a missing file or wrong path.

## Solution: use tree-sitter-fortran v0.1.0 for tree-sitter 0.21

**tree-sitter-fortran v0.1.0** (Git tag `v0.1.0`, commit `4a593dd`) declares `peerDependencies: { "tree-sitter": "^0.21.0" }` and was built with **tree-sitter-cli ^0.20.0**, so its grammar uses a language version in the 13–14 range that tree-sitter 0.21 accepts.

**GitNexus uses a vendored copy:** The dependency is **`file:vendor/tree-sitter-fortran`**, i.e. **vendor/tree-sitter-fortran** in the gitnexus package, containing the v0.1.0 source with **devDependencies removed** (including **tree-sitter-cli**). That avoids install failures on platforms where tree-sitter-cli’s install script fails (e.g. linux arm64, or missing prebuilds). The vendored package keeps only the `install` script (`node-gyp-build`) so the native addon builds on install. To refresh the vendor from upstream v0.1.0, run **`./scripts/vendor-tree-sitter-fortran.sh`** from the gitnexus directory (or download the [v0.1.0 tarball](https://github.com/stadelmanma/tree-sitter-fortran/archive/refs/tags/v0.1.0.tar.gz), extract into `vendor/tree-sitter-fortran`, and remove `devDependencies` from its `package.json`).

If you are not using the vendored copy:

- **In package.json**, pin the dependency:
  ```json
  "tree-sitter-fortran": "github:stadelmanma/tree-sitter-fortran#v0.1.0"
  ```
- Run `npm install`. If install fails (e.g. on **linux arm64**) because the v0.1.0 package’s **devDependencies** pull in **tree-sitter-cli** and that fails to install on your platform, use the **vendored** approach above or a tarball/fork.

Once the v0.1.0 grammar is installed and its native addon is built, `loadLanguage(Fortran)` and the pipeline will work with tree-sitter 0.21.

## Findings (upgrade to 0.25/0.26)

- **tree-sitter@0.26** – Not published on npm. The Node binding package `tree-sitter` on npm has versions up to **0.25.0** only. The “0.26” peer in tree-sitter-fortran’s package.json refers to a different release line (e.g. CLI/WASM).

- **tree-sitter@0.25.0** (upgrade from 0.21):
  - **Node 24**: `npm install` fails when building the tree-sitter native addon. Node 24’s V8 headers require **C++20**; the addon build does not pass `-std=c++20`, so the compile fails (e.g. `#error "C++20 or later required."`).
  - **Node 20**: In some environments, install can fail during the **tree-sitter-fortran** git dependency’s `node-gyp-build` step (e.g. node-gyp tarball extract `fchown` errors in a sandbox). With a normal system and Node 20, 0.25 may install; then grammar packages (tree-sitter-javascript, etc.) declare peer `tree-sitter ^0.21` and would show peer dependency warnings or need updating to 0.25-compatible grammar versions.

## Current state

- **Node:** Use **Node 20** for gitnexus (see `gitnexus/.nvmrc` and README). **Node 24 is unsupported**; native addon builds and runtime can fail.
- **tree-sitter** is left at **^0.21.0** so the existing grammar stack and Node 20 build keep working.
- **tree-sitter-fortran** is **vendored** at **vendor/tree-sitter-fortran** (v0.1.0 with devDependencies removed). The package.json dependency is **`file:vendor/tree-sitter-fortran`**, so Fortran parsing works on all platforms (including linux arm64/amd64) without the tree-sitter-cli install issue. If you use the GitHub ref instead and get the default v0.5.1, `loadLanguage(Fortran)` throws; the parser-loader and parse-worker rethrow a clear error pointing to this doc.

## If you want Fortran parsing to work

1. **Default (this repo):** Use the **vendored** tree-sitter-fortran (**`file:vendor/tree-sitter-fortran`**). It is v0.1.0 with devDependencies removed, so `npm install` works on linux amd64/arm64 and other platforms without pulling in tree-sitter-cli.
2. **Alternative:** Pin **tree-sitter-fortran** to **v0.1.0** from GitHub (see [Solution](#solution-use-tree-sitter-fortran-v010-for-tree-sitter-021)). On some platforms (e.g. linux arm64), installing from git#v0.1.0 may fail due to the package’s devDependencies; use the vendored copy or a tarball/fork.
3. **Upgrade path:** Upgrade to **tree-sitter 0.25** with Node 20, update all grammar deps, and fix any API/query changes; then tree-sitter-fortran from GitHub may still declare peer 0.26 and need legacy-peer-deps or a fork that targets 0.25.
