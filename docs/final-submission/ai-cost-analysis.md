# AI Cost Analysis (LegacyLens G4)

Cost analysis for the GitNexus Browser Client + GitNexus backend (LAPACK RAG). **LLM provider:** Google Gemini.

---

## 1. Development & testing costs

**How to collect usage data**

Google does not expose a public API or CLI to scrape Gemini usage from the Google AI (ai.google.dev) dashboard. You can:

1. **Recommended: run the cost-eval script** — Reproducible token and cost numbers for the LAPACK test query set:
   ```bash
   BACKEND_URL=https://gitnexus.smallcatlabs.com GEMINI_API_KEY=your_key node scripts/ai-cost-eval.mjs
   ```
   Optionally: `--output report.json` (writes full report with usage and cost), `--queries 5` (run only first 5 queries).  
   The script runs the same 17 queries through Gemini + GitNexus backend tools, records **usageMetadata** from each Gemini response, and prints total prompt/completion tokens and estimated cost using current Gemini pricing. Use one run's totals to fill the **Development & testing** row below (e.g. "One 17-query eval run: 1.2M prompt, 180K completion tokens, ~$0.25").

2. **Manual: Google AI Studio** — [Google AI Studio](https://aistudio.google.com) → Usage/billing shows aggregate usage; no export API. Check the dashboard and note approximate token counts to estimate dev spend.

3. **If using Google Cloud (Vertex AI)** — Use [Cloud Billing export to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery) and query by service/labels for programmatic cost reporting.

---

*Fill from a run of `scripts/ai-cost-eval.mjs` (see above) or from Google AI Studio usage. **Source for this document:** one full run captured in `cost-report.json` (17 queries, gemini-2.5-flash, local backend).*

| Category | Notes | Amount |
|----------|--------|--------|
| **Embedding API** | Tokens embedded during ingestion and query (Snowflake/snowflake-arctic-embed-xs, 384 dims; may run locally or via API) | _TBD_ |
| **LLM (Gemini) API** | One 17-query eval run: **234,682** prompt + **4,149** completion tokens → **~$0.08** (gemini-2.5-flash). See `cost-report.json`. | **~$0.08** (one run) |
| **Vector DB / hosting** | KuzuDB is embedded (no separate DB cost); hosting is server/infra only | _TBD_ |
| **Total development spend** | LLM from one script run above; add embedding/hosting if tracked. | **~$0.08** (LLM only) |

**Gemini pricing (per 1M tokens, approximate):** gemini-2.5-flash $0.30 input / $2.50 output (used in report); gemini-2.0-flash $0.10 / $0.40; gemini-1.5-flash $0.075 / $0.30; gemini-1.5-pro $1.25 / $5.00. See [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

---

## 2. Production cost projections

Assumptions (label and adjust as needed for your deployment):

- **Queries per user per day:** 10
- **Tokens per query (LLM):** From `cost-report.json` (17-query run, gemini-2.5-flash): **~13,800 input + ~244 output** per query (full agent loop with tools). Use these for realistic projections; or assume lighter usage (e.g. 2K input + 500 output) for a lower bound.
- **Embedding:** Same model as ingestion; assume 1 query embedding per user query + negligible re-embedding for new code
- **Hosting:** Single backend (e.g. Fly.io/Railway); cost assumed flat for the ranges below

| Scale (users/month) | 100 | 1,000 | 10,000 | 100,000 |
|---------------------|-----|-------|--------|---------|
| **$/month (est.)**  | **~\$144** | **~\$1,440** | **~\$14,400** | **~\$144,000** |

**How these numbers were derived:**

- **Measured run:** 17 queries → 234,682 prompt + 4,149 completion tokens ⇒ **~13,805 input + ~244 output per query** (gemini-2.5-flash: $0.30/1M input, $2.50/1M output).
- 100 users: 30K queries/month → 414M input + 7.3M output → 414×0.30 + 7.3×2.50 ≈ **\$144**.
- 1K / 10K / 100K scale linearly (LLM cost dominates; no caching assumed).

**If you assume lighter usage per query** (e.g. 2K input + 500 output): 30K queries → 60M + 15M → ~\$18 + \$38 ≈ **\$56/mo** at 100 users. Adjust the table and assumptions if you prefer that conservative estimate.
