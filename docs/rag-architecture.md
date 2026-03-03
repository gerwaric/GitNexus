# RAG Architecture (GitNexus / Lapack Lens)

This document describes the retrieval architecture used by **Lapack Lens** to answer natural-language questions about the LAPACK (Fortran) codebase. Lapack Lens queries the **GitNexus** server via REST; GitNexus provides a symbol-level knowledge graph, hybrid search, and tools that together form the “RAG” pipeline.

---

## 1. Vector DB / graph store selection

**Choice:** GitNexus uses **KuzuDB** as a single store for both the code graph (nodes and relationships) and vector embeddings.

- **Graph:** Node tables (File, Function, Class, Method, etc.) and a single `CodeRelation` table with types such as CALLS, IMPORTS, EXTENDS, STEP_IN_PROCESS. This supports dependency traversal, impact analysis, and process detection.
- **Vectors:** A separate `CodeEmbedding` table stores 384-dimensional vectors keyed by `nodeId`, with a vector index `code_embedding_idx` (cosine similarity, HNSW).
- **Full-text:** KuzuDB’s built-in FTS indexes on File, Function, Class, Method, and Interface support BM25-style keyword search.

**Rationale:** Using one system (KuzuDB) for graph, vectors, and FTS keeps the pipeline simple and avoids synchronizing multiple stores. Symbol-level nodes give clear boundaries for both graph traversal and “chunk” semantics (see §3). The assignment’s “vector database” requirement is met by KuzuDB’s native vector index; the graph layer supports features (dependency mapping, impact analysis) that go beyond classic chunk-only RAG.

---

## 2. Embedding strategy

**Model:** GitNexus uses **Snowflake/snowflake-arctic-embed-xs** (transformers.js, 384 dimensions, ~22M parameters). It is loaded once at first search (or during `gitnexus analyze --embeddings`) and reused.

**What is embedded:** Only **symbol-level** nodes: Function, Class, Method, Interface, and File. For each node, the pipeline builds a short text (name, type, file path, and a cleaned code snippet up to ~500 characters) and embeds that. There are no free-form text “chunks” spanning arbitrary character ranges.

**Rationale:** Symbol-level embedding avoids chunk-boundary ambiguity and aligns with the graph (one node = one symbol). The small model (arctic-embed-xs) keeps latency and resource use low for server and browser; 384 dims are sufficient for semantic ranking when combined with BM25 via RRF.

---

## 3. Chunking approach

**Approach:** GitNexus does **syntax-aware, symbol-level “chunking”**: each unit of storage and retrieval is a **code symbol** (function, subroutine, class, method, file, etc.), not a fixed-size or sliding-window text chunk.

- **Ingestion:** The analyzer (e.g. Tree-sitter) parses the repo and creates one graph node per symbol, with `filePath`, `startLine`, `endLine`, and optional `content`.
- **Mapping to assignment terms:** This corresponds to “syntax-aware chunking” where “chunk” = one function/class/method/module. Boundaries are defined by the AST, so there is no split in the middle of a routine or type.

**Rationale:** Symbol-level granularity gives unambiguous file/line references and allows the graph to represent CALLS, IMPORTS, and STEP_IN_PROCESS. It also avoids the “chunk boundary” problem of classic RAG where a function can be split across two chunks.

---

## 4. Retrieval pipeline

**Query flow (Lapack Lens → GitNexus → OpenAI):**

1. **User question** → Lapack Lens sends it to OpenAI with tool definitions (query, context, cypher, impact, wiki).
2. **Tool calls:** The model chooses tools; Lapack Lens calls GitNexus REST:
   - **POST /api/tools/query:** Hybrid search (BM25 + semantic) over the graph, then process grouping and ranking; returns processes, process_symbols, definitions.
   - **POST /api/tools/context:** Resolves a symbol by name/uid/file_path; returns incoming/outgoing refs, process participation, file/line.
   - **POST /api/tools/cypher:** Runs a Cypher query on the graph.
   - **POST /api/tools/impact:** Blast-radius analysis from a given symbol (upstream/downstream).
   - **POST /api/tools/wiki:** Triggers wiki generation (long-running).
3. **Hybrid search (inside GitNexus):** For each query, BM25 (FTS) and semantic (vector) search run; results are merged with **Reciprocal Rank Fusion (RRF, k=60)**. If embeddings are not loaded, only BM25 is used.
4. **Re-ranking / context assembly:** The query tool groups matches by execution process and ranks processes; the LLM receives tool outputs and assembles the final answer, citing file paths and line ranges when relevant.

**Rationale:** RRF avoids normalizing scores across BM25 and cosine distance; combining keyword and semantic results improves recall. Exposing query, context, cypher, impact, and wiki as tools lets the model choose the right retrieval strategy per question.

---

## 5. Failure modes

- **No results:** Empty query or no matching symbols → tools return empty lists or “not found”; the LLM can say so or suggest rephrasing.
- **Backend unreachable:** GitNexus down or wrong URL → REST client returns connection/error; Lapack Lens surfaces a short error (e.g. “GitNexus server unreachable”).
- **Timeouts:** Search and context use a 60s timeout; wiki uses 600s. On timeout, the client returns a message so the user knows the operation did not complete.
- **Embeddings not loaded:** If the embedding model is not initialized (e.g. embeddings disabled or first request), semantic search is skipped and only BM25 (FTS) is used, so search still works with lower semantic recall.

---

## 6. Performance results

Performance is measured by an automated **performance script** that simulates the chat (HTTP to GitNexus + OpenAI tool loop), runs a list of test queries (see `docs/testing-scenarios.md`), and records latency per query. The script is documented in `lapack-lens/README.md` (or the script directory) and produces a report (e.g. JSON or markdown).

- **Query latency:** Target &lt;3 s end-to-end per query; actual p50/p95 or min/max are recorded in the report and can be summarized here after a run.
- **Ingestion:** LAPACK indexing time (from Docker build or one-off `gitnexus analyze`) is recorded once and reported (e.g. “LAPACK indexed in X min”).

After running the script, update this section with a short summary (e.g. “Latency p50 X.X s, p95 X.X s; ingestion X min for LAPACK”) and reference the report file.
