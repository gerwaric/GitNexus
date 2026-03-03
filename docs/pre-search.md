# Completed Pre-Search Checklist

## Phase 1: Define Your Constraints

### 1. Scale & Load Profile
1. **How large is your target codebase (LOC, file count)?**  
   - **Selected:** Index **LAPACK** broadly (full repo or clearly documented subset) and verify it exceeds **10,000+ LOC** and **50+ files**.  
   - **Reasoning:** LAPACK easily satisfies the minimum size; broad indexing reduces “missing context” failures in navigation queries.  
   - **Options considered:** index subset for speed (risk: missing dependencies/coverage).

2. **Expected query volume?**  
   - **Selected:** Assume **demo-scale** for G4: ~1–5 users; ~10–50 queries/day total.  
   - **Reasoning:** Avoid premature scaling features; prioritize retrieval quality.  
   - **Options considered:** production-scale assumptions (adds caching/infra/ops).

3. **Batch ingestion or incremental updates?**  
   - **Selected:** **Batch ingestion only** for the sprint.  
   - **Reasoning:** Easiest; codebase is static during the sprint; supports fast iteration by rebuilding when chunking changes.  
   - **Options considered:** incremental updates (nice-to-have post-MVP).

4. **Latency requirements for queries?**  
   - **Selected:** Target **< 3 seconds end-to-end**.  
   - **Reasoning:** Matches project performance targets; achievable with managed vector DB + compact context windows.

---

### 2. Budget & Cost Ceiling
1. **Vector database hosting costs?**  
   - **Selected:** **Pinecone managed** (free/low-cost tier for sprint).  
   - **Reasoning:** Lowest operational friction; common in RAG tutorials; fast setup.  
   - **Options considered:** Qdrant/Weaviate (also good), pgvector (more DB ops), Chroma (local; less “production”).

2. **Embedding API costs (per token)?**  
   - **Selected:** **Voyage Code 2** embeddings.  
   - **Reasoning:** Project is code-specific; code embeddings are likely to improve retrieval relevance on programming constructs.  
   - **Options considered:** OpenAI text-embedding-3-small (general-purpose default), local embeddings (more ops).

3. **LLM API costs for answer generation?**  
   - **Selected (assumption):** Use a **fast, cost-effective hosted chat model** for synthesis.  
   - **Reasoning:** Retrieval quality is the main differentiator; synthesis should be quick, grounded, and inexpensive.  
   - **Options considered:** premium models (higher cost), local LLMs (more ops).  
   - **Note:** Exact model/provider can be swapped later; LangChain makes this easy.

4. **Where will you trade money for time?**  
   - **Selected:** Prefer managed services and APIs (**Pinecone + hosted LLM + Voyage embeddings**) to minimize engineering overhead.  
   - **Reasoning:** The sprint rewards shipping + quality; avoid infra yak-shaving.

---

### 3. Time to Ship
1. **MVP timeline?**  
   - **Selected:** 3-day G4 plan:
     - Day 1: ingestion → chunk → embed → Pinecone → basic search
     - Day 2: FastAPI endpoints + Streamlit UI + answer generation w/ citations
     - Day 3: 4 features + eval harness + docs + deployment polish
   - **Reasoning:** Keeps scope tight and aligned with deliverables.

2. **Must-have vs nice-to-have?**  
   - **Must-have:** accurate retrieval, file/line citations, deployed public UI, basic synthesis  
   - **Nice-to-have:** reranking, hybrid search, repo-wide call graph, incremental indexing  
   - **Reasoning:** Avoid complexity unless it directly improves retrieval quality.

3. **Framework learning curve acceptable?**  
   - **Selected:** Minimal “framework dependency” beyond **LangChain** for LLM calls.  
   - **Reasoning:** LangChain gives consistent LLM interface + observability hooks; rest can be simple Python.

---

### 4. Data Sensitivity
1. **Open source or proprietary?**  
   - **Selected:** **Open source** (LAPACK).  
2. **Can you send code to external APIs?**  
   - **Selected:** **Yes** (acceptable for open source).  
3. **Data residency requirements?**  
   - **Selected:** **None assumed** for this sprint.  
   - **Reasoning:** Not required for open source demo.

---

### 5. Team & Skill Constraints
1. **Vector DB familiarity?**  
   - **Selected:** Pinecone for easiest managed setup and strong community patterns.  
2. **RAG framework experience?**  
   - **Selected:** Keep retrieval pipeline custom/simple; use LangChain mainly for synthesis + tracing.  
3. **Comfort with legacy language?**  
   - **Selected:** Fortran is acceptable because chunk boundaries (SUBROUTINE/FUNCTION) are detectable with heuristics.

---

## Phase 2: Architecture Discovery

### 6. Vector Database Selection
1. **Managed vs self-hosted?**  
   - **Selected:** **Managed Pinecone**  
2. **Filtering and metadata requirements?**  
   - **Selected:** Store minimal metadata now; support expanding later:
     - `file_path`, `start_line`, `end_line`, `symbol_name`, `chunk_type`, `chunk_version`, `content_hash`
   - **Reasoning:** Enables citations, drill-down, stable updates, and iteration.
3. **Hybrid search needed?**  
   - **Selected:** **No** initially (vector-only).  
   - **Reasoning:** Keep it simple; add keyword fallback only if retrieval struggles.
4. **Scaling characteristics?**  
   - **Selected:** Demo-scale; validate it performs well for LAPACK and <3s target.

---

### 7. Embedding Strategy
1. **Code-specific vs general-purpose model?**  
   - **Selected:** **Voyage Code 2**  
   - **Reasoning:** Purpose-built for code retrieval and similarity.
2. **Dimension size tradeoffs?**  
   - **Selected:** Accept the model’s native dimensionality; don’t optimize early.
3. **Local vs API embeddings?**  
   - **Selected:** API embeddings (Voyage).  
4. **Batch processing approach?**  
   - **Selected:** Embed in moderate batches (e.g., 50–200 chunks per request) with retries/backoff.

**Important operational note:** Pinecone index dimensions are fixed; switching embeddings or dimensions typically means **creating a new Pinecone index**.  
We will plan for multiple indexes during the sprint.

---

### 8. Chunking Approach
1. **Syntax-aware vs fixed-size?**  
   - **Selected:** **Syntax-aware subroutine/function chunking** as baseline.  
2. **Optimal chunk size?**  
   - **Selected (assumption):** Subroutines vary; target roughly **300–900 tokens** when possible.  
3. **Overlap strategy?**  
   - **Selected:** Minimal overlap for fallback chunking only (10–20%).  
4. **Metadata to preserve?**  
   - **Selected now:** symbol + line ranges (minimum)  
   - **Planned post-MVP add-ons:** `header_comment`, `calls`, `uses/includes`

**Iteration plan (designed-in):**
- Keep stable chunk IDs so you can reindex without breaking UI links.
- Support `chunk_version` in IDs/manifests so chunking changes can coexist.

---

### 9. Retrieval Pipeline
1. **Top-k value?**  
   - **Selected:** Retrieve `top_k=10`; show top 5 in UI.
2. **Re-ranking?**  
   - **Selected:** None initially; optional later (LLM rerank if needed).
3. **Context window management?**  
   - **Selected:** Use 3–6 best chunks; add short “surrounding lines” if needed for clarity.
4. **Multi-query / query expansion?**  
   - **Selected:** No initially. Add only if navigation queries underperform.

---

### 10. Answer Generation
1. **Which LLM for synthesis?**  
   - **Selected (assumption):** Use a fast, cost-effective hosted chat model via LangChain.  
2. **Prompt template design?**  
   - **Selected:** Strict RAG prompt:
     - Answer using provided context only
     - Always cite sources as `path:start-end (symbol)`
     - If insufficient evidence, say so and suggest next query
3. **Citation formatting?**  
   - **Selected:** `path/to/file.f:123-167 (SUBROUTINE FOO)`  
4. **Streaming vs batch?**  
   - **Selected:** Batch (simpler; sufficient for Streamlit MVP)

---

### 11. Framework Selection
1. **LangChain vs LlamaIndex vs custom?**  
   - **Selected:** Custom retrieval + FastAPI endpoints; **LangChain for synthesis** and easy provider swapping.  
2. **Evaluation/observability?**  
   - **Selected:** **LangSmith** for traces + metadata capture; minimal extra logging.  
3. **Integration requirements?**  
   - **Selected:** Streamlit calls FastAPI; FastAPI reads repo files from disk for “full file view.”

---

## Phase 3: Post-Stack Refinement

### 12. Failure Mode Analysis
1. **No relevant retrieval results:**  
   - **Selected:** Return “no strong matches,” show nearest matches anyway, suggest query refinements.
2. **Ambiguous queries:**  
   - **Selected:** Best-effort + brief clarification prompt; show evidence.
3. **Rate limiting / errors:**  
   - **Selected:** timeouts, retries/backoff, user-facing error messages.

---

### 13. Evaluation Strategy
1. **Measure retrieval precision:**  
   - **Selected:** Build ~20 test queries; manually label top-5 relevance; track hit rate.
2. **Ground truth dataset:**  
   - **Selected:** Start with the 6 sample tests from the project plus LAPACK-specific questions.
3. **User feedback collection:**  
   - **Selected:** Optional thumbs up/down; store in logs.

---

### 14. Performance Optimization
1. **Embedding caching:**  
   - **Selected:** Store `content_hash` per chunk to skip re-embedding unchanged chunks where feasible.
2. **Index optimization:**  
   - **Selected:** Pinecone defaults; no tuning initially.
3. **Query preprocessing:**  
   - **Selected:** Minimal cleaning; detect ALLCAPS symbols and file hints if present.

---

### 15. Observability
1. **Debug logging:**  
   - **Selected:** LangSmith traces + minimal structured logs:
     - query_id, latency breakdown, retrieved ids/scores, token usage
2. **Metrics to track:**  
   - ingestion time, chunks indexed, p50/p95 query latency, top-5 relevance, embedding+LLM usage/cost
3. **Alerting:**  
   - None for G4.

---

### 16. Deployment & DevOps
1. **CI/CD for index updates:**  
   - None for G4 (manual runs).
2. **Environment management:**  
   - `.env` locally; env vars in hosting.
3. **Secrets handling:**  
   - Never commit; store in host config.
