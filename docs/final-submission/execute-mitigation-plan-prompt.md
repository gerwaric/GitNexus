# Prompt: Execute the Mitigation Plan

Use this prompt in a **new chat session** to have an agent execute the step-by-step mitigation plan.

---

Execute the **mitigation plan** in `docs/final-submission/mitigation-plan.md` to close the gaps identified in `docs/final-submission/gap-analysis.md` and meet the LegacyLens G4 submission requirements.

**Instructions**

1. **Read the plan first.** Open and read `docs/final-submission/mitigation-plan.md` in full. Use `docs/final-submission/gap-analysis.md` and the referenced files (e.g. `docs/rag-architecture.md`, `docs/project-definition.md`) for context and rationale. Follow the "Prerequisites / order of work" so documentation, query interface, and code-understanding work can be done in a sensible order; testing/performance can follow after UI/docs changes.

2. **Work through each section in order.** Execute the steps in §1 Documentation, §2 Query interface, §3 Code-understanding features, §4 Testing and performance. **Skip §5 Submission artifacts** — demo video and social post are out of scope (author will deliver). For each step in the plan tables, implement or document as specified. Use the file paths and references given in the plan.

3. **Keep it simple.** Meet the requirements clearly without over-delivering. Where the plan says "Code Inspector only" or "no other panel changes," do not add extra UI or behavior.

4. **Steps that need user input or external data:**  
   - **§1.3 AI Cost Analysis:** Step 1.3.1 requires Google Gemini usage data (CLI, API, or manual export). If you cannot obtain real usage, create the document with placeholder sections and a short note like "Dev/test usage: to be filled from Google Gemini (API/console or manual export)." Complete step 1.3.2 with the document structure and production projections table; use reasonable assumptions and label them.  
   - **§1.1.2 and §4.2:** RAG doc §6 Performance results require measured latency and ingestion time. If the user has not run a performance script or provided numbers, add a placeholder in §6 (e.g. "To be filled after running performance script — see §4.2") and complete the rest of §4 (testing scenarios Outcomes can be filled after manual or scripted runs).  
   For any step that is blocked on the user (e.g. running the app, providing Gemini data), do the rest of the step and add a one-line note so the user knows what to supply.

5. **Decisions.** If the plan lists "Decision needed" (e.g. §3.2 wiki, §4.2 performance script), pick the simpler option unless the user has stated a preference: e.g. rely on four features without wiki; prefer a new minimal script for performance if the old one is not in the repo.

6. **When you are done,** briefly list what was done and what (if anything) is left for the user (e.g. "Fill §6 with real latency numbers after running the performance script," "Add Gemini usage data to AI Cost Analysis").

Do not duplicate the full mitigation plan in your reply; work from the file and report progress as you go.
