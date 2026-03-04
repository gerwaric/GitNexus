# AI Cost Analysis (LegacyLens G4)

Cost analysis for the GitNexus Browser Client + GitNexus backend (LAPACK RAG). **LLM provider:** Google Gemini.

---

## 1. Development & testing costs

*Dev/test usage: to be filled from Google Gemini (API/console or manual export).*

| Category | Notes | Amount |
|----------|--------|--------|
| **Embedding API** | Tokens embedded during ingestion and query (Snowflake/snowflake-arctic-embed-xs, 384 dims; may run locally or via API) | _TBD_ |
| **LLM (Gemini) API** | Chat/completion tokens for answer generation, tool loops, validation | _TBD_ |
| **Vector DB / hosting** | KuzuDB is embedded (no separate DB cost); hosting is server/infra only | _TBD_ |
| **Total development spend** | | _TBD_ |

**How to fill:** Use Google Gemini usage data from the API dashboard, CLI, or manual export. Sum input/output tokens and apply Gemini pricing for the model(s) used (e.g. gemini-1.5-flash, gemini-1.5-pro).

---

## 2. Production cost projections

Assumptions (label and adjust as needed for your deployment):

- **Queries per user per day:** 5
- **Tokens per query (LLM):** ~2,000 input + ~500 output (one round with tools)
- **Embedding:** Same model as ingestion; assume 1 query embedding per user query + negligible re-embedding for new code
- **Hosting:** Single backend (e.g. Fly.io/Railway); cost assumed flat for the ranges below

| Scale (users/month) | 100 | 1,000 | 10,000 | 100,000 |
|---------------------|-----|-------|--------|---------|
| **$/month (est.)**  | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

**Assumptions for estimates:**

- 100 users: 100 × 5 × 30 ≈ 15K queries/month; LLM cost dominates.
- 1K users: ~150K queries/month; consider caching and rate limits.
- 10K / 100K: Scale backend and consider batch embedding; LLM cost scales roughly linearly with query volume unless caching is added.

*Replace _TBD_ with actual dollar estimates once Gemini pricing and usage are known.*
