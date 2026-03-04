<PROJECT_INTRODUCTION>

Use this doc to load the basics of the project and find the right documentation before asking a question or starting a change request.

---

## What this repo is

- **GitNexus** — A codebase knowledge graph (KuzuDB + Tree-sitter). It indexes repos into a graph (symbols, CALLS/IMPORTS, processes, clusters), supports hybrid search (BM25 + semantic), and exposes tools via **CLI** and **MCP** (and REST for the web/Lapack Lens). See the root [README.md](../README.md).
- **Lapack Lens** — A Streamlit chat app in `lapack-lens/` that talks to GitNexus over REST and uses OpenAI to answer natural-language questions about the **LAPACK** (Fortran) codebase. Deployed at https://lapack-lens.fly.dev.

So: one repo, two main “products” — the generic GitNexus engine and the LAPACK-specific Lapack Lens app built on it.

---

## Start here

| If you… | Read / use |
|--------|-------------|
| Want a high-level overview | Root [README.md](../README.md) |
| Are an AI agent (Cursor, Claude, etc.) | [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) — then the skill file for your task |
| Want to run Lapack Lens locally | [lapack-lens/README.md](../lapack-lens/README.md) — “Run locally with Docker Compose” |
| Want to understand Lapack Lens design | [lapack-lens/DESIGN.md](../lapack-lens/DESIGN.md) |

---

## Documentation map

### Architecture and RAG

| Doc | Purpose |
|-----|---------|
| [docs/rag-architecture.md](./rag-architecture.md) | RAG/retrieval architecture: vector DB (KuzuDB), embeddings, chunking, retrieval pipeline, failure modes, performance. |
| [docs/pre-search.md](./pre-search.md) | Historical Pre-Search checklist (project later uses GitNexus instead of a classic vector-RAG stack). |

### Gap mitigation (LegacyLens submission)

| Doc | Purpose |
|-----|---------|
| [docs/project-definition.md](./project-definition.md) | Assignment spec: LegacyLens — RAG for legacy codebases (MVP, features, deliverables). |
| [docs/gap-analysis-legacylens.md](./gap-analysis-legacylens.md) | Gap analysis: current state vs submission requirements. |
| [docs/gap-mitigation-prereqs.md](./gap-mitigation-prereqs.md) | Design decisions and prerequisites for the mitigation plan. |
| [docs/gap-mitigation-plan.md](./gap-mitigation-plan.md) | The plan: tasks, done criteria, suggested order (§1–§9). |
| [docs/gap-mitigation-status.md](./gap-mitigation-status.md) | Status: what’s done, what’s left, commit refs. |
| [docs/gap-execution-prompt.md](./gap-execution-prompt.md) | Execution prompt used to implement the plan. |

### Lapack Lens and LAPACK

| Doc | Purpose |
|-----|---------|
| [lapack-lens/README.md](../lapack-lens/README.md) | Run (Docker, Streamlit-only), deploy (Fly), feature→tool mapping, performance script. |
| [lapack-lens/DESIGN.md](../lapack-lens/DESIGN.md) | Lapack Lens architecture and design decisions. |
| [lapack-lens/IMPLEMENTATION_PLAN.md](../lapack-lens/IMPLEMENTATION_PLAN.md) | Implementation tasks and checklist. |
| [docs/testing-scenarios.md](./testing-scenarios.md) | LAPACK-tailored test queries and outcomes table. |
| [docs/lapack-index.md](./lapack-index.md) | Index of LAPACK routines, modules, and constants (reference). |

### Design and implementation notes

| Doc | Purpose |
|-----|---------|
| [docs/design/fortran-support.md](./design/fortran-support.md) | Fortran support in GitNexus (parsing, symbols, graph). |
| [docs/design/tree-sitter-upgrade-notes.md](./design/tree-sitter-upgrade-notes.md) | Tree-sitter upgrade notes. |
| [docs/design/testing.md](./design/testing.md) | Testing approach and notes. |

---

## Before asking a question

1. Skim this intro and the **Start here** table so you know whether the answer lives in GitNexus vs Lapack Lens.
2. For “how does X work?” or “where is Y?”: use [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) and the **gitnexus-exploring** skill (or the right skill for your task).
3. For LegacyLens/gap work: read [docs/gap-mitigation-status.md](./gap-mitigation-status.md) and, if relevant, [docs/gap-mitigation-plan.md](./gap-mitigation-plan.md) so your question can reference specific sections or tasks.

---

## Before starting a change request

1. **Scope** — Is the change in GitNexus core (`gitnexus/`), the GitNexus REST API (`gitnexus/src/server/`), or Lapack Lens (`lapack-lens/`)? Follow the rules in [.cursorrules](../.cursorrules) (and `.gitnexus/RULES.md` if present).
2. **Gap plan** — If the change touches LegacyLens deliverables, align with [docs/gap-mitigation-plan.md](./gap-mitigation-plan.md) and current status in [docs/gap-mitigation-status.md](./gap-mitigation-status.md).
3. **Lapack Lens** — For app or tool changes, check [lapack-lens/DESIGN.md](../lapack-lens/DESIGN.md) and [lapack-lens/README.md](../lapack-lens/README.md) (feature→tool table, script, env).
4. **Tests** — Run relevant tests (e.g. `npm run build` and tests in `gitnexus/`, or Lapack Lens flow) and mention how you verified.

<PROJECT_INTRODUCTION>
