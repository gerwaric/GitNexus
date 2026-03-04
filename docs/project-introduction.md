<PROJECT_INTRODUCTION>

Use this doc to load the basics of the project and find the right documentation before asking a question or starting a change request.

---

## What this repo is

- **GitNexus** — A codebase knowledge graph (KuzuDB + Tree-sitter). It indexes repos into a graph (symbols, CALLS/IMPORTS, processes, clusters), supports hybrid search (BM25 + semantic), and exposes tools via **CLI**, **MCP**, and **REST** (for the web UI). See the root [README.md](../README.md). For LAPACK/Fortran and other legacy codebases, use **gitnexus-web** with a backend (index the repo via CLI, then connect the web UI to the server).

---

## Start here

| If you… | Read / use |
|--------|-------------|
| Want a high-level overview | Root [README.md](../README.md) |
| Are an AI agent (Cursor, Claude, etc.) | [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) — then the skill file for your task |

---

## Documentation map

### Architecture and RAG

| Doc | Purpose |
|-----|---------|
| [docs/rag-architecture.md](./rag-architecture.md) | RAG/retrieval architecture: vector DB (KuzuDB), embeddings, chunking, retrieval pipeline, failure modes, performance. |
| [docs/pre-search.md](./pre-search.md) | Historical Pre-Search checklist (project later uses GitNexus instead of a classic vector-RAG stack). |

### LAPACK and testing

| Doc | Purpose |
|-----|---------|
| [docs/testing-scenarios.md](./testing-scenarios.md) | LAPACK-tailored test queries and outcomes table (for use with gitnexus-web + backend). |
| [docs/lapack-index.md](./lapack-index.md) | Index of LAPACK routines, modules, and constants (reference). |

### Design and implementation notes

| Doc | Purpose |
|-----|---------|
| [docs/design/fortran-support.md](./design/fortran-support.md) | Fortran support in GitNexus (parsing, symbols, graph). |
| [docs/design/fortran-code-inspector-highlighting.md](./design/fortran-code-inspector-highlighting.md) | Fortran syntax highlighting in Code Inspector (fixed-form comments, Refractor patch). |
| [docs/design/cobol-code-inspector-highlighting.md](./design/cobol-code-inspector-highlighting.md) | COBOL syntax highlighting in Code Inspector (.cbl, .cob, .cpy). |
| [docs/design/tree-sitter-upgrade-notes.md](./design/tree-sitter-upgrade-notes.md) | Tree-sitter upgrade notes. |
| [docs/design/testing.md](./design/testing.md) | Testing approach and notes. |

### Deprecated / historical

**Lapack Lens (Streamlit)** — Deprecated. Use **gitnexus-web** with a Fortran/LAPACK backend instead. Former deployment: https://lapack-lens.fly.dev.

| Doc | Purpose |
|-----|---------|
| [lapack-lens/README.md](../lapack-lens/README.md) | Run (Docker, Streamlit-only), deploy (Fly), feature→tool mapping, performance script. |
| [lapack-lens/DESIGN.md](../lapack-lens/DESIGN.md) | Lapack Lens architecture and design decisions. |
| [lapack-lens/IMPLEMENTATION_PLAN.md](../lapack-lens/IMPLEMENTATION_PLAN.md) | Implementation tasks and checklist. |

**LegacyLens gap mitigation** — Assignment submission and gap docs (reference only).

| Doc | Purpose |
|-----|---------|
| [docs/project-definition.md](./project-definition.md) | Assignment spec: LegacyLens — RAG for legacy codebases (MVP, features, deliverables). |
| [docs/legacy-lens/gap-analysis-legacylens.md](./legacy-lens/gap-analysis-legacylens.md) | Gap analysis: current state vs submission requirements. |
| [docs/legacy-lens/gap-mitigation-prereqs.md](./legacy-lens/gap-mitigation-prereqs.md) | Design decisions and prerequisites for the mitigation plan. |
| [docs/legacy-lens/gap-mitigation-plan.md](./legacy-lens/gap-mitigation-plan.md) | The plan: tasks, done criteria, suggested order (§1–§9). |
| [docs/legacy-lens/gap-mitigation-status.md](./legacy-lens/gap-mitigation-status.md) | Status: what's done, what's left, commit refs. |
| [docs/legacy-lens/gap-execution-prompt.md](./legacy-lens/gap-execution-prompt.md) | Execution prompt used to implement the plan. |

---

## Before asking a question

1. Skim this intro and the **Start here** table to find the right doc or entry point.
2. For "how does X work?" or "where is Y?": use [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) and the **gitnexus-exploring** skill (or the right skill for your task).
3. For LegacyLens/gap docs (historical): see **Deprecated / historical** above.

---

## Before starting a change request

1. **Scope** — Is the change in GitNexus core (`gitnexus/`), the GitNexus REST API (`gitnexus/src/server/`), or the web UI (`gitnexus-web/`)? Follow the rules in [.cursorrules](../.cursorrules) (and `.gitnexus/RULES.md` if present).
2. **Tests** — Run relevant tests (e.g. `npm run build` and tests in `gitnexus/` or `gitnexus-web/`) and mention how you verified.

<PROJECT_INTRODUCTION>
