/**
 * Patches Refractor's Fortran grammar to support fixed-form comment lines
 * (C, c, or * in column 1). The default grammar only matches !-style comments.
 * Run this once at app load so Code Inspector highlights Fortran comments correctly.
 */
import { refractor } from 'refractor/all';
import fortran from 'refractor/fortran';

function fortranWithFixedFormComments(Prism: any) {
  fortran(Prism);
  const g = Prism.languages.fortran;
  const existing = g.comment as { pattern: RegExp; greedy?: boolean };
  g.comment = [
    existing?.pattern ? existing : { pattern: /!.*/, greedy: true },
    { pattern: /^[Cc*][^\n]*/m, greedy: true },
  ];
}

(fortranWithFixedFormComments as any).displayName = 'fortran';
(fortranWithFixedFormComments as any).aliases = [];

refractor.register(fortranWithFixedFormComments as any);
