# Fortran Support — Design Document

This document defines **what** must be designed or changed to support Fortran in GitNexus. It describes features, subsystems, and behaviors; it is not an implementation plan.

---

## 1. Goal and Scope

**Goal:** GitNexus shall index Fortran codebases so that symbols (programs, modules, subroutines, functions), module/file dependencies, call relationships, and execution flows are represented in the knowledge graph and exposed via existing MCP tools, resources, and search. Parsing shall use the **[tree-sitter-fortran](https://github.com/stadelmanma/tree-sitter-fortran)** grammar (npm: `tree-sitter-fortran`).

**In scope (design):**

- Fortran file extensions: **`.f`** and **`.f90`** only (single language entry, one grammar).
- CLI and Web UI: both shall support Fortran (CLI via native bindings, Web via custom-built WASM).

**Out of scope for this design:**

- Fortran-specific framework detection (e.g. fpm, CMake) — optional enhancement.

---

## 2. Subsystems and Design Changes

### 2.1 Language Registry and File Identification

**Subsystem:** Language is represented by the `SupportedLanguages` enum and by mapping file paths to a language via `getLanguageFromFilename()` in `gitnexus/src/core/ingestion/utils.ts`.

**Design changes:**

- Add a new enum value for Fortran (e.g. `Fortran = 'fortran'`).
- Extend the file-extension mapping so that Fortran source files are recognized for **`.f`** and **`.f90`** only.
- Behavior: any file whose path ends with `.f` or `.f90` is treated as Fortran for the rest of the pipeline (parsing, imports, calls, etc.).

**Dual codebase:** The same conceptual "supported language" and "file extension → language" rules must hold in both the **CLI** (`gitnexus/`) and the **Web** (`gitnexus-web/`) so that behavior is consistent.

---

### 2.2 Parsing and Grammar Loading

**Subsystem:** The pipeline uses Tree-sitter for parsing. The CLI loads native bindings in `gitnexus/src/core/tree-sitter/parser-loader.ts`; the parse worker keeps a parallel language map in `gitnexus/src/core/ingestion/workers/parse-worker.ts`. The Web UI loads WASM grammars from `gitnexus-web/src/core/tree-sitter/parser-loader.ts` (paths like `/wasm/<lang>/tree-sitter-<lang>.wasm`).

**Grammar:** Fortran parsing shall use **[tree-sitter-fortran](https://github.com/stadelmanma/tree-sitter-fortran)** (npm package `tree-sitter-fortran`). It is the standard free-form Fortran (F90+) grammar for Tree-sitter, with Node bindings, a `queries/` directory (e.g. `highlights.scm`) for AST node names, and support for building WASM via `tree-sitter build --wasm`.

**Design decisions:**

- **CLI — version:** Use **tree-sitter-fortran@0.1.0** with existing GitNexus `tree-sitter` ^0.21 (no CLI upgrade). This version declares `peerDependencies: { "tree-sitter": "^0.21.0" }` and is compatible with the current stack.
- **CLI — registration:** Register tree-sitter-fortran in the parser-loader's language map and in the parse-worker's language map so that when the pipeline requests `SupportedLanguages.Fortran`, the correct Tree-sitter language is set.
- **Web:** Build Fortran WASM from **tree-sitter-fortran@0.1.0** (same version as CLI) using an **in-repo script** that builds the WASM (e.g. clones or uses the grammar, runs `tree-sitter build --wasm`), then places the resulting `.wasm` in the web app (e.g. `gitnexus-web/public/wasm/fortran/tree-sitter-fortran.wasm`). The Web UI loads this custom-built WASM; it is not supplied by a prebuilt package. The script is part of the repository and is run as part of build/prepare when Fortran Web support is needed.

---

### 2.3 Symbol Extraction (Definitions) and Graph Schema Mapping

**Subsystem:** Symbols are extracted via Tree-sitter queries in `gitnexus/src/core/ingestion/tree-sitter-queries.ts`. Each language has a query string that captures definitions (with capture names like `definition.function`, `definition.class`), and optionally imports, calls, and heritage. The parsing processor and parse worker use these to create graph nodes with labels from `gitnexus/src/core/graph/types.ts` (`NodeLabel`: Function, Class, Module, etc.).

**Design changes:**

- **Fortran query set:** Define a Fortran Tree-sitter query that captures:
  - **Programs:** `program_statement` with `name` → map to **`Module`** (reuse existing label; no new Program label).
  - **Modules / submodules:** `module_statement`, `submodule_statement` with `name` → map to `Module` so they appear as first-class symbols.
  - **Procedures:** `function_statement`, `subroutine_statement`, `module_procedure_statement` with `name` → map to `Function` (and optionally distinguish subroutine vs function in properties if useful).
- **Capture names:** Follow the existing convention (`definition.*`, `import`, `call`, `heritage`) so that the same downstream processors (parsing, import, call, heritage) work without special-casing Fortran beyond the query and label mapping.
- **Schema:** Reuse existing `NodeLabel` values only; no new label for program units.

---

### 2.4 Import Resolution

**Subsystem:** `gitnexus/src/core/ingestion/import-processor.ts` resolves import paths to repository files and creates `IMPORTS` edges. It uses language-agnostic path resolution plus language-specific logic (e.g. TypeScript path aliases, Go modules, Rust `crate::`, PHP PSR-4, Swift SPM, JVM packages).

**Design changes:**

- **Fortran import constructs:**
  - **USE module_name:** Resolve using **convention**: treat the module name as a file stem and resolve to a file in the repository. Try extensions in a fixed order: **`.f90` first, then `.f`** (e.g. `USE foo` → try `foo.f90`, then `foo.f`). Use the shared extension list and suffix-based matching; the first matching file wins. Do not rely on a separate index of module definitions in the first version.
  - **INCLUDE 'path'** / **#include "path"**: Treat as file path includes; resolve relative to current file or repo root using the same strategy as C/C++ includes (with an extension list that includes `.f90`, `.f`, `.inc`, etc.).
- **Extension list:** Add `.f` and `.f90` to the shared list used for resolution (e.g. in `EXTENSIONS` or equivalent), with **`.f90` before `.f`** in the order used for USE resolution so that `USE foo` prefers `foo.f90` when both exist.
- **No extra config files:** Fortran has no universal project file like `go.mod` or `tsconfig.json` for module paths. Resolution is by convention only. Design may allow future extension for fpm or other manifests without implementing them now.
- **Behavior:** Every resolved `USE` or `INCLUDE` should produce an `IMPORTS` edge from the current file to the target file, so that impact analysis and dependency graphs remain correct.

---

### 2.5 Call Resolution and Enclosing Procedure

**Subsystem:** `gitnexus/src/core/ingestion/call-processor.ts` uses Tree-sitter queries to find call sites, then resolves the callee (symbol or file) and finds the enclosing function for the caller. It relies on a fixed set of AST node types that represent "function/subroutine definition" (`FUNCTION_NODE_TYPES`) and on language-specific logic in `findEnclosingFunction` to get the name of the enclosing procedure.

**Design changes:**

- **Fortran call sites:** The Fortran query must capture both:
  - Function-style calls: `call_expression` with the called name (e.g. identifier).
  - Subroutine calls: `subroutine_call` (e.g. `CALL name(...)`).
- **Enclosing procedure:** Add Fortran definition node types to the set used to find the enclosing callable (e.g. `function_statement`, `subroutine_statement`, `module_procedure_statement`). Define how to read the procedure name from these nodes (e.g. which Tree-sitter field or child holds the name) so that the caller side of a `CALLS` edge is correctly attributed to a Fortran function/subroutine node.
- **Callee resolution:** Reuse the existing strategy (symbol table + import map) so that calls to procedures defined in the same file or in `USE`d modules resolve to the right graph node. Design should state that Fortran follows the same "resolve by name within file/module scope" approach; no new relationship type is required.

---

### 2.6 Heritage (Inheritance / Type Extension)

**Subsystem:** `gitnexus/src/core/ingestion/heritage-processor.ts` uses the same language query strings to capture "heritage" (e.g. class extends, implements). It creates `EXTENDS` (and optionally `IMPLEMENTS`) edges between type/symbol nodes.

**Design changes:**

- **Fortran type extension:** Fortran has `TYPE ... EXTENDS(BaseType)`. The Fortran query must capture this (e.g. type name and parent type) with the same capture names used elsewhere (`heritage.class`, `heritage.extends`). The heritage processor can then create an `EXTENDS` edge from the derived type to the base type.
- **Mapping:** Map Fortran derived types to **`Struct`** so that existing tools (impact, context) understand them. No new relationship type is required; `EXTENDS` suffices.

---

### 2.7 Export / Visibility

**Subsystem:** `gitnexus/src/core/ingestion/parsing-processor.ts` uses `isNodeExported()` per language to mark symbols as public/exported, which influences entry-point scoring and process detection.

**Design changes:**

- **Fortran visibility:** Fortran modules have `PUBLIC` / `PRIVATE`; by default module entities are public. Use **PUBLIC/PRIVATE when available**: when the grammar exposes a PRIVATE marker (or equivalent) for a symbol, treat that symbol as not exported; otherwise treat as exported. Add a Fortran branch in `isNodeExported()` that implements this rule (e.g. by walking ancestors/siblings for visibility context if the tree-sitter-fortran AST exposes it).
- **Implementation point:** Add a Fortran branch in `isNodeExported()` that returns the chosen behavior and document it in this design.

---

### 2.8 Entry-Point Scoring and Process Detection

**Subsystem:** `gitnexus/src/core/ingestion/entry-point-scoring.ts` uses per-language name patterns (`ENTRY_POINT_PATTERNS`) and optional framework hints to score entry points. `gitnexus/src/core/ingestion/process-processor.ts` uses these scores and `CALLS` edges to detect execution flows.

**Design changes:**

- **Entry-point patterns for Fortran:** Define a small set of patterns for Fortran (e.g. `program` name = main program, or names like `main`, `run`, `solve`, `compute`). Add a `fortran` key to the pattern map so that Fortran procedures can be ranked as entry points and processes can be traced from them.
- **Framework detection:** Optional. Design may leave Fortran without path-based framework multipliers initially; if added later (e.g. fpm layout), it should plug into the same `detectFrameworkFromPath` / entry-point multiplier mechanism.

---

### 2.9 Pipeline and Worker Behavior

**Subsystem:** The main pipeline in `gitnexus/src/core/ingestion/pipeline.ts` filters files by `getLanguageFromFilename()` and `isLanguageAvailable()`. Worker-based parsing in the parse worker groups files by language and runs the same queries and extraction logic.

**Design changes:**

- **Availability:** Fortran is **required**: the Fortran grammar (`tree-sitter-fortran@0.1.0`) is a required dependency. When the grammar is loaded (parser-loader and parse-worker), Fortran must be available. If loading fails (e.g. install failure), the pipeline should fail rather than silently skipping Fortran files.
- **Chunking:** Fortran files are included in the same chunking and concurrency as other languages; no special pipeline phase is required. When a file is Fortran, every stage (structure, parsing, imports, calls, heritage, communities, processes) sees it as Fortran and uses Fortran-specific logic where defined above.

---

### 2.10 Search, MCP Tools, and Documentation

**Subsystem:** Symbols and relationships are stored in the graph; search (BM25 + semantic), MCP tools (query, context, impact, detect_changes, rename, cypher), and wiki generation all consume the graph. They are largely language-agnostic (they key off node labels and relationship types).

**Design changes:**

- **No new tools:** Existing MCP tools and resources operate on the graph; Fortran uses only existing node labels and relationship types (Function, Module, IMPORTS, CALLS, EXTENDS). No new label (e.g. Program) is introduced.
- **README / docs:** Supported-language lists and any "language support" documentation must be updated to include Fortran so that users and contributors know the behavior.

---

## 3. Web UI Specifics

**Subsystem:** The Web UI duplicates the language list, parser loader (WASM), and ingestion logic (queries, utils, import/call/heritage processors). It does not use the CLI's native Tree-sitter modules.

**Design changes:**

- **Language list and utils:** Mirror the Fortran language and file-extension mapping (`.f`, `.f90`) in the web codebase so that dropped or cloned repos with these extensions are recognized as Fortran.
- **WASM grammar:** Build Fortran WASM from tree-sitter-fortran@0.1.0 using an **in-repo script** (e.g. in `gitnexus-web/scripts/` or repo root) that produces the WASM and places it in the web app (e.g. `public/wasm/fortran/tree-sitter-fortran.wasm`). The Web UI loads this file; no prebuilt package supplies it. Run the script as part of build/prepare when building the web app with Fortran support.
- **Ingestion:** The same Fortran queries, import resolution rules (convention-based USE), call/heritage/export behavior (PUBLIC/PRIVATE when available), and entry-point patterns apply in the web ingestion pipeline so that graph shape and tool behavior are consistent with the CLI.

---

## 4. Dependencies and Constraints

- **Grammar:** [tree-sitter-fortran](https://github.com/stadelmanma/tree-sitter-fortran) at **version 0.1.0** (npm: `tree-sitter-fortran@0.1.0`). **Required dependency** (not optional). Use with GitNexus `tree-sitter` ^0.21 (no CLI upgrade). Node bindings for CLI; WASM built via an in-repo script for Web UI.
- **Tree-sitter version:** Remain on `tree-sitter` ^0.21; apply consistently in parser-loader and parse-worker.
- **Graph schema:** Reuse existing `NodeLabel` and `RelationshipType` values only; no new Program label.

---

## 5. Summary of Design Decisions (Resolved)

| Area                | Decision                                                                               |
| ------------------- | -------------------------------------------------------------------------------------- |
| File extensions     | **`.f`** and **`.f90`** only.                                                          |
| Program node        | Map `program_statement` to **`Module`**; reuse existing labels only.                   |
| Derived-type node   | Map Fortran derived types (TYPE … EXTENDS) to **`Struct`**.                            |
| tree-sitter-fortran | **tree-sitter-fortran@0.1.0** with existing `tree-sitter` ^0.21.                        |
| Grammar optional?   | **Required**; fail if grammar cannot be loaded; do not skip Fortran files.             |
| Web UI Fortran      | **In-repo script** builds WASM from tree-sitter-fortran@0.1.0; output e.g. `public/wasm/fortran/tree-sitter-fortran.wasm`. |
| USE resolution      | **Convention:** module name → file stem; try **`.f90` then `.f`** (first match wins).   |
| Export rule         | **Use PUBLIC/PRIVATE when available** from the grammar; otherwise treat as exported.  |


---

*This design document will be implemented in a separate implementation plan. No implementation steps or file-level patches are specified here.*
