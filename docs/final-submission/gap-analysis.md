# Gap Analysis: GitNexus + gitnexus-web vs LegacyLens G4 Submission

This document compares the **current state** of **GitNexus** (CLI, REST server) and the **GitNexus Browser Client** (gitnexus-web: React UI + Nexus AI) to the **LegacyLens final G4 submission requirements** in [docs/project-definition.md](../project-definition.md). The baseline is the app deployed at **https://gitnexus.smallcatlabs.com** (GitNexus Browser Client connected to a GitNexus backend serving an indexed LAPACK repo).

This analysis defines **gaps and goals** for a later mitigation plan. It is not a step-by-step plan. The goal is to meet project requirements in a clear, simple way without over-delivering or over-complicating.

---

## 1. Executive Summary

- **Current stack:** **GitNexus** (KuzuDB graph + symbol-level embeddings + hybrid search BM25/semantic/RRF) exposes tools via REST (`/api/search`, `/api/query`, `/api/tools/query`, `context`, `cypher`, `impact`, `wiki`). The **GitNexus Browser Client** (gitnexus-web) connects to that backend, loads graph + file contents, and runs **Nexus AI** (LangChain agent with search, cypher, grep, read, overview, explore, impact). So: natural-language query over LAPACK (Fortran) with answer generation and graph-backed retrieval.
- **Assignment expectation:** LegacyLens asks for a RAG pipeline (ingest → syntax-aware chunking → embeddings → vector DB → semantic search → retrieval → LLM), plus specific deliverables (Pre-Search, RAG Architecture doc, AI Cost Analysis, demo video, social post) and UI features (snippets with file/line, relevance scores, drill-down, ≥4 code-understanding features).
- **Result:** Core behavior is met (legacy codebase, NL query, retrieval, answers, deployment). **Graders have confirmed they will accept the symbolic graph + hybrid search approach** (no traditional chunk→vector-DB pipeline required). Gaps remain in: (1) **documentation** (RAG doc naming, Performance results filled in, AI Cost Analysis missing); (2) **query interface** (explicit relevance scores; Fortran syntax highlighting in Code Inspector only); (3) **code-understanding feature count** (confirm ≥4 and document); (4) **performance/validation** (latency, ingestion time not yet measured/reported); (5) **submission artifacts** (deployed link in README). Demo video and social post are **out of scope** for the mitigation plan (author will deliver).

---

## 2. MVP Requirements (Hard Gate)

Requirements from project-definition § MVP (24 Hours). All required to pass.

| Requirement | Status | Notes |
|-------------|--------|-------|
| Ingest at least one legacy codebase (COBOL, Fortran, or similar) | **Met** | LAPACK (Fortran) indexed via GitNexus. Fortran support: [docs/design/fortran-support.md](../design/fortran-support.md). |
| Chunk code files with syntax-aware splitting | **Different** | GitNexus uses **symbol-level** extraction (program/module/subroutine/function), not arbitrary text chunks. RAG doc frames this as syntax-aware "chunking" where chunk = symbol. |
| Generate embeddings for all chunks | **Different** | Embeddings are for **symbols** (and File nodes). No chunk table; [docs/rag-architecture.md](../rag-architecture.md) §2 documents this. |
| Store embeddings in a vector database | **Different** | KuzuDB holds graph + `CodeEmbedding` vectors; not a listed DB (Pinecone, etc.). RAG doc explains choice. |
| Implement semantic search across the codebase | **Met** | Hybrid search (BM25 + semantic + RRF) in gitnexus server; exposed via `/api/search` and agent search tool. Refs: `gitnexus/src/server/api.ts`, `gitnexus-web/src/workers/ingestion.worker.ts` `createHttpHybridSearch`. |
| Natural language query interface (CLI or web) | **Met** | gitnexus-web Nexus AI chat; backend mode uses HTTP tools. Refs: `gitnexus-web/src/hooks/useAppState.tsx` `sendChatMessage`, `initializeBackendAgent`. |
| Return relevant code snippets with file/line references | **Met** | Tool results include file path and line ranges. Code references panel (Code Inspector) shows file/line + snippet (`gitnexus-web/src/components/CodeReferencesPanel.tsx`); markdown code blocks in chat get syntax highlighting (`gitnexus-web/src/components/MarkdownRenderer.tsx`). |
| Basic answer generation using retrieved context | **Met** | LLM uses tool outputs (search, context, cypher, impact, etc.) to generate answers. |
| Deployed and publicly accessible | **Met** | **https://gitnexus.smallcatlabs.com** (user-confirmed; subdomain may change later). |

**References**

- Backend tools: `gitnexus/src/server/api.ts` (e.g. `/api/tools/query`, `context`, `cypher`, `impact`, `wiki`; `/api/search`, `/api/query`).
- Web backend mode: `gitnexus-web/src/workers/ingestion.worker.ts` (`initializeBackendAgent`, `createHttpExecuteQuery`, `createHttpHybridSearch`); `gitnexus-web/src/services/server-connection.ts` (`connectToServer`, `extractFileContents`); `gitnexus-web/src/App.tsx` (`handleServerConnect`).

**Open questions / issues / decisions**

- **Deployed link in repo:** README/submission should explicitly state the deployed URL (e.g. gitnexus.smallcatlabs.com) so graders can access it.
- **Architecture:** Graders have confirmed that documenting the symbol-level graph + KuzuDB + hybrid search as the chosen "RAG architecture" is sufficient; no parallel chunk-based pipeline required.

---

## 3. Target Codebase

| Requirement | Status | Notes |
|-------------|--------|-------|
| One primary codebase from list (or approved alternative) | **Met** | LAPACK (Fortran) is an allowed target. |
| Minimum 10,000+ LOC, 50+ files | **Met** | Reference LAPACK exceeds this. |

**Open questions / issues / decisions**

- None; no gap.

---

## 4. Core RAG Infrastructure

### 4.1 Ingestion Pipeline

| Component | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| File discovery | Recursively scan, filter by extension | **Met** | GitNexus analyzes by language/extensions. |
| Preprocessing | Encoding, whitespace, comments | **Partial** | AST-based parsing (Tree-sitter); no separate "extract comments" step. |
| Chunking | Syntax-aware (functions, paragraphs, sections) | **Different** | Symbol-level (subroutine, function, module, etc.). See RAG doc §3. |
| Metadata extraction | File path, line numbers, function names, dependencies | **Met** | Graph: `filePath`, `startLine`, `endLine`, CALLS, IMPORTS, etc. |
| Embedding generation | Vectors for each chunk | **Different** | Symbol-level embeddings. |
| Storage | Insert into vector DB with metadata | **Different** | KuzuDB graph + `CodeEmbedding` table. |

**References**

- Ingestion: `gitnexus/src/core/ingestion/` (pipeline, parsing, call/import/heritage processors); schema and embeddings in gitnexus KuzuDB layer.

**Open questions / issues / decisions**

- Whether to add an explicit "preprocessing" or "comments" section in docs for graders.

### 4.2 Retrieval Pipeline

| Component | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| Query processing | Parse NL, intent/entities | **Partial** | User message goes to LLM; tool choice is model-driven (no separate intent layer). |
| Embedding | Query to vector, same model as ingestion | **Met** | Server embeds query for semantic search; same model as ingestion. |
| Similarity search | Top-k similar chunks | **Met** | Hybrid search returns ranked symbols/processes. |
| Re-ranking | Optional | **Partial** | Process/symbol ranking in query tool; no explicit "re-rank chunks" step. |
| Context assembly | Combine chunks + surrounding context | **Partial** | Tool results (processes, definitions, context) feed the LLM. |
| Answer generation | LLM with retrieved context | **Met** | Streamed answer from agent. |

**References**

- [docs/rag-architecture.md](../rag-architecture.md) §4 (retrieval pipeline). Backend: `gitnexus/src/server/api.ts`; web agent: `gitnexus-web/src/core/llm/agent.ts`, `tools.ts`.

**Open questions / issues / decisions**

- None critical; "partial" items are acceptable if documented.

---

## 5. Chunking Strategies

| Requirement | Status | Notes |
|-------------|--------|-------|
| Document chunking approach | **Partial** | [docs/rag-architecture.md](../rag-architecture.md) §3 describes symbol-level "chunking" (function/module/subroutine). No standalone "Chunking Strategies" doc mapping to the assignment table (function-level, paragraph-level, etc.). |

**References**

- RAG doc §3; `gitnexus/src/core/ingestion/` (tree-sitter queries define symbol boundaries).

**Open questions / issues / decisions**

- **Decision:** Add a short subsection in the RAG doc (or a small "Chunking" section) that explicitly maps to the assignment’s strategies (e.g. function-level, hierarchical file → symbol) so graders see the requirement addressed.

---

## 6. Testing Scenarios

Assignment suggests testing with 6 query types (main entry point, functions modifying X, explain paragraph, file I/O, dependencies, error-handling patterns).

| Requirement | Status | Notes |
|-------------|--------|-------|
| Documented test scenarios | **Met** | [docs/testing-scenarios.md](../testing-scenarios.md): 10 LAPACK-tailored scenarios with expected outcomes. |
| Outcomes filled in | **Gap** | Outcomes table in that doc is "TBD"; no recorded results after running scenarios. |
| Script / automated run | **Partial** | Historical Lapack Lens had `lapack-lens/scripts/run_performance_tests.py`; no equivalent in repo for gitnexus-web + backend (script may exist elsewhere or need to be added). |

**References**

- [docs/testing-scenarios.md](../testing-scenarios.md). Backend tools support entry points, context, Cypher, impact (all support these query types).

**Open questions / issues / decisions**

- **Goal:** Run the 10 (or 6) scenarios against gitnexus.smallcatlabs.com (or local backend), record 1–2 sentence outcomes per scenario, and fill the Outcomes table.
- **Optional:** Add a small script that runs a fixed query set against the backend + optional LLM step, to produce repeatable results for the doc.

---

## 7. Performance Targets

| Metric | Target | Status | Notes |
|--------|--------|--------|-------|
| Query latency | <3 s end-to-end | **Unknown** | Not measured or reported. |
| Retrieval precision | >70% relevant in top-5 | **Unknown** | No precision evaluation. |
| Codebase coverage | 100% of files indexed | **Assumed** | GitNexus indexes by extension; assume full for LAPACK. |
| Ingestion throughput | 10k+ LOC in <5 min | **Unknown** | LAPACK is large; ingestion time not documented. |
| Answer accuracy | Correct file/line references | **Unknown** | No formal check. |

**References**

- [docs/rag-architecture.md](../rag-architecture.md) §6 says to "update this section with a short summary" after running the performance script (latency, ingestion time). No numbers in repo yet.

**Open questions / issues / decisions**

- **Goal:** Measure and document: (1) end-to-end query latency (e.g. p50/p95) for a small set of queries; (2) LAPACK ingestion time; (3) optionally retrieval precision for a few queries. Update RAG doc §6 and, if useful, add a short "Performance & evaluation" section.
- **Decision:** Whether to run the old Lapack Lens performance script against the new backend or add a new minimal script for gitnexus-web + backend.

---

## 8. Required Features

### 8.1 Query Interface

| Feature | Required | Status | Notes |
|---------|----------|--------|-------|
| Natural language input | Yes | **Met** | Nexus AI chat input. |
| Display retrieved code snippets with syntax highlighting | Yes | **Partial** | Code blocks in markdown use Prism (`gitnexus-web/src/components/MarkdownRenderer.tsx`). Code Inspector panel (Code references) uses Prism (`gitnexus-web/src/components/CodeReferencesPanel.tsx`); **Fortran syntax highlighting is not yet applied** to Fortran code sections in that panel—add Fortran highlighting there only, without changing other panel appearance or behavior. |
| File paths and line numbers for each result | Yes | **Met** | Code references have `filePath`, `startLine`, `endLine` and are shown in the Code Inspector panel. |
| Confidence/relevance scores for retrieved chunks | Yes | **Gap** | Backend/search returns scores; not surfaced in the UI as "relevance score" per result. |
| Generated explanation/answer from LLM | Yes | **Met** | Assistant message is the answer. |
| Drill down into full file context | Yes | **Met** | Drill-down to specific files is already implemented (e.g. from code references). |

**References**

- `gitnexus-web/src/components/MarkdownRenderer.tsx` (Prism code blocks, code-ref/node-ref links).
- `gitnexus-web/src/components/CodeReferencesPanel.tsx` (syntax highlighting, file/line, snippet).
- `gitnexus-web/src/hooks/useAppState.tsx` (addCodeReference, codeReferences, IMPACT parsing for blast radius).

**Open questions / issues / decisions**

- **Relevance scores:** Decide whether to show a numeric or ordinal "relevance" in the code references panel or in the chat (e.g. from search tool output). Backend already returns scores in hybrid search.
- **Fortran highlighting:** Add Fortran syntax highlighting for Fortran code sections displayed in the Code Inspector panel only; do not change any other aspect of the panel's appearance or behavior.

### 8.2 Code Understanding Features (at least 4 required)

| Feature | Status | Notes |
|---------|--------|-------|
| Code explanation | **Met** | LLM explains using search/context/explore results. |
| Dependency mapping | **Met** | Explore tool (incoming/outgoing, CALLS/IMPORTS); Cypher available. |
| Pattern detection | **Partial** | Search finds similar symbols; no dedicated "pattern" feature. |
| Impact analysis | **Met** | Impact tool in web agent uses Cypher (backend mode uses `createHttpExecuteQuery`); blast radius can be visualized (IMPACT parsing in useAppState). |
| Documentation generation | **Partial** | Server has `/api/tools/wiki`; gitnexus-web does **not** expose a wiki tool to the agent. |
| Translation hints | **Gap** | Not implemented. |
| Bug pattern search | **Gap** | Not implemented. |
| Business logic extraction | **Partial** | Query + LLM can approximate; no dedicated feature. |

**References**

- Web tools: `gitnexus-web/src/core/llm/tools.ts` (search, cypher, grep, read, overview, explore, impact). No `wiki` in web client.
- Backend: `gitnexus/src/server/api.ts` (`/api/tools/impact`, `/api/tools/wiki`). Impact in backend mode works via Cypher (impact tool runs Cypher under the hood).

**Open questions / issues / decisions**

- **Count:** Code explanation, dependency mapping, impact analysis are clearly implemented. Pattern detection and business logic are partial. Need to confirm **at least 4** for the rubric: e.g. count (1) code explanation, (2) dependency mapping, (3) impact analysis, (4) documentation generation if wiki is exposed, or (4) pattern detection if we document "search over symbols = pattern discovery."
- **Wiki:** Decide whether to add a "wiki" tool in gitnexus-web that calls `/api/tools/wiki` (long-running) to reach 4+ features or to rely on the current four (explanation, dependency, impact, + one of pattern/doc).
- **Explicit list:** In submission or README, list the 4+ "code understanding features" and where they are (Nexus AI tools + UI).

---

## 9. Vector Database Selection

| Requirement | Status | Notes |
|-------------|--------|-------|
| Choose ONE vector database; document rationale | **Met** | KuzuDB (graph + vector index) is used. [docs/rag-architecture.md](../rag-architecture.md) §1 documents the choice and rationale. **Graders have confirmed** they accept this approach (symbolic graph + hybrid search) instead of the traditional RAG pipeline. |

**References**

- [docs/rag-architecture.md](../rag-architecture.md) §1.

**Open questions / issues / decisions**

- None; graders accept the documented KuzuDB choice.

---

## 10. Embedding Models

| Requirement | Status | Notes |
|-------------|--------|-------|
| Choose embedding model; document | **Met** | [docs/rag-architecture.md](../rag-architecture.md) §2: Snowflake/snowflake-arctic-embed-xs (384 dims, transformers.js). |

**References**

- [docs/rag-architecture.md](../rag-architecture.md) §2.

**Open questions / issues / decisions**

- None.

---

## 11. AI Cost Analysis (Required)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Development & testing costs (embedding API, LLM API, vector DB, total) | **Gap** | No AI Cost Analysis document in repo. |
| Production cost projections (100 / 1K / 10K / 100K users per month) | **Gap** | Same; required table and assumptions missing. |

**References**

- project-definition § AI Cost Analysis (required). No `docs/*cost*` or similar file found.

**Open questions / issues / decisions**

- **Goal:** Add a document (e.g. `docs/final-submission/ai-cost-analysis.md` or `docs/ai-cost-analysis.md`) with: (1) dev/test spend breakdown (embedding tokens, LLM calls, any vector DB/hosting); (2) production projections table and assumptions. **LLM provider:** Switch to **Google Gemini**; use usage data from that platform (via CLI or API, or manual export with direction) to fill dev costs.

---

## 12. RAG Architecture Documentation (Required)

| Section | Required | Status | Notes |
|---------|----------|--------|-------|
| Vector DB selection | Yes | **Met** | [docs/rag-architecture.md](../rag-architecture.md) §1. |
| Embedding strategy | Yes | **Met** | §2. |
| Chunking approach | Yes | **Met** | §3 (symbol-level). |
| Retrieval pipeline | Yes | **Met** | §4. |
| Failure modes | Yes | **Met** | §5. |
| Performance results | Yes | **Gap** | §6 exists but asks to "update after running the script"; no actual latency/ingestion numbers yet. |

**References**

- [docs/rag-architecture.md](../rag-architecture.md). Update doc to use "GitNexus Browser Client" where it currently says "Lapack Lens" or "gitnexus-web" so it reflects current naming.

**Open questions / issues / decisions**

- **Naming:** Use "GitNexus Browser Client" in the RAG doc for the web client.
- **Performance results:** Fill §6 with measured latency and ingestion time (see §7 above); optionally add a sentence that retrieval precision was spot-checked for a few queries.

---

## 13. Submission Requirements

| Deliverable | Required | Status | Notes |
|-------------|----------|--------|-------|
| GitHub repository | Setup guide, architecture overview, deployed link | **Partial** | README has setup; architecture could point to RAG doc and/or DESIGN; **deployed link** (gitnexus.smallcatlabs.com) not yet in README. |
| Demo video (3–5 min) | Queries, retrieval results, answer generation | **Out of scope** | Author will record and link; not part of mitigation plan. |
| Pre-Search document | Phase 1–3 checklist | **Met** | [docs/pre-search.md](../pre-search.md). Note: project later pivoted to GitNexus (no Pinecone/Voyage/LangChain); treat as historical. |
| RAG Architecture doc | 1–2 pages, template sections | **Partial** | Exists; needs client name update ("GitNexus Browser Client") and §6 filled. |
| AI Cost Analysis | Dev spend + projections | **Gap** | Missing (see §11). Use Google Gemini usage data (CLI/API or manual). |
| Deployed application | Publicly accessible | **Met** | https://gitnexus.smallcatlabs.com. |
| Social post | X or LinkedIn, description, features, demo/screenshots, @GauntletAI | **Out of scope** | Author will publish; not part of mitigation plan. |

**References**

- Root [README.md](../../README.md); [docs/project-introduction.md](../project-introduction.md); [docs/README.md](../README.md).

**Open questions / issues / decisions**

- **README:** Add a clear "Deployed demo" or "Try it" link: https://gitnexus.smallcatlabs.com (and update when subdomain changes).
- **Demo video / social post:** Author will create and publish; out of scope for mitigation plan.

---

## 14. Summary of Gaps (for Mitigation Planning)

Grouped by category for the future step-by-step mitigation plan. Each item is a **goal or area** to address, not a task list.

### Documentation

- **RAG Architecture doc:** Update "Lapack Lens" / "gitnexus-web" → **GitNexus Browser Client**; fill §6 Performance results with measured latency and ingestion time.
- **Chunking:** Optionally add a short mapping in RAG doc (or separate subsection) to assignment’s chunking strategies table.
- **AI Cost Analysis:** Create document with dev/test spend and production projections (100/1K/10K/100K users). Use **Google Gemini** as LLM provider; gather usage via Gemini CLI/API or manual export with direction.
- **Deployed link:** Add https://gitnexus.smallcatlabs.com to README (and submission).

### Query interface

- **Relevance scores:** Surface relevance/confidence for retrieved results in the UI (e.g. in code references or chat).
- **Fortran highlighting:** Add Fortran syntax highlighting for Fortran code sections in the **Code Inspector panel** only; no other changes to the panel's appearance or behavior.

### Code-understanding features

- **Confirm ≥4:** Document which four (or more) features are implemented (explanation, dependency mapping, impact analysis, + pattern or doc or other) and where (Nexus AI tools + UI).
- **Wiki (optional):** Decide whether to expose server wiki via a tool in the Browser Client to count as "Documentation generation."

### Testing and performance

- **Testing scenarios:** Run the 10 (or 6) scenarios, record outcomes, fill the Outcomes table in [docs/testing-scenarios.md](../testing-scenarios.md).
- **Performance:** Measure query latency and ingestion time; optionally retrieval precision; update RAG doc §6.

### Submission artifacts

- **Deployed link in README:** In scope (see Documentation).
- **Demo video / social post:** Out of scope; author will deliver.

---

## 15. Architectural Note (No Gap)

The assignment describes a **classic RAG** pipeline (chunks → embed → vector DB → search → LLM). This project uses a **symbol-graph + hybrid search** pipeline (parse → graph + symbol embeddings → KuzuDB → hybrid search + tools → LLM). Both deliver "natural language over legacy code." **Graders have confirmed they accept this approach**; the RAG Architecture doc should frame the graph+hybrid design as the chosen architecture. No code change is required for this framing.

---

*Baseline: GitNexus + GitNexus Browser Client (gitnexus-web); deployment: https://gitnexus.smallcatlabs.com. Previous analysis: [docs/legacy-lens/gap-analysis-legacylens.md](../legacy-lens/gap-analysis-legacylens.md).*
