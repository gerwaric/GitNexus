/**
 * Patches Refractor's Fortran grammar to support fixed-form comment lines
 * (C, c, or * in column 1). The default grammar only matches !-style comments.
 * Refractor's register() skips if the language already exists (fortran is
 * registered by refractor/all), so we mutate the existing grammar in place.
 */
import { refractor } from 'refractor/all';

const g = refractor.languages.fortran as Record<string, unknown> | undefined;
if (!g || typeof g !== 'object') {
  // fortran not yet registered (e.g. refractor/all not loaded); skip
} else {
  const existing = g.comment as { pattern: RegExp; greedy?: boolean } | undefined;
  const freeFormComment =
    existing && (existing as any).pattern
      ? existing
      : { pattern: /!.*/, greedy: true };
  const fixedFormComment = { pattern: /^[ \t]*[Cc*][^\n]*/m, greedy: true };
  (g as Record<string, unknown>).comment = [fixedFormComment, freeFormComment];

  // Try comment before other tokens so * / C at line start become comment, not operator/keyword
  const { comment, ...rest } = g as Record<string, unknown>;
  const reordered = { comment, ...rest };
  Object.keys(g).forEach((k) => delete (g as Record<string, unknown>)[k]);
  Object.assign(g, reordered);
}
