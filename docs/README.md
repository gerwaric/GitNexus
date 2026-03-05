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
| [rag-architecture.md](rag-architecture.md) | Retrieval architecture for GitNexus Browser Client: KuzuDB (graph + vectors + FTS), embedding strategy, hybrid search, tools. |
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
| [testing-scenarios.md](testing-scenarios.md) | LAPACK-tailored natural-language test queries; scenarios, usage, and outcomes table. |

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
| [design/fortran-code-inspector-highlighting.md](design/fortran-code-inspector-highlighting.md) | Fortran in Code Inspector: fixed-form comment highlighting and Refractor grammar patch. |
| [design/cobol-code-inspector-highlighting.md](design/cobol-code-inspector-highlighting.md) | COBOL in Code Inspector: extension mapping and Refractor usage (.cbl, .cob, .cpy). |
| [design/cobol-support.md](design/cobol-support.md) | COBOL support: design discussion and current status. |
| [design/cobol-implementation-plan.md](design/cobol-implementation-plan.md) | Step-by-step COBOL implementation plan. |
| [design/cobol-wasm-fix-options.md](design/cobol-wasm-fix-options.md) | Options for fixing COBOL WASM build or runtime. |
| [design/tree-sitter-cobol-notes.md](design/tree-sitter-cobol-notes.md) | Notes on tree-sitter-cobol grammar (vendoring, usage). |
| [design/tree-sitter-upgrade-notes.md](design/tree-sitter-upgrade-notes.md) | Notes on upgrading Tree-sitter / grammars. |
| [design/testing.md](design/testing.md) | Testing design and approach. |

---

## Final submission (LegacyLens G4)

Submission deliverables and supporting docs for the LegacyLens G4 final. Quick index: [final-submission/summary.md](final-submission/summary.md).

| Document | Description |
|----------|-------------|
| [final-submission/summary.md](final-submission/summary.md) | **Quick index** — each deliverable and where to find it (repo, pre-search, RAG doc, AI cost analysis, deployed app). |
| [final-submission/final-submission-overview.md](final-submission/final-submission-overview.md) | Full checklist: submission table, RAG doc sections, supporting topics, folder contents, author TODOs. |
| [final-submission/gap-analysis.md](final-submission/gap-analysis.md) | Gaps vs LegacyLens G4: MVP table, target codebase, RAG infrastructure, testing, query interface, code-understanding features. |
| [final-submission/mitigation-plan.md](final-submission/mitigation-plan.md) | Step-by-step plan executed to close gaps. |
| [final-submission/ai-cost-analysis.md](final-submission/ai-cost-analysis.md) | AI cost analysis: dev/test costs (Gemini), production projections (100/1K/10K/100K users). |
| [final-submission/tech-stack.md](final-submission/tech-stack.md) | Tech stack for G4 deployment: backend (Node, KuzuDB, embeddings), browser client (React, Gemini, tools). |
| [final-submission/test-queries.md](final-submission/test-queries.md) | LAPACK test queries for eval; script: `scripts/lapack-test-queries-performance.mjs`. |
| [final-submission/eval-test-queries-feature.md](final-submission/eval-test-queries-feature.md) | Run test queries UI: goals, architecture, behavior. |
| [final-submission/eval-test-queries-implementation-plan.md](final-submission/eval-test-queries-implementation-plan.md) | Implementation plan for the Run test queries UI. |
| [final-submission/eval-test-queries-execute-prompt.md](final-submission/eval-test-queries-execute-prompt.md) | Prompt to run the eval-test-queries implementation plan in a new chat. |
| [final-submission/mitigation-plan-prompt.md](final-submission/mitigation-plan-prompt.md) | Prompt used to generate the mitigation plan. |
| [final-submission/execute-mitigation-plan-prompt.md](final-submission/execute-mitigation-plan-prompt.md) | Prompt used to have an agent execute the mitigation plan. |

Reports (JSON) in the same folder: `performance-report.json`, `cost-report.json`, `scenario-report.json`, `gitnexus-eval-report.json`.

---

## Legacy Lens / gap analysis

Earlier gap analysis and mitigation docs (legacy-lens folder). **For the G4 submission**, see [Final submission](#final-submission-legacylens-g4) above (final-submission/).

| Document | Description |
|----------|-------------|
| [legacy-lens/gap-analysis-legacylens.md](legacy-lens/gap-analysis-legacylens.md) | Gap analysis: current state vs LegacyLens final submission requirements. |
| [legacy-lens/gap-mitigation-plan.md](legacy-lens/gap-mitigation-plan.md) | Plan to close gaps (docs, deliverables, optional RAG pipeline). |
| [legacy-lens/gap-mitigation-prereqs.md](legacy-lens/gap-mitigation-prereqs.md) | Prerequisites for executing the mitigation plan. |
| [legacy-lens/gap-mitigation-status.md](legacy-lens/gap-mitigation-status.md) | Status of mitigation items. |
| [legacy-lens/gap-execution-prompt.md](legacy-lens/gap-execution-prompt.md) | Prompt/checklist for executing gap mitigation. |
