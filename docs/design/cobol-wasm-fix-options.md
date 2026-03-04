# COBOL parser fix (Web WASM) — options and pros/cons

The **web UI** uses **web-tree-sitter** 0.20.8 and loads COBOL via a WASM built by `gitnexus-web/scripts/build-cobol-wasm.sh`. When parsing a COBOL file, the app crashes with:

```text
TypeError: Cannot read properties of undefined (reading 'apply')
  at e.<computed> (web-tree-sitter.js:483)
  at tree-sitter-cobol.wasm start_with_word / tree_sitter_COBOL_external_scanner_scan
  at Parser.parse → processParsing (parsing-processor.ts)
```

So the **COBOL WASM’s external scanner** calls back into the JS runtime (web-tree-sitter), and the callback web-tree-sitter passes (or the wrapper that does `.apply`) is **undefined** — i.e. an **ABI / export mismatch** between the COBOL WASM and web-tree-sitter 0.20.x.

**Current build:** The script uses `npx -y tree-sitter-cli` (or `tree-sitter build --wasm`), so the COBOL WASM is built with **whatever CLI version npx installs** (often 0.24+). **web-tree-sitter 0.20.8** is designed to work with **tree-sitter-cli 0.20.x** and the WASM ABI from that era. Newer CLIs can change how external scanners are exported or how the JS side looks them up, which leads to undefined callbacks and the `.apply` crash.

---

## Option 1: Pin tree-sitter-cli to 0.20.8 when building COBOL WASM

**What:** In `build-cobol-wasm.sh`, force the COBOL WASM to be built with **tree-sitter-cli 0.20.8** (same as web-tree-sitter’s expected ABI), e.g.:

- `npx -y tree-sitter-cli@0.20.8 build --wasm -o tree-sitter-cobol.wasm`, or  
- Install `tree-sitter-cli@0.20.8` in the repo and call it from the script.

**Pros:**

- No changes to app code or to web-tree-sitter.
- Fix is localized to the build script and one rebuild of the COBOL WASM.
- Aligns COBOL WASM with the same ABI as other prebuilt WASM grammars (e.g. from tree-sitter-wasms) that work with 0.20.x.

**Cons:**

- tree-sitter-cobol may have been developed with a **newer** grammar/CLI (e.g. 0.24.5 in its devDependencies). Building with 0.20.8 might:
  - Fail (e.g. grammar uses syntax only supported in newer CLI).
  - Succeed but produce a different/wrong parse.
- You may need to try an older **commit** of tree-sitter-cobol that still builds with 0.20.x if main breaks.

**Effort:** Low (script + rebuild + smoke test).

---

## Option 2: Upgrade web-tree-sitter (and align all WASM builds)

**What:** Upgrade **web-tree-sitter** to a newer major (e.g. 0.25.x if available), then rebuild **all** language WASM files (including COBOL) with the **matching** tree-sitter-cli version that the new web-tree-sitter expects. Update `parser-loader` and any API changes.

**Pros:**

- Gets upstream fixes for external scanners and WASM loading.
- Single, consistent ABI for all grammars in the web app.

**Cons:**

- Larger change: dependency upgrade, possible API/behavior changes, and rebuilding every WASM (not just COBOL).
- Need to confirm which tree-sitter-cli version the new web-tree-sitter expects and that all current grammars (and tree-sitter-cobol) build with it.
- Risk of regressions in other languages (JS, Python, Fortran, etc.) until fully tested.

**Effort:** Medium–high (upgrade, rebuild all WASMs, full regression pass).

---

## Option 3: Patch web-tree-sitter (guard the callback)

**What:** In the **web-tree-sitter** package (via patch-package, or a fork), find the code path that does `.apply` on the external-scanner callback (e.g. around the “computed” wrapper near line 483). Add a guard: if the callback is undefined, skip calling it or call a no-op, and optionally log a warning, so the parser doesn’t crash.

**Pros:**

- Very localized change; no need to change CLI version or rebuild WASM.
- Unblocks the app immediately even if the COBOL scanner never gets a valid callback (you’d still skip or no-op, but no crash).

**Cons:**

- **Does not fix the root cause**: the COBOL scanner may still not work correctly (wrong or no tokens), so COBOL parsing could remain broken or incomplete.
- You maintain a patch (or fork) and must re-apply or re-review on every web-tree-sitter upgrade.
- Hides the real ABI mismatch; other grammars with external scanners could hit similar issues later.

**Effort:** Low to implement the guard; medium if you later want COBOL to actually parse correctly (still need Option 1 or 2).

---

## Option 4: Fix or rebuild tree-sitter-cobol for 0.20.x ABI

**What:** Ensure the **COBOL grammar** builds and exports its external scanner in a way compatible with web-tree-sitter 0.20.x:

- **A)** Rebuild with tree-sitter-cli 0.20.8 (same as Option 1, but possibly from a fork or a pinned tree-sitter-cobol version that’s known to work with 0.20.x).
- **B)** If the issue is **symbol visibility** (e.g. scanner exports not visible to the JS loader), fork tree-sitter-cobol and add the right visibility/export attributes (e.g. `TS_PUBLIC` or equivalent) in the scanner so the WASM exports the expected symbols; then rebuild with the CLI version that matches web-tree-sitter.

**Pros:**

- Addresses the root cause on the grammar/build side.
- Once the WASM is built correctly, no ongoing patches to web-tree-sitter.

**Cons:**

- May require forking tree-sitter-cobol and upstreaming or maintaining build/visibility changes.
- Option 4B needs some C/C++ and tree-sitter build knowledge.

**Effort:** Medium (fork/patch grammar + rebuild; or just pin CLI and possibly grammar commit — Option 1).

---

## Option 5: Use a different COBOL grammar (no or simpler external scanner)

**What:** Find another **tree-sitter COBOL** grammar that either has no external scanner or one that’s known to work with web-tree-sitter 0.20.x (e.g. older or minimal scanner). Replace yutaro-sakamoto/tree-sitter-cobol in the build script and adjust queries/captures.

**Pros:**

- Might avoid the bug entirely if the alternative grammar doesn’t trigger the undefined callback path.

**Cons:**

- Such a grammar may not exist or may be lower quality / less complete; COBOL is complex and often needs a scanner.
- Integration work: new repo, possibly different node names/captures, and updating queries and any COBOL-specific logic.

**Effort:** Medium–high (evaluation + integration + testing).

---

## Option 6: Keep current behavior (skip COBOL on parse error)

**What:** Leave the **try/catch** in `parsing-processor.ts` that catches parse failures and skips the file (with a dev console warning). Do not fix the COBOL WASM/ABI. Document that COBOL is “best-effort” in the web UI and that full COBOL support is via the CLI (Node binding).

**Pros:**

- No extra work; app is stable; CLI still gives full COBOL support.

**Cons:**

- COBOL files are not parsed in the web UI (no symbols, no COPY/CALL/PERFORM in the graph for those files).

**Effort:** None (already in place).

---

## Recommendation

- **Short term / lowest risk:** Try **Option 1** (pin tree-sitter-cli to 0.20.8 in `build-cobol-wasm.sh` and rebuild the COBOL WASM). If the grammar builds and parses correctly, you get a proper fix with minimal change.
- **If Option 1 fails** (build errors or bad parses): try an **older commit** of tree-sitter-cobol that still works with 0.20.x, or consider **Option 4** (fork + visibility/export fix) plus rebuild with 0.20.8.
- **Option 3** is only for a quick “no crash” band-aid; it does not restore correct COBOL parsing.
- **Option 2** is the right long-term direction if you’re willing to upgrade the whole web-tree-sitter stack and rebuild all WASMs.

See also:

- [tree-sitter-cobol-notes.md](./tree-sitter-cobol-notes.md) (Node/CLI side).
- [cobol-support.md](./cobol-support.md) (design and implementation).
- [tree-sitter-upgrade-notes.md](./tree-sitter-upgrade-notes.md) (tree-sitter version alignment).
