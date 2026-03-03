# Gap Mitigation — Prerequisites

Resolve these **design choices**, **issues**, and **questions** before writing the [gap mitigation plan](./gap-mitigation-plan.md). Decisions here will determine scope, order of work, and what goes into the plan.

**Decisions recorded:** See [gap-mitigation-plan.md](./gap-mitigation-plan.md) § "Resolved decisions (summary)". Key outcomes: RAG doc = detailed + design rationale; query interface = (B) first, (A) later if time; 4 features = add impact **and** wiki (A); performance = script to simulate chat and collect data; LAPACK test scenarios = yes; deployed link = yes; social post = author at submission.

---

## 1. Design choices

### 1.1 RAG Architecture document

| Choice | Options | Impact |
|--------|---------|--------|
| **Depth of GitNexus documentation** | (A) High-level only (pipeline diagram, “symbol graph + hybrid search + tools”). (B) Detailed (trace code: where embeddings are generated, which model, how BM25/semantic/RRF work, where vectors live in KuzuDB). | (A) Faster, may miss “embedding strategy” / “vector DB” rubric items. (B) Satisfies template fully; requires code investigation. |
| **Document location** | `docs/rag-architecture.md` (repo-wide) vs `lapack-lens/docs/rag-architecture.md` (Lapack Lens–specific). | Repo-wide fits “RAG architecture for this project”; lapack-lens–specific fits “how Lapack Lens retrieves.” |
| **Chunking / “storage” framing** | Describe GitNexus as “symbol-level chunking” and “graph + vector store (KuzuDB)” and map to assignment terms, vs. adding a short “we diverge here” section only. | Full mapping makes grading easier; minimal framing is quicker. |

**Decision:** (B) detailed specifics. Include a **discussion of why** GitNexus might have chosen each design (embedding model, storage, symbol-level chunking, hybrid search). **Recommendation:** `docs/rag-architecture.md`; full mapping.

---

### 1.2 Query interface (snippets, file/line, scores, drill-down)

| Choice | Options | Impact |
|--------|---------|--------|
| **Scope** | (A) All four: syntax-highlighted snippets, file/line per result, relevance scores, drill-down to full file. (B) Minimum to “pass”: e.g. file/line in assistant message + markdown code blocks with ` ```fortran ` (no dedicated component). (C) One or two (e.g. file/line + scores only). | (A) Best UX, more work. (B) Low effort, may not satisfy “display retrieved code snippets with syntax highlighting.” (C) Compromise. |
| **Syntax highlighting** | Use a Streamlit component (e.g. `streamlit-highlight` or similar) for real Fortran highlighting vs. markdown code blocks with ` ```fortran ` (built-in, no extra dep). | Component = better “snippet” feel; markdown = simpler, may be acceptable. |
| **Where results are shown** | Keep “results only in assistant message” vs. add a separate “Retrieved results” section (e.g. expander or sidebar) that shows tool outputs with file/line/scores before the answer. | Separate section makes “retrieved chunks” and “scores” explicit for graders. |

**Recommendation:** Decide minimum acceptable for “query interface” (B vs C) and whether a separate results section is required.

---

### 1.3 Four code-understanding features

| Choice | Options | Impact |
|--------|---------|--------|
| **How to reach “4+”** | (A) Add REST + tool for **impact** (and optionally **wiki**) so the LLM can call them; document “Code explanation, Dependency mapping, Impact analysis, Pattern detection (query)” as the four. (B) Do not add new endpoints; document that “explanation, dependency mapping, pattern (query), business logic (query + LLM)” count as four. (C) Add only **impact** (one endpoint + tool def); claim four with explanation, dependency, impact, pattern. | (A)/(C) are defensible and clear. (B) is doc-only but may be challenged (“pattern” and “business logic” are partial). |
| **Impact exposure** | If we add impact: REST only (LLM can call it) vs. REST + dedicated UI (e.g. “Impact” button or panel that calls impact and displays blast radius). | REST-only is less work; UI makes the feature obvious in the demo. |
| **Wiki** | Expose `wiki` as a tool (e.g. “generate docs for this symbol/module”) vs. leave wiki out of Lapack Lens. | Wiki is heavy (LLM + time); impact alone may be enough for “4 features.” |

**Decision:** Add **impact** and **wiki** (REST + tool defs). Plan uses (A). Defer dedicated UI for impact unless needed; wiki is long-running (document in tool description).

---

### 1.4 Performance & evaluation

| Choice | Options | Impact |
|--------|---------|--------|
| **Measurement** | (A) Actually run N queries, record latency and (optionally) top-5 relevance; document in RAG doc or “Performance” section. (B) Document targets and method only (“we target <3s; we would measure with …”). | (A) Stronger for submission and “performance results” rubric. (B) Faster. |
| **Ingestion** | Document actual LAPACK index time (from Docker build or a one-off run) vs. state “large codebase; build-time indexing ~10–30 min per README.” | One number (e.g. “LAPACK indexed in X min”) satisfies “ingestion throughput” discussion. |
| **Where it lives** | “Performance results” subsection inside RAG Architecture doc vs. separate `docs/performance-evaluation.md` or lapack-lens section. | Single RAG doc is simpler; separate doc is clearer if we add many metrics later. |

**Decision:** Write a **script that simulates the chat** and runs test cases to collect performance data programmatically (latency, optional success/excerpt). Use script output for "Performance results" in RAG doc. Recommendation: keep results in RAG doc unless the report grows large.

---

### 1.5 Optional items

| Choice | Options | Impact |
|--------|---------|--------|
| **Testing scenarios** | Add a short “Testing scenarios” doc or section (the 6 assignment queries + 1–2 sentence outcome each) vs. skip. | Quick win; shows we ran the suggested tests. |
| **Explicit deployed link** | Add Fly URL to lapack-lens README (and optionally main README) now vs. only at submission time. | Now = one less thing at the end. |
| **Social post** | Plan to do it at submission vs. ignore in the mitigation plan. | Plan can just say “Social post: do at submission per assignment.” |

---

## 2. Issues to resolve

### 2.1 Rubric strictness (graph vs vector RAG)

- **Issue:** The assignment text favors “vector database from the list” and “chunk-based embeddings.” Lapack Lens uses KuzuDB (graph + vectors) and symbol-level semantics.
- **Risk:** A strict grader could mark MVP items “chunk,” “embed,” “vector DB” as not met.
- **Options:** (1) Get explicit approval (e.g. from instructor) to treat “graph + hybrid search” as the RAG architecture. (2) Document the mapping clearly in the RAG doc and Pre-Search (historical) and accept grading risk. (3) Add a minimal parallel path (e.g. chunk LAPACK → embed → ChromaDB) only if required.
- **Decision needed:** Do we assume “document and reframe” is acceptable, or do we need confirmation before locking the plan?

---

### 2.2 Scope of “no GitNexus code changes”

- **Issue:** You said RAG doc = “no code changes unless required.” Adding **impact** (and optionally **wiki**) means new REST routes in `gitnexus/src/server/api.ts` and possibly tool schema changes in Lapack Lens.
- **Clarification:** “No code changes” likely meant “don’t change GitNexus’s core indexing/retrieval logic.” Adding REST wrappers for existing tools (impact, wiki) is additive and may be acceptable.
- **Decision needed:** Confirm that adding `/api/tools/impact` (and optionally `/api/tools/wiki`) in the GitNexus server is in scope for the mitigation plan.

---

### 2.3 Dependency order

- **Issue:** RAG doc can be written in parallel with anything. UI changes and impact tool can block or unblock each other depending on whether we show “impact” in the UI.
- **Decision needed:** Do we want a strict order in the plan (e.g. RAG doc first, then impact REST, then UI), or “these can be parallel with these milestones”?

---

## 3. Open questions

### 3.1 RAG Architecture doc

1. Who will perform the GitNexus code investigation (embeddings, search, KuzuDB usage)? If the plan assigns “investigate and document,” is that a single session or multiple?
2. Should the RAG doc mention Lapack Lens explicitly (e.g. “Lapack Lens queries GitNexus via …”) or stay as “GitNexus retrieval architecture” only?
3. Failure modes: document only what we know (e.g. “no results,” “timeout”) or should we run a few failure cases (e.g. nonsense query, unreachable backend) and document behavior?

---

### 3.2 Query interface

4. Is “markdown code blocks with ` ```fortran `” sufficient for “syntax highlighting” in the assignment, or do we need a dedicated component?
5. Do we have a preference for Streamlit components (e.g. for snippets) vs. keeping the stack minimal (no new deps)?

---

### 3.3 Code-understanding features

6. For “pattern detection”: is “query returns similar symbols” enough to claim the feature, or do we want something more explicit (e.g. “Find similar code” prompt or UI)?
7. Should the mitigation plan include a short “feature → tool mapping” table for the submission (e.g. for README or RAG doc)?

---

### 3.4 Performance

8. How many test queries do we want to run for latency/precision (e.g. 5, 10, or the 6 assignment scenarios)?
9. Do we have a stable Fly deployment to measure against, or should we document “measured locally with Docker” vs “production”?

---

### 3.5 Plan format

10. Should the mitigation plan be time-ordered (e.g. “Week / Day 1, 2, 3”) or priority-ordered (critical → important → optional) with optional dates?
11. Do we want explicit “done” criteria for each work item (e.g. “RAG doc done when: 1–2 pages, all 6 template sections filled”)?

---

## 4. Summary checklist

Decisions recorded in [gap-mitigation-plan.md](./gap-mitigation-plan.md). Before executing the plan, optionally confirm:

- [x] **RAG doc:** Depth = detailed + design rationale; location = `docs/rag-architecture.md`; full mapping.
- [x] **Query interface:** Start with (B); (A) later if time.
- [x] **4 features:** Add impact + wiki (A).
- [x] **Performance:** Script to simulate chat and collect data programmatically.
- [ ] **Rubric:** Assume "document and reframe" is OK, or get approval first?
- [ ] **GitNexus changes:** Adding `/api/tools/impact` in scope (confirm if needed).
- [x] **Optional:** LAPACK test scenarios = yes; deployed link = yes; social post = author.
- [x] **Plan format:** Priority-ordered with done criteria; see gap-mitigation-plan.md.