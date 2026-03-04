# GitNexus Documentation Index

Documentation is grouped by topic. Start with [project-introduction.md](project-introduction.md) for an overview and pointers to the right docs.

---

## Project overview

| Document | Description |
|----------|-------------|
| [project-introduction.md](project-introduction.md) | **Start here.** What the repo is (GitNexus; gitnexus-web for LAPACK/legacy). Documentation map and deprecated (Lapack Lens, LegacyLens gap) sections. |
| [project-definition.md](project-definition.md) | LegacyLens assignment: building RAG systems for legacy enterprise codebases (COBOL, Fortran). |

---

## Architecture & RAG

| Document | Description |
|----------|-------------|
| [rag-architecture.md](rag-architecture.md) | Retrieval architecture for Lapack Lens: KuzuDB (graph + vectors + FTS), embedding strategy, hybrid search, tools. |
| [pre-search.md](pre-search.md) | Pre-Search checklist: constraints, vector DB choice, embedding/chunking decisions, and rationale. |

---

## Deployment & operations

| Document | Description |
|----------|-------------|
| [vultr-deploy.md](vultr-deploy.md) | Deploy GitNexus (backend + web) on a Vultr VPS: dashboard or CLI, setup script, systemd. |
| [nexus-vultr-debug-context.md](nexus-vultr-debug-context.md) | Context for debugging the Vultr deployment: current state, fixes applied, key paths, next steps. |

---

## Reference

| Document | Description |
|----------|-------------|
| [lapack-index.md](lapack-index.md) | Index of LAPACK routines, modules, constants, and data types (Reference LAPACK). |

---

## Testing

| Document | Description |
|----------|-------------|
| [testing-scenarios.md](testing-scenarios.md) | LAPACK-tailored natural-language test queries for Lapack Lens and the performance script. |

---

## Troubleshooting

| Document | Description |
|----------|-------------|
| [nexus-ai-backend-mode-context.md](nexus-ai-backend-mode-context.md) | Nexus AI sidebar when the graph is loaded from the backend: “Database not ready” / “Initializing AI agent” and fixes. |
| [troubleshooting/cypher-database-not-ready-debug.md](troubleshooting/cypher-database-not-ready-debug.md) | Cypher FAB “Database not ready” when using a backend repo: evidence-gathering and root cause. |
| [troubleshooting/debug-github-clone-html-response.md](troubleshooting/debug-github-clone-html-response.md) | GitHub clone returns HTML instead of git protocol (proxy / CORS). |

---

## Design

Design notes and implementation plans for language support and tooling.

| Document | Description |
|----------|-------------|
| [design/fortran-support.md](design/fortran-support.md) | Fortran support in GitNexus (tree-sitter, symbol extraction). |
| [design/cobol-support.md](design/cobol-support.md) | COBOL support: design discussion and current status. |
| [design/cobol-implementation-plan.md](design/cobol-implementation-plan.md) | Step-by-step COBOL implementation plan. |
| [design/cobol-wasm-fix-options.md](design/cobol-wasm-fix-options.md) | Options for fixing COBOL WASM build or runtime. |
| [design/tree-sitter-cobol-notes.md](design/tree-sitter-cobol-notes.md) | Notes on tree-sitter-cobol grammar (vendoring, usage). |
| [design/tree-sitter-upgrade-notes.md](design/tree-sitter-upgrade-notes.md) | Notes on upgrading Tree-sitter / grammars. |
| [design/testing.md](design/testing.md) | Testing design and approach. |

---

## Legacy Lens / gap analysis

Gap between current GitNexus/Lapack Lens and the LegacyLens submission requirements, plus mitigation plans.

| Document | Description |
|----------|-------------|
| [legacy-lens/gap-analysis-legacylens.md](legacy-lens/gap-analysis-legacylens.md) | Gap analysis: current state vs LegacyLens final submission requirements. |
| [legacy-lens/gap-mitigation-plan.md](legacy-lens/gap-mitigation-plan.md) | Plan to close gaps (docs, deliverables, optional RAG pipeline). |
| [legacy-lens/gap-mitigation-prereqs.md](legacy-lens/gap-mitigation-prereqs.md) | Prerequisites for executing the mitigation plan. |
| [legacy-lens/gap-mitigation-status.md](legacy-lens/gap-mitigation-status.md) | Status of mitigation items. |
| [legacy-lens/gap-execution-prompt.md](legacy-lens/gap-execution-prompt.md) | Prompt/checklist for executing gap mitigation. |
