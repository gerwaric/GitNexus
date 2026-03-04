# COBOL Support — Design Discussion

This document outlines what would be required to add COBOL support to GitNexus using **[tree-sitter-cobol](https://github.com/yutaro-sakamoto/tree-sitter-cobol)** (yutaro-sakamoto), following the same pattern as Fortran in [docs/design/fortran-support.md](./fortran-support.md). It identifies **issues to resolve** and **decisions to make** before implementation.

---

## Current status (as of implementation)

**COBOL support is implemented and working.**

- **CLI (gitnexus):** Full support. Grammar is **vendored** at `gitnexus/vendor/tree-sitter-cobol` (see [tree-sitter-cobol-notes.md](./tree-sitter-cobol-notes.md)). Run the **local** CLI so it uses the vendored grammar — **do not** use `npx gitnexus` (that pulls the published npm package, which may not include COBOL). From the repo:
  ```bash
  cd gitnexus
  npm install
  npm run analyze -- /path/to/cobol-repo
  ```
  Or: `node dist/cli/index.js analyze /path/to/cobol-repo` from `gitnexus/`. Alternatively install the local package globally: `npm install -g .` from `gitnexus/`, then `gitnexus analyze ...` from anywhere.
- **Web UI (gitnexus-web):** COBOL WASM is built by `npm run build:cobol-wasm` (uses `npx -y tree-sitter-cli`; see `gitnexus-web/scripts/build-cobol-wasm.sh`). Output: `gitnexus-web/public/wasm/cobol/tree-sitter-cobol.wasm`. Load the app after building WASM to parse COBOL in the browser.
- **Verified:** [CobolCraft](https://github.com/meyfa/CobolCraft) (Minecraft server in COBOL) was analyzed successfully with the local CLI without errors.
- **Details:** Full implementation steps are in [cobol-implementation-plan.md](./cobol-implementation-plan.md). Section 7 below summarizes what was implemented.

---

## 1. Goal and Scope (Proposed)

**Goal:** GitNexus shall index COBOL codebases so that programs, paragraphs, sections, COPY dependencies, and call/perform relationships are represented in the knowledge graph and exposed via existing MCP tools, resources, and search. Parsing shall use **tree-sitter-cobol**.

**In scope (design):**

- COBOL file extensions: **`.cbl`**, **`.cob`**, and optionally **`.cpy`** (copybooks).
- CLI and Web UI: both shall support COBOL (CLI via native bindings, Web via custom-built WASM), mirroring Fortran.

**Out of scope for this design:**

- COBOL-specific build/config (e.g. GnuCOBOL, IBM dialect manifests) — optional later.

---

## 2. Parallel with Fortran — Subsystems to Extend

| Subsystem | Fortran | COBOL (proposed) |
|-----------|---------|-------------------|
| **Language registry** | `SupportedLanguages.Fortran`, `getLanguageFromFilename()` (.f, .f90) | Add `Cobol`, map .cbl, .cob, .cpy |
| **Parser loading** | parser-loader + parse-worker load tree-sitter-fortran (vendored v0.1.0) | Load tree-sitter-cobol — **version/ABI TBD** |
| **Tree-sitter queries** | Definitions (program/module/procedure), USE/INCLUDE, calls, heritage | Definitions (program, paragraph, section), COPY, CALL, PERFORM |
| **Import resolution** | USE module → file stem .f90/.f; INCLUDE path | COPY book [OF/IN lib] → file stem .cbl/.cob/.cpy |
| **Call resolution** | call_expression, subroutine_call; enclosing procedure | CALL program; PERFORM paragraph/section; enclosing paragraph/section |
| **Heritage** | TYPE … EXTENDS → Struct, EXTENDS | COBOL has no OOP inheritance — **no heritage** or empty |
| **Export / visibility** | PUBLIC/PRIVATE | COBOL has no export model — treat all as “exported” or N/A |
| **Entry-point scoring** | program/main-like names | Main program (PROGRAM-ID), optional patterns |
| **Pipeline** | Fortran required if repo has .f/.f90 | COBOL required if repo has .cbl/.cob (and .cpy if we index them) |
| **Web** | build-fortran-wasm.sh → public/wasm/fortran/ | build-cobol-wasm.sh → public/wasm/cobol/ |

---

## 3. Issues to Resolve

### 3.1 Grammar / Node Binding Compatibility

- **tree-sitter-cobol** [package.json](https://github.com/yutaro-sakamoto/tree-sitter-cobol/blob/main/package.json):
  - Version **0.0.1**.
  - **No `peerDependencies`** on `tree-sitter` — version expectations are unspecified.
  - Uses **`nan`** (^2.22.0) for the Node binding, not **node-addon-api** (tree-sitter-fortran uses node-addon-api and declares `tree-sitter: ^0.21.0`).
  - **devDependencies:** `tree-sitter-cli: ^0.24.5` — grammar may be generated for a newer CLI/ABI.

- **Risk:** With GitNexus on **tree-sitter ^0.21**, loading tree-sitter-cobol from npm may **fail at runtime** (ABI mismatch), similar to tree-sitter-fortran when using the wrong version.

- **Options:**
  1. **Try npm/git ref as-is** — add tree-sitter-cobol, run `npm install` and `loadLanguage(Cobol)`; if it throws, treat as “needs vendoring/patching.”
  2. **Vendor and patch** — like Fortran: vendor tree-sitter-cobol (e.g. script `scripts/vendor-tree-sitter-cobol.sh`), strip devDependencies, and if needed adjust binding to work with tree-sitter 0.21 (or document that a specific tag/commit is 0.21-compatible).
  3. **Upgrade tree-sitter** — move GitNexus to a newer tree-sitter (e.g. 0.25) and align all grammars; larger change (see [tree-sitter-upgrade-notes.md](./tree-sitter-upgrade-notes.md)).

**Recommendation:** **Vendor and patch** (no package upgrades). Use **`gitnexus/scripts/vendor-tree-sitter-cobol.sh`** to download tree-sitter-cobol and apply patches so the Node binding uses **node-addon-api** and the export shape expected by tree-sitter 0.21. The grammar's `LANGUAGE_VERSION` is 14 (compatible with tree-sitter 0.21). See **docs/design/tree-sitter-cobol-notes.md**.

---

### 3.2 COBOL Definition Semantics — What to Index as Symbols

- **Program** — `program_definition` → `identification_division` → `program_name`. One program per compilation unit. Maps naturally to **Module** (like Fortran program).
- **Paragraph** — `paragraph_header` has `field('name', choice($._WORD, $.integer))`. Paragraphs are callable via PERFORM. Map to **Function** so CALLS/process detection works.
- **Section** — `section_header` has `field('name', ...)`. Sections contain paragraphs and are also PERFORM targets. Map to **Function** (or introduce a distinction later).
- **Copybook** — COPY does not define a “symbol” in the same sense; it’s an include. We only need **IMPORTS** from file A to file B when A has `COPY B` (after resolving B to a file).

So:

- **Definitions:** program → Module; paragraph_header → Function; section_header → Function (or both to a single “callable” label if we want to distinguish paragraph vs section in properties).
- **No new graph label** required if we reuse Module + Function.

---

### 3.3 COPY Resolution (Imports)

- Grammar: `copy_statement` has `field('book', optional(choice($.WORD, $.string)))` and `field('lib_name', optional(seq($._in_of, choice($.WORD, $.string))))`.
- **Convention:** Resolve COPY book [OF/IN lib] to a file by treating `book` (and optionally `lib`) as a path stem and trying extensions in order, e.g. **`.cpy` then `.cbl` then `.cob`** (configurable). Search relative to current file and/or repo root.
- **Decision:** Extension order and whether `.cpy` is the primary copybook extension should be explicit in the design (e.g. “.cpy first, then .cbl, .cob”).
- **Library paths:** COBOL often uses compiler/copybook paths (e.g. `COB_COPY_PATH`). First version can be “repo-relative only”; library path support is an optional enhancement.

---

### 3.4 CALL vs PERFORM — Two Kinds of “Calls”

- **CALL** — `call_statement` → `_call_header` → `field('x', $._id_or_lit_or_func)`. Typically invokes another **program** (external). Resolution: by program name; target may be in another file (program_definition/program_name) or external (no node in graph).
- **PERFORM** — `perform_statement_call_proc` → `field('procedure', $.perform_procedure)` → `perform_procedure` has `label` (paragraph/section name). Always within the same program (or nested programs if we ever model that). Resolution: by name within current program’s paragraphs/sections.

So we need:

- **Two query captures** (or two relationship semantics): one for CALL (target = program) and one for PERFORM (target = paragraph/section). Both can create **CALLS** edges; the difference is how we resolve the callee (by program name across files vs by paragraph/section name within file).
- **Enclosing “function”** for COBOL: when we are inside a paragraph or section, the enclosing callable is that paragraph/section (so we add `paragraph_header` and `section_header` to the set of node types that define the “enclosing function” for call attribution).

---

### 3.5 Enclosing Procedure for COBOL

- **call-processor** uses `FUNCTION_NODE_TYPES` and `findEnclosingFunction()`. For COBOL we must:
  - Add **`paragraph_header`** and **`section_header`** to `FUNCTION_NODE_TYPES`.
  - In `findEnclosingFunction()`, add a branch for these types: read the `name` field (grammar uses `field('name', ...)`) to get the paragraph/section name and build the same ID format as parsing (e.g. `Function:path:name`).

---

### 3.6 Heritage and Export

- **Heritage:** COBOL has no class/type inheritance. The heritage processor should **skip COBOL** (no EXTENDS/IMPLEMENTS). No query captures for heritage; no new relationship type.
- **Export:** COBOL has no export/visibility. **isNodeExported()** can return `true` for all COBOL symbols, or we add a `case 'cobol': return true;` and document it.

---

### 3.7 Entry-Point Scoring

- Entry points in COBOL are **main programs** (PROGRAM-ID). We can add a small set of patterns for `cobol` in `ENTRY_POINT_PATTERNS` (e.g. program name = main, or names like MAIN, RUN, START). Process detection will then trace from these programs via CALL/PERFORM.

---

### 3.8 Web UI — WASM and Duplication

- **WASM:** tree-sitter-cobol does not ship a prebuilt WASM. Same approach as Fortran: **in-repo script** (e.g. `gitnexus-web/scripts/build-cobol-wasm.sh`) that clones tree-sitter-cobol, runs `tree-sitter build --wasm`, and places the artifact in `gitnexus-web/public/wasm/cobol/tree-sitter-cobol.wasm`. Need to confirm tree-sitter CLI version used by the script matches what the grammar expects.
- **Dual codebase:** All COBOL-specific logic (language enum, extensions, queries, import/call/heritage/export/entry-point) must be **duplicated in gitnexus-web** so that the in-browser ingestion pipeline behaves the same as the CLI.

---

## 4. Decisions to Make

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **File extensions** | .cbl only; .cbl + .cob; + .cpy for copybooks | **.cbl and .cob** for programs; **.cpy** optional (include in getLanguageFromFilename and COPY resolution). |
| **Program as node label** | Module vs new “Program” | **Reuse Module** (like Fortran program_statement). |
| **Paragraph vs section** | Both as Function; or Section as a different label | **Both as Function** for simplicity; optional `keyword` or property to distinguish. |
| **Grammar dependency** | Required (fail if COBOL files present but grammar missing) vs optional | **Required** (same as Fortran) so behavior is predictable. |
| **Vendoring** | npm/git ref vs vendored (like Fortran) | **Try npm first**; vendor + script if ABI/install fails. |
| **COPY extension order** | .cpy / .cbl / .cob (or other) | **.cpy, .cbl, .cob** for COPY resolution; document. |
| **CALL to external program** | Create CALLS to Program node in another file when name matches; else leave as “external” | **Resolve when program exists in graph**; otherwise optional “external call” or no edge. |
| **WASM build** | Same script pattern as Fortran; which tag/commit to build | **main or latest release**; pin in script and document. |

---

## 5. Tree-Sitter Query Sketch (COBOL)

Based on the grammar rules (program_definition, program_name, paragraph_header, section_header, copy_statement, call_statement, perform_statement_call_proc):

```scheme
; Program (map to Module)
(program_definition (identification_division (program_name) @name)) @definition.module

; Paragraph and section (map to Function)
(paragraph_header (name) @name) @definition.function
(section_header (name) @name) @definition.function

; COPY book [OF/IN lib] — book (and lib if present) for import resolution
(copy_statement book: (WORD) @import.source) @import
(copy_statement book: (string) @import.source) @import

; CALL program
(call_statement (_call_header x: (_) @call.name)) @call

; PERFORM procedure
(perform_statement_call_proc procedure: (perform_procedure (label) @call.name)) @call
```

- **Heritage:** none (no captures).
- **Exact node names** (e.g. `_call_header`, `perform_procedure`, `label`) must be verified against the actual grammar; the grammar uses `field('name', ...)` so the capture name in the query might be `name` for paragraph/section.

---

## 6. Summary

- **Approach:** Mirror Fortran: add COBOL to language enum, parser loader, parse worker, tree-sitter queries, import (COPY), call (CALL + PERFORM), and entry-point scoring; no heritage; export = always true. Extend both **gitnexus** (CLI) and **gitnexus-web** (WASM + same ingestion logic).
- **Blockers / risks:** (1) tree-sitter-cobol Node binding may not load with tree-sitter 0.21 — test and possibly vendor/patch; (2) exact query node/field names must be validated against the grammar; (3) COPY resolution convention and extension order to be decided.
- **Decisions:** File extensions, program/paragraph/section label mapping, required vs optional grammar, vendoring, COPY order, external CALL handling, WASM script tag/ref.

Once these are decided, the work can be broken into an implementation plan (similar to Fortran) and executed in gitnexus and gitnexus-web in parallel.

---

## 7. Implementation

COBOL support was implemented following [docs/design/cobol-implementation-plan.md](./cobol-implementation-plan.md). The plan was executed in order: language enum and parser (CLI + Web), tree-sitter queries, COPY resolution, call resolution (CALL/PERFORM + enclosing paragraph/section), heritage/export/entry-point/pipeline, Web UI mirror (WASM build script, ingestion), and tests/docs.

- **CLI:** Vendored **tree-sitter-cobol** via `gitnexus/scripts/vendor-tree-sitter-cobol.sh` and `file:vendor/tree-sitter-cobol` in `gitnexus/package.json`. Binding notes: [tree-sitter-cobol-notes.md](./tree-sitter-cobol-notes.md).
- **Web:** COBOL WASM from `gitnexus-web/scripts/build-cobol-wasm.sh` → `public/wasm/cobol/tree-sitter-cobol.wasm`. Build uses `npx -y tree-sitter-cli` (package name is `tree-sitter-cli`, not `tree-sitter`).
- **Query note:** The grammar exposes hidden nodes (e.g. `_call_header`); the live queries use `(call_statement (_) @call.name)` and `paragraph_header name: (_)` / `section_header name: (_)` to match the actual node types.
