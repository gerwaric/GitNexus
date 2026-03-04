# Gap Analysis: Current State vs LegacyLens Final Submission Requirements

This document compares the **current state** of the GitNexus repo and the Lapack Lens application to the **final submission requirements** in [docs/project-definition.md](./project-definition.md) (LegacyLens: Building RAG Systems for Legacy Enterprise Codebases).

---

## 1. Executive Summary

- **Current approach:** Lapack Lens uses **GitNexus** (knowledge graph + hybrid search + MCP-style tools) with a Streamlit chat and OpenAI to answer questions about the LAPACK (Fortran) codebase. It is **not** a classic vector-RAG pipeline (no chunk-based embeddings, no separate vector database for chunks).
- **Assignment expectation:** LegacyLens asks for a **RAG pipeline**: ingest → syntax-aware chunking → embeddings → vector DB → semantic search → retrieval → LLM answer generation, with explicit deliverables (Pre-Search, RAG Architecture doc, AI Cost Analysis, demo video, social post).
- **Result:** Many **functional** goals are met (legacy codebase, natural language query, answer generation, deployment), but **architecture** and **deliverables** diverge. Several required docs and UI features are missing; the project would need either to document the graph-based approach as "RAG architecture" and add missing deliverables, or to add a parallel/alternative RAG pipeline to satisfy the rubric literally.

---

## 2. MVP Requirements (Hard Gate)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Ingest at least one legacy codebase (COBOL, Fortran, or similar) | **Met** | LAPACK (Fortran) is ingested via GitNexus; Fortran support is implemented in GitNexus (see [docs/design/fortran-support.md](design/fortran-support.md)). |
| Chunk code files with syntax-aware splitting | **Different** | GitNexus uses **symbol-level** extraction (programs, modules, subroutines, functions) and graph structure, not chunk-based splitting. No "chunks" in the vector-RAG sense. |
| Generate embeddings for all chunks | **Different** | GitNexus has semantic embeddings for **symbols** and hybrid (BM25 + semantic) search; there are no "chunks" to embed in the assignment sense. |
| Store embeddings in a vector database | **Different** | KuzuDB holds the **graph** and supports vector search; it is not used as "chunk → vector DB" in the way the assignment describes (Pinecone, Weaviate, Qdrant, etc.). |
| Implement semantic search across the codebase | **Met** | Hybrid search (BM25 + semantic + RRF) is implemented and exposed via `query` tool. |
| Natural language query interface (CLI or web) | **Met** | Streamlit web chat; natural language questions are answered via OpenAI + GitNexus tools. |
| Return relevant code snippets with file/line references | **Partial** | Backend returns symbol names, file paths, and optional content; UI shows LLM response (markdown). No dedicated "snippet" UI with file/line + syntax highlighting. |
| Basic answer generation using retrieved context | **Met** | OpenAI uses tool results (query, context, cypher) to generate answers. |
| Deployed and publicly accessible | **Met** | Fly.io deployment (e.g. `https://lapack-lens.fly.dev`), Docker Compose for local run. |

**Verdict:** Functionally the app delivers "query legacy Fortran codebase in natural language and get answers," but it does **not** implement the literal MVP stack (chunk → embed → vector DB). A grader expecting "vector database + embeddings for chunks" would mark the chunk/embed/vector-store items as not satisfied unless the submission explicitly reframes the architecture (see Section 15).

---

## 3. Target Codebase

| Requirement | Status | Notes |
|-------------|--------|--------|
| One primary codebase from list (or approved alternative) | **Met** | LAPACK (Fortran) is an allowed target. |
| Minimum 10,000+ LOC, 50+ files | **Met** | Reference-LAPACK far exceeds this. |

---

## 4. Core RAG Infrastructure

### 4.1 Ingestion Pipeline

| Component | Requirement | Status | Notes |
|-----------|-------------|--------|--------|
| File discovery | Recursively scan, filter by extension | **Met** | GitNexus pipeline filters by language (e.g. `.f`, `.f90`). |
| Preprocessing | Encoding, whitespace, comments | **Partial** | Parsing is AST-based; encoding/whitespace handling is implicit in Tree-sitter. No explicit "extract comments" step. |
| Chunking | Syntax-aware (functions, paragraphs, sections) | **Different** | Symbol-level extraction (modules, subroutines, functions), not chunk-based. |
| Metadata extraction | File path, line numbers, function names, dependencies | **Met** | Graph has file path, line ranges, symbol names, IMPORTS/CALLS/EXTENDS. |
| Embedding generation | Vectors for each chunk | **Different** | Symbol-level (and possibly file-level) embeddings in GitNexus; no "chunks." |
| Storage | Insert into vector database with metadata | **Different** | Graph + vectors in KuzuDB; not "chunks in vector DB" as in the template. |

### 4.2 Retrieval Pipeline

| Component | Requirement | Status | Notes |
|-----------|-------------|--------|--------|
| Query processing | Parse NL, intent/entities | **Partial** | User query goes to LLM; tools are invoked from model (no separate "intent" layer). |
| Embedding | Query to vector, same model as ingestion | **Met** | Query is embedded for semantic search in GitNexus. |
| Similarity search | Top-k similar chunks | **Met** | Hybrid search returns ranked symbols/processes (conceptually "top-k"). |
| Re-ranking | Optional | **Partial** | Process/symbol ranking exists; no explicit "re-rank retrieved chunks" step. |
| Context assembly | Combine chunks + surrounding context | **Partial** | Tool results (processes, symbols, definitions) are assembled by the LLM. |
| Answer generation | LLM with retrieved context | **Met** | OpenAI uses tool results to generate answers. |

---

## 5. Chunking Strategies

| Requirement | Status | Notes |
|-------------|--------|--------|
| Document chunking approach | **Missing** | No dedicated "Chunking Strategies" doc. GitNexus uses symbol boundaries (program/module/subroutine/function); this could be documented as "function-level" and "hierarchical" (file → symbol). |

---

## 6. Testing Scenarios

The assignment suggests testing with queries like:

1. "Where is the main entry point of this program?"
2. "What functions modify the CUSTOMER-RECORD?"
3. "Explain what the CALCULATE-INTEREST paragraph does"
4. "Find all file I/O operations"
5. "What are the dependencies of MODULE-X?"
6. "Show me error handling patterns in this codebase"

| Scenario | Status | Notes |
|----------|--------|--------|
| (1) Main entry point | **Supported** | Entry-point scoring and process detection in GitNexus; query/context can surface main programs. |
| (2) Functions modifying X | **Supported** | Context (incoming/outgoing) and Cypher can show call/data flow; "modify" may need Cypher or heuristics. |
| (3) Explain paragraph | **Supported** | LAPACK is subroutine/function-based; "paragraph" maps to procedure; context + LLM can explain. |
| (4) File I/O operations | **Supported** | Query for "I/O" or "read/write" and Cypher can help. |
| (5) Dependencies of MODULE-X | **Supported** | Context tool and IMPORTS/CALLS in graph. |
| (6) Error handling patterns | **Supported** | Query + optional Cypher. |

No formal **test script or evaluation results** for these scenarios was found; adding a short "Testing scenarios" section with example queries and outcomes would strengthen the submission.

---

## 7. Performance Targets

| Metric | Target | Status | Notes |
|--------|--------|--------|--------|
| Query latency | <3 s end-to-end | **Unknown** | Not measured or documented. |
| Retrieval precision | >70% relevant in top-5 | **Unknown** | No precision evaluation. |
| Codebase coverage | 100% of files indexed | **Assumed** | GitNexus indexes by extension; Fortran files should be fully indexed. |
| Ingestion throughput | 10k+ LOC in <5 min | **Unknown** | LAPACK is large; Docker build indexes at build time (10–30+ min noted in README). |
| Answer accuracy | Correct file/line references | **Unknown** | No formal check; depends on model and tool results. |

**Gap:** No performance or evaluation report. Recommendation: add a short "Performance & evaluation" section (latency, optional precision sample, ingestion time for LAPACK).

---

## 8. Required Features

### 8.1 Query Interface

| Feature | Required | Status | Notes |
|---------|----------|--------|--------|
| Natural language input | Yes | **Met** | Chat input. |
| Display retrieved code snippets with syntax highlighting | Yes | **Gap** | Responses are markdown only; no dedicated snippet component with Fortran syntax highlighting. |
| File paths and line numbers for each result | Yes | **Partial** | Data exists in tool responses; UI does not consistently surface file/line per "result card." |
| Confidence/relevance scores for retrieved chunks | Yes | **Partial** | Backend has ranking/confidence; not exposed as "relevance score" in the UI. |
| Generated explanation/answer from LLM | Yes | **Met** | Assistant message is the generated answer. |
| Drill down into full file context | Yes | **Gap** | No "view full file" or expand-to-file in the UI; `include_content` can be used by the model but not surfaced as drill-down. |

### 8.2 Code Understanding Features (at least 4)

| Feature | Status | Notes |
|---------|--------|--------|
| Code explanation | **Met** | LLM explains using context/query results. |
| Dependency mapping | **Met** | Context tool (incoming/outgoing, IMPORTS/CALLS) and Cypher. |
| Pattern detection | **Partial** | Query can find similar symbols; no dedicated "pattern" feature. |
| Impact analysis | **Gap** | GitNexus has `impact` tool; Lapack Lens does **not** expose it via REST or in the UI. |
| Documentation generation | **Gap** | GitNexus has `wiki`; not integrated into Lapack Lens. |
| Translation hints | **Gap** | Not implemented. |
| Bug pattern search | **Gap** | Not implemented. |
| Business logic extraction | **Partial** | Can be approximated via query + LLM; no dedicated feature. |

**Count:** 2–3 clearly implemented (explanation, dependency mapping; pattern partially). **Gap:** Expose **impact** (and optionally **wiki**) and/or add one more (e.g. "impact analysis" + "documentation generation") to reach 4+.

---

## 9. Vector Database and Embedding Selection

| Requirement | Status | Notes |
|-------------|--------|--------|
| Choose ONE vector database; document rationale | **Different** | KuzuDB is used as graph + vector store; it is not one of the listed options (Pinecone, Weaviate, Qdrant, ChromaDB, pgvector, Milvus). Submission could document "KuzuDB as graph+vector store" and rationale. |
| Choose embedding model; document | **Partial** | GitNexus uses embeddings (e.g. transformers.js or API); model and rationale not documented in Lapack Lens / RAG terms. |

---

## 10. AI Cost Analysis (Required)

| Requirement | Status | Notes |
|-------------|--------|--------|
| Development & testing costs (embedding API, LLM API, vector DB, total) | **Planned** | To be tackled later by pulling usage data from OpenAI. |
| Production cost projections (100 / 1K / 10K / 100K users per month) | **Planned** | Will be included when AI Cost Analysis is written. |

**Status:** AI Cost Analysis is planned; no code or doc changes until OpenAI usage data is available.

---

## 11. RAG Architecture Documentation (Required)

| Section | Required | Status | Notes |
|---------|----------|--------|--------|
| Vector DB selection | Yes | **Missing** | No 1–2 page RAG Architecture doc. KuzuDB/graph approach could be described here. |
| Embedding strategy | Yes | **Missing** | Not documented in RAG terms. |
| Chunking approach | Yes | **Missing** | Symbol-level "chunking" could be documented. |
| Retrieval pipeline | Yes | **Missing** | Query flow (query/context/cypher → LLM) could be described. |
| Failure modes | Yes | **Missing** | Not documented. |
| Performance results | Yes | **Missing** | No latency/precision numbers. |

**Gap:** A single **RAG Architecture** (or "Retrieval Architecture") document is required. **Plan:** Investigate and document what GitNexus does on the RAG front (embeddings, search, retrieval pipeline); write the doc without making changes to GitNexus unless required.

---

## 12. Submission Deliverables

| Deliverable | Required | Status | Notes |
|-------------|----------|--------|--------|
| GitHub repository | Setup guide, architecture overview, deployed link | **Partial** | README has setup and deploy; "architecture overview" could point to DESIGN.md or a new RAG doc. Deployed link (e.g. Fly URL) should be explicit. |
| Pre-Search document | Phase 1–3 checklist | **Met** | [docs/pre-search.md](./pre-search.md) contains the completed Phase 1–3 checklist. **Note:** Treat as historical; the project later changed to a GitNexus-based stack (no Pinecone/Voyage/LangChain). |
| RAG Architecture doc | 1–2 pages, template sections | **In progress** | To be written by investigating and documenting what GitNexus does on the RAG/retrieval front; no code changes unless required. |
| AI Cost Analysis | Dev spend + projections | **Planned** | To be done later by pulling usage data from OpenAI. |
| Deployed application | Publicly accessible | **Met** | Fly.io deployment. |
| Social post | X or LinkedIn, @GauntletAI | **Unknown** | Cannot verify; not in repo. |
| Demo video (3–5 min) | Queries, retrieval, answer generation | **Planned** | To be handled separately after technical work is complete. |

---

## 13. Fortran Support (GitNexus)

Fortran support is **designed** in [docs/design/fortran-support.md](design/fortran-support.md) and **implemented** in GitNexus (language enum, parser-loader, tree-sitter-queries, import/call/heritage/entry-point, etc.). LAPACK is indexed as Fortran. No gap for "support a Fortran codebase" for this project.

---

## 14. Summary of Gaps (Prioritized)

### Critical (required for submission)

1. **Pre-Search document** — **Done.** [docs/pre-search.md](./pre-search.md) contains the completed Phase 1–3 checklist. Treat as historical; the project later pivoted to GitNexus (no Pinecone/Voyage/LangChain).
2. **RAG Architecture document** — **In progress.** Investigate and document what GitNexus does on the RAG/retrieval front (vector/graph store, embedding strategy, chunking/symbol approach, retrieval pipeline, failure modes, performance). No GitNexus code changes unless required.
3. **AI Cost Analysis** — **Planned.** To be done later by pulling usage data from OpenAI (dev spend + production projections for 100/1K/10K/100K users).
4. **Demo video** — **Planned.** To be handled separately after technical work is complete (3–5 min: queries, retrieval, answer generation).

### Important (likely to be checked)

5. **Query interface completeness** — Syntax-highlighted code snippets, file/line per result, relevance scores, drill-down to full file.
6. **At least 4 code-understanding features** — Add REST + UI for **impact** (and optionally **wiki**), or document how existing tools map to 4 features; consider adding one more (e.g. doc generation or pattern detection).
7. **Performance & evaluation** — Document query latency, retrieval precision (e.g. for 5–10 test queries), ingestion time.

### Optional (strengthen submission)

8. **Testing scenarios** — Short doc or section with example queries (from assignment) and sample answers.
9. **Explicit deployed link** — In README and submission (e.g. `https://lapack-lens.fly.dev`).
10. **Social post** — As required by assignment.

---

## 15. Architectural Note: Graph vs Vector RAG

The assignment is written for a **classic RAG** pipeline: chunks → embeddings → vector DB → similarity search → context → LLM. Lapack Lens uses a **graph-based** pipeline: parse → symbol graph + hybrid search (BM25 + semantic) → tool API → LLM. Both achieve "natural language over legacy code"; the graph approach can be **documented as the chosen architecture** in the RAG Architecture doc (e.g. "We use a symbol-graph and hybrid search instead of chunk-based vector search because …"). That way you satisfy the "document your architecture" requirement without rebuilding the system. If the rubric strictly requires "a vector database from the list" and "chunk-based embeddings," you would need either to add a parallel RAG path (e.g. chunk LAPACK, embed, store in ChromaDB/pgvector) and document both, or to get explicit approval to treat the graph+hybrid design as the RAG architecture.

---

*Document generated from README.md, CLAUDE.md, AGENTS.md, docs/design/fortran-support.md, docs/project-definition.md, and Lapack Lens implementation (DESIGN.md, IMPLEMENTATION_PLAN.md, app/, Dockerfile, fly.toml).*
