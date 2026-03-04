# COBOL Code Inspector syntax highlighting

This note documents how COBOL is highlighted in the gitnexus-web **Code Inspector** panel (AI citations and selected-file viewer).

## Stack

- **react-syntax-highlighter** (Prism build) uses **Refractor** from `refractor/all` for tokenization.
- Language is chosen by file extension in the panel: `.py`, `.js`/`.jsx`, `.ts`/`.tsx`, `.f`/`.f90`/`.for` → `fortran`, `.cbl`/`.cob`/`.cpy` → `cobol`, else `text` (see `deriveLanguage()` in `CodeReferencesPanel.tsx`).
- `refractor/all` includes the Prism COBOL grammar; no grammar patch is applied (unlike Fortran fixed-form comments).

## Supported extensions

- **`.cbl`** — COBOL source
- **`.cob`** — COBOL source
- **`.cpy`** — COBOL copybook

These match the extensions used elsewhere in GitNexus (e.g. `getLanguageFromFilename()`, COPY resolution). See [cobol-support.md](./cobol-support.md).

## Implementation

- **CodeReferencesPanel.tsx:** `deriveLanguage()` maps the above extensions (and fallback display-name checks for stem-only paths) to `'cobol'`, which Refractor uses for its built-in COBOL grammar.

No startup patch is required; the Refractor COBOL grammar is used as registered by `refractor/all`.

## References

- Refractor COBOL: `refractor/lang/cobol.js` (in `node_modules/refractor`).
- Fortran equivalent (including grammar patch): [fortran-code-inspector-highlighting.md](./fortran-code-inspector-highlighting.md).
