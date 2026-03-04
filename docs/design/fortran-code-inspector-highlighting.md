# Fortran Code Inspector syntax highlighting

This note documents how Fortran is highlighted in the gitnexus-web **Code Inspector** panel (AI citations and selected-file viewer) and the fix for fixed-form comment lines.

## Stack

- **react-syntax-highlighter** (Prism build) uses **Refractor** from `refractor/all` for tokenization.
- Language is chosen by file extension only in the panel: `.py`, `.js`/`.jsx`, `.ts`/`.tsx`, `.f`/`.f90`/`.for` → `fortran`, else `text` (see `deriveLanguage()` in `CodeReferencesPanel.tsx`).
- To keep Fortran in the bundle, the app imports `refractor/all` (e.g. in the panel); the patch runs from `main.tsx` so it executes at startup.

## Issue: fixed-form comment lines not highlighted

**Symptom:** In fixed-form Fortran (`.f` / `.for`), comment lines marked with `C`, `c`, or `*` in column 1 were not styled as comments; keywords inside those lines were highlighted as code.

**Cause:** The Refractor/Prism Fortran grammar only matches `!`-style comments. It does not match fixed-form comment lines (column 1 = `C`, `c`, or `*`).

**First approach (did not work):** We tried to `refractor.register()` a custom Fortran syntax that added a second comment pattern and reordered the grammar. The patch ran and we saw “applied” in the console, but the grammar never changed.

**Root cause:** Refractor’s `register()` **skips** if the language is already registered:

```js
if (!Object.hasOwn(refractor.languages, syntax.displayName)) {
  syntax(refractor)
}
```

`refractor/all` had already registered `fortran`, so our `register(fortranWithFixedFormComments)` did nothing and our syntax function was never called.

## Fix: patch grammar in place

Instead of registering a new syntax, we **mutate the existing** `refractor.languages.fortran` object after `refractor/all` has loaded:

1. **Add fixed-form comment pattern**  
   Set `comment` to an array: first pattern `^[ \t]*[Cc*][^\n]*` (multiline), then the existing `!.*` pattern. Optional leading space is allowed for layout.

2. **Reorder grammar**  
   Ensure the `comment` token is tried before `operator` and `keyword` so a leading `*` is treated as the start of a comment line, not an operator.

Implementation: `gitnexus-web/src/lib/fortran-prism-patch.ts`, loaded from `main.tsx` at app startup.

## References

- Refractor: `refractor/lib/core.js` (`register()` logic).
- Prism Fortran grammar: `refractor/lang/fortran.js` (only `!` comment).
- Fixed-form comments: column 1 = `C`, `c`, or `*` (e.g. Oracle Fortran 77 docs, OpenMP fixed-form).
