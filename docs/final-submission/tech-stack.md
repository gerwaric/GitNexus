# Tech Stack (LegacyLens G4 Deployment)

Technology used for the **GitNexus Browser Client** + **GitNexus backend** deployment (LAPACK RAG) at https://gitnexus.smallcatlabs.com.

| Layer | Backend (GitNexus server) | Browser Client (gitnexus-web) |
|-------|---------------------------|-------------------------------|
| **Runtime** | Node.js | Browser |
| **Parsing** | Tree-sitter (native) | — (queries backend) |
| **Database** | KuzuDB (graph + vectors + FTS) | — |
| **Embeddings** | Snowflake/snowflake-arctic-embed-xs (384 dims, transformers.js) | — (server embeds) |
| **Search** | BM25 + semantic + RRF | HTTP to backend tools |
| **LLM** | — | Google Gemini (agent in browser) |
| **Agent** | REST API (/api/tools/query, context, cypher, impact, wiki) | LangChain ReAct agent, tool calls to backend |
| **Frontend** | — | React 18, TypeScript, Vite, Tailwind v4 |
| **Graph viz** | — | Sigma.js + Graphology |

**References:** Full stack table (CLI vs Web) in root [README.md](../../README.md#tech-stack). Retrieval details in [docs/rag-architecture.md](../rag-architecture.md). LLM/cost in [ai-cost-analysis.md](./ai-cost-analysis.md).
