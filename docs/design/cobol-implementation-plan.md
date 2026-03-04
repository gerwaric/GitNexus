# COBOL Support — Implementation Plan

**Start here:** Read [docs/design/cobol-support.md](./cobol-support.md) for design decisions and context. Then execute the phases below in order (later phases depend on earlier ones).

Use this plan in a **new session** to implement the remainder of COBOL support. The **grammar and vendoring** are already done (tree-sitter-cobol vendored, patched for tree-sitter 0.21, dependency in gitnexus, integration test in `tree-sitter-languages.test.ts`). This plan covers wiring COBOL into the pipeline and Web UI.

**Reference:** Design in [docs/design/cobol-support.md](./cobol-support.md). Mirror [Fortran support](./fortran-support.md) and existing code in `gitnexus/` and `gitnexus-web/`.

---

## Prerequisites (already done)

- [x] `gitnexus/scripts/vendor-tree-sitter-cobol.sh` — downloads and patches tree-sitter-cobol
- [x] `gitnexus/scripts/vendor-patches/tree-sitter-cobol/` — Napi binding, binding.gyp, index.js
- [x] `gitnexus/package.json` — `"tree-sitter-cobol": "file:vendor/tree-sitter-cobol"`
- [x] `docs/design/tree-sitter-cobol-notes.md` — compatibility notes
- [x] Integration test: `test/integration/tree-sitter-languages.test.ts` — "COBOL (vendored grammar)" loads and parses

---

## Phase 1 — CLI (gitnexus): Language and parser

### 1.1 Language enum and file extensions

**Files:**  
- `gitnexus/src/config/supported-languages.ts`  
- `gitnexus/src/core/ingestion/utils.ts`

**Tasks:**

1. Add `Cobol = 'cobol'` to `SupportedLanguages` (same style as Fortran).
2. In `getLanguageFromFilename()`:
   - Map `.cbl` and `.cob` to `SupportedLanguages.Cobol`.
   - Optionally map `.cpy` to `SupportedLanguages.Cobol` (for copybooks; design says optional).

**Done:** Files with `.cbl` / `.cob` (and optionally `.cpy`) are recognized as COBOL.

---

### 1.2 Parser loader and parse worker

**Files:**  
- `gitnexus/src/core/tree-sitter/parser-loader.ts`  
- `gitnexus/src/core/ingestion/workers/parse-worker.ts`

**Tasks:**

1. **parser-loader.ts**
   - `import Cobol from 'tree-sitter-cobol'` (or createRequire if ESM).
   - Add `[SupportedLanguages.Cobol]: Cobol` to `languageMap`.
   - In the `loadLanguage` catch block, add a branch for `SupportedLanguages.Cobol` that throws a clear error (e.g. point to tree-sitter-cobol-notes.md), similar to Fortran.

2. **parse-worker.ts**
   - Import tree-sitter-cobol and add Cobol to the worker’s language map.
   - Add the same Cobol error handling when `setLanguage` fails.

**Done:** `loadLanguage(SupportedLanguages.Cobol)` works when the vendored grammar is installed; pipeline can request COBOL parsing.

---

### 1.3 Parser-loader unit test

**File:** `gitnexus/test/unit/parser-loader.test.ts`

**Tasks:**

1. Add an `it('loads Cobol language', ...)` that:
   - Asserts `isLanguageAvailable(SupportedLanguages.Cobol)` is true.
   - Calls `loadLanguage(SupportedLanguages.Cobol)` and expects no throw (or catch with a clear message if grammar load fails).

**Done:** Unit test guards COBOL loading.

---

## Phase 2 — CLI: Tree-sitter queries

### 2.1 COBOL query string

**File:** `gitnexus/src/core/ingestion/tree-sitter-queries.ts`

**Tasks:**

1. Define `COBOL_QUERIES` (string) with captures for:
   - **Definitions:**  
     - Program: `program_definition` → `identification_division` → `program_name` → map to **Module** (`@definition.module`).  
     - Paragraph: `paragraph_header` with `name` → **Function** (`@definition.function`).  
     - Section: `section_header` with `name` → **Function** (`@definition.function`).
   - **Imports:**  
     - `copy_statement` with `book` (and optionally `lib_name`) → `@import.source` and `@import`.
   - **Calls:**  
     - `call_statement` → `_call_header` → `x` (callee name) → `@call.name` and `@call`.  
     - `perform_statement_call_proc` → `procedure` → `perform_procedure` → `label` → `@call.name` and `@call`.
   - **Heritage:** None (no captures).

2. Verify node/field names against the tree-sitter-cobol grammar (e.g. parse a sample and inspect, or check grammar.js). Adjust capture names if the grammar uses different field names (e.g. `name` vs `book`).

3. Add `[SupportedLanguages.Cobol]: COBOL_QUERIES` to `LANGUAGE_QUERIES`.

**Done:** Pipeline can extract definitions, imports, and calls from COBOL files using the same processors as other languages.

---

## Phase 3 — CLI: Import resolution (COPY)

### 3.1 COPY resolution

**File:** `gitnexus/src/core/ingestion/import-processor.ts`

**Tasks:**

1. Add COBOL extensions to `EXTENSIONS` (e.g. `.cpy`, `.cbl`, `.cob` — order per design: `.cpy` then `.cbl` then `.cob` for COPY).

2. Add a COBOL branch in the language-specific resolution path (where Fortran USE is handled):
   - When `language === SupportedLanguages.Cobol` and the import path looks like a COPY book (no path separators, or handle OF/IN lib), call a new helper e.g. `resolveCobolCopy(importPath, allFiles, index)`.
   - `resolveCobolCopy`: treat `importPath` as the copybook stem; search `allFiles` for a file whose stem matches and extension is in [`.cpy`, `.cbl`, `.cob`] in that order; return the first match (repo-relative only is enough for v1).

3. Ensure the import processor passes the correct `importPath` for COBOL from the query captures (COPY book, and optionally lib for OF/IN).

**Done:** COPY book [OF/IN lib] produces IMPORTS edges to the resolved file.

---

## Phase 4 — CLI: Call resolution and enclosing procedure

### 4.1 Call processor

**File:** `gitnexus/src/core/ingestion/call-processor.ts`

**Tasks:**

1. Add to `FUNCTION_NODE_TYPES`: `'paragraph_header'`, `'section_header'`.

2. In `findEnclosingFunction()`:
   - Add a branch for `paragraph_header` and `section_header`:
     - Read the procedure name from the node (e.g. `childForFieldName('name')` or the grammar’s name field).
     - Build the same ID format as parsing uses for COBOL functions (e.g. `Function:filePath:name`) and return it (or look up in symbol table).

3. Callee resolution:
   - **CALL:** Resolve by program name — lookup in symbol table as Module (program) in current file or other files (e.g. by program_name). Create CALLS edge when a matching program node exists in the graph.
   - **PERFORM:** Resolve by paragraph/section name within the same file (same program). Lookup as Function in current file. Create CALLS edge to the paragraph/section node.
   - Reuse existing “resolve by name” logic where possible; add COBOL-specific handling where the call is CALL vs PERFORM (if the processor needs to distinguish).

**Done:** CALL and PERFORM create CALLS edges; caller is attributed to the enclosing paragraph/section when inside one.

---

## Phase 5 — CLI: Heritage, export, entry-point, pipeline

### 5.1 Heritage

**File:** `gitnexus/src/core/ingestion/heritage-processor.ts`

**Tasks:**

1. Ensure COBOL produces no heritage captures (no `heritage.class` / `heritage.extends` in COBOL_QUERIES).
2. If the heritage processor iterates by language, add an early skip for `SupportedLanguages.Cobol` (no EXTENDS in COBOL).

**Done:** No heritage edges for COBOL; no errors.

---

### 5.2 Export / visibility

**Files:**  
- `gitnexus/src/core/ingestion/parsing-processor.ts`  
- `gitnexus/src/core/ingestion/workers/parse-worker.ts` (if export is checked there)

**Tasks:**

1. In `isNodeExported()` add `case 'cobol': return true;` (COBOL has no export model; treat all symbols as exported).

2. If the parse-worker has a parallel export check for COBOL, add the same behavior there.

**Done:** COBOL symbols are considered exported for entry-point/process logic.

---

### 5.3 Entry-point scoring

**File:** `gitnexus/src/core/ingestion/entry-point-scoring.ts`

**Tasks:**

1. Add a `'cobol'` key to `ENTRY_POINT_PATTERNS` with patterns for main-program names (e.g. `main`, `MAIN`, `run`, `RUN`, `start`, `START`, or program-id style names). Reuse the same pattern shape as Fortran (array of regex or string patterns).

**Done:** COBOL programs can be scored as entry points; process detection can trace from them.

---

### 5.4 Pipeline

**File:** `gitnexus/src/core/ingestion/pipeline.ts`

**Tasks:**

1. Where Fortran is required when the repo has `.f`/`.f90` files, add the same for COBOL: if any scanned file has extension `.cbl`, `.cob`, or `.cpy`, require `isLanguageAvailable(SupportedLanguages.Cobol)` and throw a clear error if not (e.g. “COBOL grammar is required but could not be loaded”).

**Done:** Repos with COBOL files fail fast with a clear message if the grammar is missing.

---

## Phase 6 — Web UI (gitnexus-web)

Mirror the CLI: same language, extensions, queries, import/call/export/entry-point behavior.

### 6.1 Language and utils

**Files:**  
- `gitnexus-web/src/config/supported-languages.ts`  
- `gitnexus-web/src/core/ingestion/utils.ts`

**Tasks:**

1. Add `Cobol = 'cobol'` to the SupportedLanguages enum.
2. In `getLanguageFromFilename()` add `.cbl`, `.cob`, and optionally `.cpy` → Cobol.

**Done:** Web UI recognizes COBOL file extensions.

---

### 6.2 WASM parser loader

**File:** `gitnexus-web/src/core/tree-sitter/parser-loader.ts`

**Tasks:**

1. Add Cobol to the language–file map: `[SupportedLanguages.Cobol]: '/wasm/cobol/tree-sitter-cobol.wasm'`.
2. Ensure `getWasmPath()` (or equivalent) returns this path for Cobol.

**Done:** Web loader will load COBOL WASM from `/wasm/cobol/`.

---

### 6.3 Build COBOL WASM script

**File:** `gitnexus-web/scripts/build-cobol-wasm.sh`

**Tasks:**

1. Copy the structure of `build-fortran-wasm.sh`:
   - Clone tree-sitter-cobol (e.g. main branch or a pinned ref).
   - Run `tree-sitter build --wasm -o tree-sitter-cobol.wasm`.
   - Copy the WASM to `gitnexus-web/public/wasm/cobol/tree-sitter-cobol.wasm`.
2. Create `gitnexus-web/public/wasm/cobol/.gitkeep` if needed (with a comment that WASM is built by the script).
3. Add an npm script in `gitnexus-web/package.json`, e.g. `"build:cobol-wasm": "bash scripts/build-cobol-wasm.sh"`.

**Done:** Running the script produces the COBOL WASM; Web UI can load it.

---

### 6.4 Web ingestion: queries, import, call, export, entry-point

**Files:**  
- `gitnexus-web/src/core/ingestion/tree-sitter-queries.ts`  
- `gitnexus-web/src/core/ingestion/import-processor.ts`  
- `gitnexus-web/src/core/ingestion/call-processor.ts`  
- `gitnexus-web/src/core/ingestion/parsing-processor.ts` (and worker if applicable)  
- `gitnexus-web/src/core/ingestion/entry-point-scoring.ts`  
- `gitnexus-web/src/core/ingestion/heritage-processor.ts`

**Tasks:**

1. **tree-sitter-queries.ts:** Add the same `COBOL_QUERIES` and register in `LANGUAGE_QUERIES`.
2. **import-processor.ts:** Add COPY resolution (same convention: .cpy, .cbl, .cob) and COBOL branch.
3. **call-processor.ts:** Add `paragraph_header` and `section_header` to the “function” node types; add `findEnclosingFunction` branch for COBOL; ensure CALL/PERFORM resolution (program vs paragraph/section).
4. **parsing-processor.ts:** Add `case 'cobol': return true` in `isNodeExported()`.
5. **entry-point-scoring.ts:** Add `'cobol'` entry-point patterns.
6. **heritage-processor.ts:** Skip COBOL or ensure no heritage captures for Cobol.

**Done:** In-browser ingestion produces the same graph shape as the CLI for COBOL.

---

### 6.5 Web parse worker

**File:** `gitnexus-web/src/workers/ingestion.worker.ts` (or equivalent)

**Tasks:**

1. Ensure the worker’s language map includes Cobol and loads the COBOL WASM (same path as in parser-loader).
2. Add Cobol to any export/visibility or error-handling branches (e.g. Cobol load failure message).

**Done:** Worker parses COBOL files when loading a repo in the Web UI.

---

## Phase 7 — Tests and docs

### 7.1 Tests

**Files:**  
- `gitnexus/test/unit/parser-loader.test.ts` (already planned in Phase 1.3)  
- `gitnexus/test/integration/tree-sitter-languages.test.ts`  
- Optional: `gitnexus/test/fixtures/sample-code/simple.cbl`

**Tasks:**

1. Add a minimal COBOL fixture `simple.cbl` (e.g. IDENTIFICATION DIVISION, PROGRAM-ID, one paragraph, COPY or CALL/PERFORM if desired).
2. In `tree-sitter-languages.test.ts`, add a describe('Cobol') block that:
   - Calls `loadLanguage(SupportedLanguages.Cobol)`.
   - Reads the COBOL fixture, runs the COBOL query, and asserts at least one definition (e.g. program or paragraph).
3. Optionally add an integration test that runs the pipeline on a small COBOL repo and asserts IMPORTS/CALLS or symbol count.

**Done:** Automated tests cover COBOL load, parse, and optionally full pipeline.

---

### 7.2 Documentation

**Files:**  
- `README.md` or docs that list supported languages  
- `docs/design/cobol-support.md`

**Tasks:**

1. Add COBOL to the supported-languages list (and file extensions .cbl, .cob, .cpy if documented).
2. In cobol-support.md, add a short “Implementation” section that states the plan was executed and points to this implementation plan; or mark the design as implemented.

**Done:** Users and future sessions know COBOL is supported and how it was implemented.

---

## Order of work (suggested)

1. **Phase 1** — Language + parser (enum, utils, parser-loader, parse-worker, unit test). Unblocks all other CLI work.
2. **Phase 2** — Queries. Required for import/call and tests.
3. **Phase 3 & 4** — Import (COPY) and Call (CALL/PERFORM + enclosing procedure). Can be parallel after Phase 2.
4. **Phase 5** — Heritage, export, entry-point, pipeline. Small, can follow Phase 4.
5. **Phase 6** — Web UI (language, WASM script, ingestion mirror). Can start after Phase 2; full mirror after Phase 4.
6. **Phase 7** — Fixture, integration test, docs. After Phase 4 or 5.

---

## Verification checklist

- [ ] `npx gitnexus analyze --force <path-to-repo-with-.cbl>` runs without COBOL errors.
- [ ] Graph contains Module (program) and Function (paragraph/section) nodes for COBOL files.
- [ ] COPY statements produce IMPORTS edges to the resolved copybook file.
- [ ] CALL and PERFORM produce CALLS edges; caller is the enclosing paragraph/section when applicable.
- [ ] Web UI: load a repo with COBOL files (or run build-cobol-wasm and load); same graph shape as CLI.
- [ ] `npm run test` and `npm run test:integration` pass including new COBOL tests.

---

## Reference: key file paths

| Area            | gitnexus (CLI) | gitnexus-web |
|-----------------|----------------|--------------|
| Language enum   | `src/config/supported-languages.ts` | `src/config/supported-languages.ts` |
| File → language | `src/core/ingestion/utils.ts` | `src/core/ingestion/utils.ts` |
| Parser load     | `src/core/tree-sitter/parser-loader.ts` | `src/core/tree-sitter/parser-loader.ts` |
| Queries         | `src/core/ingestion/tree-sitter-queries.ts` | `src/core/ingestion/tree-sitter-queries.ts` |
| Import (COPY)   | `src/core/ingestion/import-processor.ts` | `src/core/ingestion/import-processor.ts` |
| Call            | `src/core/ingestion/call-processor.ts` | `src/core/ingestion/call-processor.ts` |
| Heritage        | `src/core/ingestion/heritage-processor.ts` | `src/core/ingestion/heritage-processor.ts` |
| Export          | `src/core/ingestion/parsing-processor.ts` (+ parse-worker) | same |
| Entry-point     | `src/core/ingestion/entry-point-scoring.ts` | same |
| Pipeline        | `src/core/ingestion/pipeline.ts` | N/A (worker-driven) |
| WASM build      | N/A | `scripts/build-cobol-wasm.sh` |
| Parse worker    | `src/core/ingestion/workers/parse-worker.ts` | `src/workers/ingestion.worker.ts` (or equivalent) |
