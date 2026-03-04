# Prompt: Create Mitigation Plan from Gap Analysis

Use this prompt in a **new chat session** to turn the gap analysis into a step-by-step mitigation plan.

---

Create a **step-by-step mitigation plan** to address the gaps in `docs/final-submission/gap-analysis.md`. The plan should be written as a new document (e.g. `docs/final-submission/mitigation-plan.md`).

**Context**
- The gap analysis compares **GitNexus + gitnexus-web** (deployed at https://gitnexus.smallcatlabs.com) to the **LegacyLens G4 submission requirements** in `docs/project-definition.md`.
- The analysis defines **areas and goals** (documentation, query interface, code-understanding features, testing/performance, submission artifacts) and is **not** a plan. Your job is to turn it into an actionable plan.

**Requirements for the mitigation plan**
1. **Structure:** Organize by the same categories as the gap analysis summary (§14): Documentation; Query interface; Code-understanding features; Testing and performance; Submission artifacts. Optionally add a "Prerequisites" or "Order of work" section if some steps depend on others.
2. **Concrete steps:** Each step should be specific enough to implement or assign (e.g. "Add subsection X to file Y" or "Implement Z in component W"), with file paths or doc references where relevant.
3. **References:** Point to the gap analysis for rationale (e.g. "Per gap analysis §8.1, …") and to the relevant code/docs (e.g. `docs/rag-architecture.md`, `gitnexus-web/src/...`).
4. **Open questions:** Where the gap analysis lists "Open questions / issues / decisions," the plan should either (a) propose a decision and a step to implement it, or (b) call out a "Decision needed" with options before a concrete step.
5. **No duplication:** Do not copy the full gap analysis into the plan; summarize only what's needed and link to `docs/final-submission/gap-analysis.md` for detail.
6. **Deliverable:** A single markdown file that a developer (or a future agent) can follow to close the gaps and meet the G4 submission requirements.

**Inputs to use**
- Read `docs/final-submission/gap-analysis.md` in full.
- Use `docs/project-definition.md` for the exact submission checklist if needed.
- Refer to the codebase and docs cited in the gap analysis when drafting steps (e.g. RAG doc, gitnexus-web components, server API).

**Output**
- Create `docs/final-submission/mitigation-plan.md` with the step-by-step plan. Optionally add a short "Summary" or "How to use this plan" at the top. Stop after writing the plan so the user can review before any implementation.

---

Copy the text above (from "Create a step-by-step mitigation plan" through "before any implementation") into a new chat to generate the mitigation plan.
