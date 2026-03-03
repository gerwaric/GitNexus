# LAPACK Repository Index

Index of routines, modules, constants, and data types provided by the LAPACK repository at `lapack` (Reference LAPACK). Each entry is a bullet with the plain name and a terse description. Prefixed names (e.g. S/D/C/Z for precision) are summarized by base name.

---

## Modules

- **LA_CONSTANTS** — Fortran module: scaling constants and safe limits for single/double precision (sp/dp, szero/sone, ssafmin/ssafmax, Blue’s constants).
- **LA_XISNAN** — Fortran module: generic interface `LA_ISNAN` for NaN check; procedures SISNAN, DISNAN (and internal SLAISNAN/DLAISNAN when no compiler isnan).

---

## Constants

### From LA_CONSTANTS (Fortran)

- **sp** — Kind parameter for single precision (real and complex).
- **dp** — Kind parameter for double precision (real and complex).
- **szero, sone, shalf, stwo, sthree, sfour, seight, sten** — Single-precision real constants 0, 1, 1/2, 2, 3, 4, 8, 10.
- **czero, cone, chalf** — Single-precision complex constants (0,0), (1,0), (0.5,0).
- **dzero, done, dhalf, dtwo, dthree, dfour, deight, dten** — Double-precision real constants.
- **zzero, zone, zhalf** — Double-precision complex constants.
- **sulp, seps, ssafmin, ssafmax, ssmlnum, sbignum, srtmin, srtmax** — Single-precision unit roundoff, safe min/max, and related scaling limits.
- **stsml, stbig, sssml, ssbig** — Blue’s scaling constants (single).
- **dulp, deps, dsafmin, dsafmax, dsmlnum, dbignum, drtmin, drtmax** — Double-precision analogues.
- **dtsml, dtbig, dssml, dsbig** — Blue’s scaling constants (double).
- **sprefix, cprefix, dprefix, zprefix** — Character 'S','C','D','Z' for naming.

### From LAPACKE (C)

- **LAPACK_ROW_MAJOR** — 101; row-major layout.
- **LAPACK_COL_MAJOR** — 102; column-major layout.
- **LAPACK_WORK_MEMORY_ERROR** — -1010.
- **LAPACK_TRANSPOSE_MEMORY_ERROR** — -1011.

---

## Data types

### LAPACKE (C API)

- **lapack_int** — Integer type for dimensions and strides (int32_t or int64_t).
- **lapack_logical** — Logical type (typically same as lapack_int).
- **lapack_complex_float** — Single-precision complex (struct or C99 _Complex).
- **lapack_complex_double** — Double-precision complex (struct or C99 _Complex).
- **lapack_make_complex_float(re, im)** — Build single-precision complex from real/imag.
- **lapack_make_complex_double(re, im)** — Build double-precision complex from real/imag.

### Fortran (from LA_CONSTANTS)

- **sp** — Single-precision real/complex kind.
- **dp** — Double-precision real/complex kind.

---

## LAPACK routines (base names; S/D/C/Z variants exist where applicable)

### Linear solve — LU (general matrix)

- **GESV** — Factor and solve Ax = b (full).
- **GESVX** — Factor and solve with condition/refinement (expert).
- **GESVXX** — Factor and solve with extra-precise refinement (optional).
- **GBSV, GBSVX, GBSVXX** — Banded LU factor and solve (driver / expert / extra-precise).
- **GTSV, GTSVX** — Tridiagonal factor and solve (driver / expert).
- **GECON** — Condition number estimate (full).
- **GETRF, GETRF2, GETF2** — LU factor (full, recursive panel, level-2 panel).
- **GETRS, GETRI** — Triangular solve and inverse using LU factor.
- **GERFS, GERFSX** — Iterative refinement (standard / expert).
- **GEEQU, GEEQUB** — Equilibration (standard / power-of-two).
- **LAQGE** — Row/column scale general matrix.
- **LASWP** — Swap rows by permutation.
- **GETC2, GESC2** — LU with complete pivoting (factor / solve).
- **LATDF** — Dif estimate (complete-pivoting step, e.g. in TGSEN).
- **GBCON, GBTRF, GBTF2, GBTRS** — Banded: condition, factor, level-2 factor, solve.
- **GBRFS, GBRFSX, GBEQU, GBEQUB, LAQGB** — Banded refinement and equilibration.
- **GTCON, GTTRF, GTTRS, GTTS2, GTRFS** — Tridiagonal condition, factor, solve, refinement.

### Linear solve — Cholesky (symmetric/Hermitian positive definite)

- **POSV, POSVX, POSVXX** — Full: factor and solve (driver / expert / extra-precise).
- **PPSV, PPSVX** — Packed factor and solve.
- **PBSV, PBSVX** — Banded factor and solve.
- **PTSV, PTSVX** — Tridiagonal factor and solve.
- **POCON, POTRF, POTRF2, POTF2** — Full: condition, Cholesky factor (recursive / level-2).
- **POTRS, POTRI** — Triangular solve and inverse.
- **PSTRF, PSTF2** — Cholesky with pivoting (factor / level-2).
- **PORFS, PORFSX, POEQU, POEQUB** — Refinement and equilibration (full).
- **PPCON, PPTRF, PPTRS, PPTRI, PPRFS, PPEQU** — Packed condition, factor, solve, inverse, refinement, equilibration.
- **PFTRF, PFTRI, PFTRS** — RFP format: factor, inverse, solve.
- **PBCON, PBTRF, PBTF2, PBTRS** — Banded condition, factor, solve.
- **PBRFS, PBEQU, LAQHB** — Banded refinement and equilibration.
- **PTCON, PTTRF, PTTRS, PTTS2, PTRFS** — Tridiagonal condition, factor, solve, refinement.

### Linear solve — LDL (symmetric/Hermitian indefinite)

- **SYSV, SYSVX, SYSVXX** — Full symmetric indefinite (driver / expert / extra-precise).
- **SYSV_ROOK, SYSV_RK** — Rook pivoting and Bunch–Kaufman (RK) variants.
- **SYSV_AA, SYSV_AA_2STAGE** — Aasen (full / 2-stage).
- **SPSV, SPSVX** — Packed symmetric indefinite.
- **SYCON, SYTRF, SYTF2** — Condition, LDL factor, level-2 factor.
- **SYTRS, SYTRI** — Triangular solve and inverse.
- **SYTRI2, SYTRI2X, SYTRI_3, SYTRI_3X** — Alternative inverse routines.
- **SYCON_3, SYCON_ROOK** — Condition (RK format / Rook).
- **SYRFS, SYRFSX** — Iterative refinement.
- **SYEQUB** — Equilibration (power-of-two).
- **SYCONV, SYCONVF, SYCONVF_ROOK** — Convert factor storage (L/D, RK, Rook).
- **SYSWAPR** — Apply two-sided permutation.
- **SYTRF_ROOK, SYTF2_ROOK** — Rook LDL factor (full / level-2).
- **SYTRF_RK, SYTF2_RK** — Bunch–Kaufman RK factor.
- **SYTRF_AA, SYTRF_AA_2STAGE** — Aasen factor (full / 2-stage).
- **SYTRS_3, SYTRS_ROOK, SYTRS_AA, SYTRS_AA_2STAGE** — Solve with various factor formats.
- **HESV, HESVX, HESVXX** — Hermitian indefinite (same structure as SY* with HE* names).
- **HESV_ROOK, HESV_RK, HESV_AA, HESV_AA_2STAGE** — Hermitian variants (Rook, RK, Aasen).
- **HPSV, HPSVX** — Packed Hermitian indefinite.
- **HECON, HETRF, HETF2, HETRS, HETRI** — Hermitian condition, factor, solve, inverse.
- **HECON_3, HECON_ROOK, HETRI2, HETRI2X, HETRI_3, HETRI_3X, HETRI_ROOK** — Hermitian condition/inverse variants.
- **HETRF_ROOK, HETF2_ROOK, HETRF_RK, HETRF_AA, HETRF_AA_2STAGE** — Hermitian factor variants.
- **HETRS_3, HETRS_ROOK, HETRS_AA, HETRS_AA_2STAGE** — Hermitian solve variants.
- **LAHEF, LAHEF_ROOK, LAHEF_RK, LAHEF_AA** — Internal factor steps (Hermitian).
- **LASYF, LASYF_ROOK, LASYF_RK, LASYF_AA** — Internal factor steps (symmetric).
- **HPCON, HPTRF, HPTRS, HPTRI, HPRFS** — Packed Hermitian condition, factor, solve, inverse, refinement.

### Triangular (solve, condition, inverse)

- **TRCON** — Condition number (full).
- **TRTRS** — Triangular solve (full).
- **LATRS, LATRS3** — Triangular solve with scaling (level-2 / level-3).
- **TRTRI, TRTI2** — Triangular inverse (blocked / level-2).
- **TRRFS** — Iterative refinement.
- **LAUU2, LAUUM** — U^H*U (level-2 / blocked).
- **TPCON, TPTRS, TPTRI, TPRFS** — Packed triangular condition, solve, inverse, refinement.
- **TFTRI** — RFP triangular inverse.
- **TBCON, TBTRS** — Banded triangular condition and solve.
- **LATBS** — Banded triangular solve with scaling.
- **TBRFS** — Banded triangular refinement.
- **TFSM** — RFP triangular solve (matrix).

### Least squares

- **GELS** — Least squares via QR/LQ.
- **GELST** — Least squares with T matrix (QR/LQ).
- **GELSS** — Least squares via SVD (QR iteration).
- **GELSD** — Least squares via SVD (divide-and-conquer).
- **GELSY** — Least squares via complete orthogonal factorization.
- **GETSLS** — Tall-skinny QR/LQ least squares.
- **GGLSE** — Equality-constrained least squares.
- **GGGLM** — Gauss–Markov linear model.
- **LAIC1** — Condition estimate step (e.g. GELSY).
- **LALS0, LALSA, LALSD** — SVD/back-multiply steps (e.g. GELSD).

### Orthogonal/unitary factors (QR, LQ, QL, RQ, RZ, CS)

- **GEQRF, GEQR2** — QR factor (blocked / level-2).
- **GEQRFP, GEQR2P** — QR with nonnegative R diagonal.
- **UNGQR, UNG2R** — Form Q from QR (blocked / level-2).
- **UNMQR, UNM2R** — Multiply by Q from QR.
- **GEQRT, GEQRT2, GEQRT3** — QR with T (blocked / level-2 / recursive).
- **GEMQRT** — Multiply by Q from GEQRT.
- **GEQP3** — QR with column pivoting.
- **LAQP2, LAQPS** — Pivoted QR steps.
- **GEQP3RK, LAQP2RK, LAQP3RK** — Pivoted QR (rank-revealing).
- **LATSQR** — Tall-skinny QR factor.
- **UNGTSQR, UNGTSQR_ROW** — Form Q from tall-skinny QR.
- **LARFB_GETT** — Block reflector apply (UNGTSQR_ROW step).
- **LAMTSQR** — Multiply by Q from LATSQR.
- **GETSQRHRT** — Tall-skinny QR with Householder reconstruction.
- **UNHR_COL** — Householder reconstruction (column).
- **LAUNHR_COL_GETRFNP** — LU without pivoting (used with UNHR_COL).
- **TPQRT, TPQRT2** — Triangular-pentagonal QR factor.
- **TPMQRT, TPRFB** — Apply Q from TPQR.
- **GGQRF** — Generalized QR factor.
- **GELQF, GELQ2** — LQ factor (blocked / level-2).
- **UNGLQ, UNGL2** — Form Q from LQ.
- **UNMLQ, UNML2** — Multiply by Q from LQ.
- **GELQT, GELQT3** — LQ with T (blocked / recursive).
- **GEMLQT** — Multiply by Q from GELQT.
- **GELQ** — Flexible LQ factor.
- **GEMLQ** — Multiply by Q from GELQ.
- **LASWLQ, LAMSWLQ** — Short-wide LQ factor and multiply by Q.
- **TPLQT, TPLQT2** — Triangular-pentagonal LQ factor.
- **TPMLQT** — Apply Q from TPLQ.
- **GEQLF, GEQL2** — QL factor (blocked / level-2).
- **UNGQL, UNG2L** — Form Q from QL.
- **UNMQL, UNM2L** — Multiply by Q from QL.
- **GERQF, GERQ2** — RQ factor (blocked / level-2).
- **UNGRQ, UNGR2** — Form Q from RQ.
- **UNMRQ, UNMR2** — Multiply by Q from RQ.
- **GGRQF** — Generalized RQ factor.
- **TZRZF** — RZ (trapezoidal) factor.
- **LATRZ** — RZ factor step.
- **UNMRZ, UNMR3** — Multiply by Z from RZ.
- **LARZ, LARZB, LARZT** — Apply reflector and form T (RZ).
- **BBCSD** — Bidiagonal CS (cosine-sine) step.
- **UNCSD, UNCSD2BY1** — CS decomposition (full / 2-by-1).
- **UNBDB, UNBDB1–UNBDB6** — Bidiagonalize partitioned unitary (steps for UNCSD).
- **LAPMR, LAPMT** — Permute rows / columns.
- **LARF, LARFX, LARFY** — Apply Householder reflector (and variants).
- **LARFB** — Apply block Householder reflector.
- **LARFG, LARFGP** — Generate Householder reflector (standard / nonnegative beta).
- **LARFT, LARFT_LVL2** — Form T from Householder block.
- **LARTG, LARTGP** — Generate Givens rotation (stable).
- **LASR** — Apply plane rotations.
- **LARGV, LARTV, LAR2V** — Generate/apply vector of rotations.
- **LACRT** — Apply plane rotation (complex).

### Non-symmetric eigenvalue problems

- **GEEV, GEEVX** — Eigenvalues (and optionally eigenvectors) of general matrix.
- **GEES, GEESX** — Schur form (and optional ordering).
- **GGEV, GGEV3, GGEVX** — Generalized eigenvalues (and variants).
- **GGES, GGES3, GGESX** — Generalized Schur form.
- **GEDMD, GEDMDQ** — Dynamic Mode Decomposition (DMD).
- **GEBAL, GEBAK** — Balance / back-transform eigenvectors.
- **GEHRD, GEHD2** — Reduction to Hessenberg (blocked / level-2).
- **LAHR2** — Hessenberg step (blocked).
- **UNGHR** — Form Q from Hessenberg reduction.
- **UNMHR** — Multiply by Q from Hessenberg.
- **HSEQR** — Eigenvalues of Hessenberg (QR iteration).
- **HSEIN** — Eigenvectors by inverse iteration (Hessenberg).
- **TREVC, TREVC3** — Eigenvectors of triangular Schur form (old / blocked).
- **LALN2** — 1×1 or 2×2 solve (TREVC step).
- **TRSYL, TRSYL3** — Sylvester equation (AX ± XB = C).
- **LASY2** — Sylvester 2×2 step.
- **TRSNA** — Eigenvalue/eigenvector condition numbers.
- **LAQTR** — Quasi-triangular solve.
- **TREXC** — Reorder Schur form (single pair).
- **TRSEN** — Reorder Schur form (selected cluster).
- **LAEXC** — Reorder Schur (2×2 block).
- **LANV2** — 2×2 Schur block.
- **LAEIN** — Inverse iteration for single eigenvector.
- **LAHQR** — Eigenvalue of Hessenberg (single shift step).
- **LAQR0–LAQR5** — Hessenberg QR steps (multishift / etc.).
- **IPARMQ** — Tuning parameters for HSEQR.
- **GGBAK, GGBAL** — Back-transform and balance (generalized).
- **GGHRD, GGHD3** — Generalized Hessenberg reduction.
- **HGEOZ** — Generalized Hessenberg eigenvalue (QZ).
- **LAQZ0–LAQZ4** — QZ step routines (generalized).
- **TGSEN** — Reorder generalized Schur form.
- **TGSNA** — Generalized eigenvalue condition numbers.
- **TGSYL** — Generalized Sylvester equation.
- **TGSY2** — Generalized Sylvester 2×2 step.
- **UNM22** — Multiply by banded Q (GGHD3 step).
- **LAGV2** — 2×2 generalized Schur block.
- **TGEXC, TGEX2** — Reorder generalized Schur (pair / block).
- **TGEVC** — Eigenvectors of matrix pair.

### Symmetric/Hermitian eigenvalue problems

- **SYEV, SYEVD, SYEVR, SYEVX** — Symmetric eig (QR / DC / MRRR / bisection).
- **SYEV_2STAGE, SYEVD_2STAGE, SYEVR_2STAGE, SYEVX_2STAGE** — 2-stage symmetric drivers.
- **HEEV, HEEVD, HEEVR, HEEVX** — Hermitian eig (same algorithms).
- **HEEV_2STAGE** — 2-stage Hermitian driver.
- **SPEV, SPEVD, SPEVX** — Packed symmetric eig.
- **HPEV, HPEVD, HPEVX** — Packed Hermitian eig.
- **SBEV, SBEVD, SBEVX** — Banded symmetric eig.
- **SBEV_2STAGE, SBEVD_2STAGE, SBEVX_2STAGE** — 2-stage banded symmetric.
- **HBEV, HBEVD, HBEVX** — Banded Hermitian eig.
- **STEV, STEVD, STEVR, STEVX** — Tridiagonal symmetric eig.
- **PTEQR** — Tridiagonal positive-definite eig.
- **STEBZ** — Tridiagonal eig (bisection / Kahan).
- **STERF** — Tridiagonal eig (QR, values only).
- **STEDC** — Tridiagonal eig (divide-and-conquer).
- **STEGR** — Tridiagonal eig (bisection; see STEMR).
- **STEIN** — Tridiagonal eigenvectors (inverse iteration).
- **STEMR** — Tridiagonal eig (MRRR).
- **STEQR** — Tridiagonal eig (QR).
- **SYGV, SYGVD, SYGVX** — Generalized symmetric (full).
- **SYGV_2STAGE** — 2-stage generalized symmetric.
- **HEGV, HEGVD, HEGVX** — Generalized Hermitian (full).
- **HPGV, HPGVD, HPGVX** — Generalized packed.
- **SBGV, SBGVD, SBGVX** — Generalized banded symmetric.
- **HBGV, HBGVD, HBGVX** — Generalized banded Hermitian.
- **SYTRD, SYTD2** — Symmetric reduction to tridiagonal (blocked / level-2).
- **SYTRD_2STAGE, SYTRD_SY2SB, SYTRD_SB2ST** — 2-stage tridiagonal reduction.
- **SB2ST_KERNELS** — Band-to-tridiagonal kernels (2-stage).
- **HETRD, HETD2** — Hermitian reduction to tridiagonal.
- **HETRD_2STAGE, HETRD_HE2HB** — 2-stage Hermitian tridiagonal.
- **LATRD** — Tridiagonal reduction step.
- **UNGTR** — Form Q from tridiagonal reduction (full).
- **UNMTR** — Multiply by Q from tridiagonal reduction.
- **HPTRD** — Packed Hermitian tridiagonal reduction.
- **UPGTR, UPMTR** — Form Q / multiply by Q (packed).
- **HBTRD** — Banded Hermitian tridiagonal reduction.
- **SYGST, SYGS2** — Reduce to standard form (full / level-2).
- **HPGST, HBGST** — Reduce to standard form (packed / banded).
- **PBSTF** — Split Cholesky (for banded generalized).
- **LAG2** — 2×2 generalized eig step.
- **LAE2, LAESY, LAEV2** — 2×2 symmetric eig steps.
- **LAGTF, LAGTS** — LU factor / solve of (T − λI).
- **LAEBZ** — Count eigenvalues ≤ value (bisection).
- **LANEG** — Sturm count.
- **LAED0–LAED9, LAEDA** — Divide-and-conquer tridiagonal steps.
- **LAMRG** — Merge two sorted lists (permutation).
- **LARRA, LARRB, LARRC, LARRD** — STEMR/STEGR steps (RRR).
- **LARRE, LARRF, LARRJ, LARRK** — RRR and refinement steps.
- **LARRR** — Test for expensive tridiagonal path.
- **LARRV, LAR1V** — Eigenvector computation (tridiagonal).

### Singular value decomposition

- **GESVD** — SVD (QR iteration).
- **GESVDQ** — SVD (QR with pivoting).
- **GESDD** — SVD (divide-and-conquer).
- **GESVDX** — SVD (bisection).
- **GEJSV** — SVD (Jacobi, high-level).
- **GESVJ** — SVD (Jacobi, low-level).
- **GSVJ0, GSVJ1** — Jacobi SVD steps.
- **BDSQR** — Bidiagonal SVD (QR/dqds).
- **BDSDC** — Bidiagonal SVD (divide-and-conquer).
- **BDSVDX** — Bidiagonal SVD (bisection).
- **GGSVD3** — Generalized SVD (driver).
- **GEBRD, GEBD2** — Reduction to bidiagonal (blocked / level-2).
- **LABRD** — Bidiagonal reduction step.
- **GBBRD** — Band to bidiagonal.
- **UNGBR** — Form Q/P from bidiagonal reduction.
- **UNMBR** — Multiply by Q/P from bidiagonal.
- **LAS2, LASV2** — 2×2 SVD steps.
- **LARTGS** — Plane rotation for bidiagonal SVD.
- **GGSPV3** — Generalized SVD step.
- **TGSJA** — Generalized SVD of trapezoidal pair (step).
- **LAGS2** — 2×2 orthogonal factor (TGSJA step).
- **LAPLL** — Test linear dependence of two vectors.
- **LASQ1–LASQ6** — Bidiagonal QR (dqds) steps.
- **LASD0–LASD8, LASDA, LASDQ, LASDT** — Bidiagonal divide-and-conquer steps.

### BLAS-like (norms, copy, scale, etc.)

- **LASET** — Set matrix to scalar or identity.
- **LACPY** — Copy matrix.
- **LARNV, LARUV** — Random vector (normal / uniform).
- **LANGE, LANGB, LANGT** — General matrix norms (full / band / tridiagonal).
- **LANHS** — Hessenberg norm.
- **LANSY, LANHE** — Symmetric/Hermitian norm (full).
- **LANSP, LANHP** — Symmetric/Hermitian packed norm.
- **LANSB, LANHB** — Symmetric/Hermitian band norm.
- **LANTR, LANTP, LANTB** — Triangular norms (full / packed / band).
- **LANSF** — Symmetric RFP norm.
- **LA_ISNAN, SLAISNAN** — NaN check (generic / single).
- **LADIV** — Complex division (stable).
- **LAPY2, LAPY3** — Robust sqrt(x²+y²), sqrt(x²+y²+z²).
- **LARMM** — Scaling to avoid overflow (LATRS step).
- **LACGV** — Conjugate vector (complex).
- **LASRT** — Sort vector.
- **LASSQ** — Sum of squares (safe).
- **RSCL, SRSCL** — Scale vector by reciprocal.
- **ILALC, ILALR** — Index of last nonzero column/row.
- **LASCL, LASCL2** — Scale matrix (general / diagonal).
- **LARSCL2** — Reciprocal diagonal scale.
- **LAGTM** — Tridiagonal matrix–matrix multiply.
- **LACRM, LARCM** — Complex×real and real×complex matrix multiply.
- **SFRK, HFRK** — Symmetric/Hermitian rank-k update (RFP).
- **TFTTP, TFTTR** — RFP to packed/full (triangular).
- **TPTTF, TPTTR** — Packed to RFP/full (triangular).
- **TRTTF, TRTTP** — Full to RFP/packed (triangular).
- **LACP2** — Copy real to complex (general).
- **LAG2S, LAG2D** — Convert general matrix single↔double.
- **LAT2S, LAT2D** — Convert triangular single↔double.

### Auxiliary and parameters

- **ILAENV** — Block size / tuning parameters.
- **ILAENV2STAGE** — 2-stage tuning parameters.
- **IPARAM2STAGE** — 2-stage parameter set.
- **IPARMQ** — HSEQR tuning.
- **LSAME** — Character comparison (trans, uplo, etc.).
- **LSAMEN** — Compare two character strings.
- **XERBLA** — Error reporting (Fortran).
- **XERBLA_ARRAY** — Error reporting (C-callable).
- **ILAVER** — LAPACK version (INSTALL).
- **SLAMCH, DLAMCH** — Machine constants (INSTALL).
- **SLABAD, DLABAD** — Underflow/overflow (obsolete machines).
- **IEEECK** — Check IEEE inf/NaN handling.
- **ILAPREC, ILATRANS, ILAUPLO, ILADIAG** — Map character to BLAST constant.
- **CHLA_TRANSTYPE** — BLAST constant to string.
- **ROUNDUP_LWORK** — Round workspace size (S/D in INSTALL).
- **SECOND, DSECND** — Wall-clock timer (INSTALL).

---

## BLAS routines (by level; S/D/C/Z prefixes)

### Level 1

- **ASUM** — Sum of |real| + |imag|.
- **AXPY** — y := alpha*x + y.
- **AXPBY** — y := alpha*x + beta*y.
- **COPY** — Copy vector.
- **DOT, DOTC, DOTU** — Dot product (real, conjugate, unconjugate).
- **IAMAX** — Index of max |real| + |imag|.
- **NRM2** — Euclidean norm.
- **SCAL** — x := alpha*x.
- **SWAP** — Swap vectors.
- **ROT** — Apply Givens rotation.
- **ROTG** — Generate Givens rotation.
- **ROTM** — Apply modified rotation.
- **ROTMG** — Generate modified rotation.
- **SDSDOT, DSDOT** — Dot with double accumulation (S/D).
- **SCABS1, DCABS1** — |Re(z)| + |Im(z)| (C/Z).
- **SCASUM, DZASUM** — Sum of |Re| + |Im| (C/Z).

### Level 2

- **GEMV** — General matrix–vector multiply.
- **GBMV** — General band matrix–vector.
- **SYMV, SPMV** — Symmetric (full / packed) matrix–vector.
- **SBMV** — Symmetric band matrix–vector.
- **HEMV, HPMV, HBMV** — Hermitian (full / packed / band) matrix–vector.
- **TRMV, TPMV, TBMV** — Triangular matrix–vector multiply.
- **TRSV, TPSV, TBSV** — Triangular solve.
- **GER** — General rank-1 update.
- **SYR, SPR** — Symmetric rank-1 update.
- **SYR2, SPR2** — Symmetric rank-2 update.
- **HER, HPR** — Hermitian rank-1 update.
- **HER2, HPR2** — Hermitian rank-2 update.
- **GERC, GERU** — Complex rank-1 (conjugate / unconjugate).
- **SKEWSYMV, SKEWSYR2** — Skew-symmetric (S/D).

### Level 3

- **GEMM** — General matrix–matrix multiply.
- **GEMMTR** — General multiply with triangular result.
- **SYMM** — Symmetric matrix multiply.
- **SYRK** — Symmetric rank-k update.
- **SYR2K** — Symmetric rank-2k update.
- **HEMM** — Hermitian matrix multiply.
- **HERK** — Hermitian rank-k update.
- **HER2K** — Hermitian rank-2k update.
- **TRMM** — Triangular matrix multiply.
- **TRSM** — Triangular solve (matrix).
- **SKEWSYMM, SKEWSYR2K** — Skew-symmetric (S/D).

---

## C interfaces

### LAPACKE

- **LAPACKE_*** — C bindings for LAPACK; one function per LAPACK routine (e.g. LAPACKE_sgesv, LAPACKE_dgetrf). Matrix layout (row/column major) passed as first argument.
- **LAPACKE_*_work** — Variants that accept user-provided workspace where applicable.
- **LAPACKE_malloc / LAPACKE_free** — Optional overrides for workspace allocation.
- **LAPACKE_xerbla** — C-callable error reporting.
- **LAPACKE_lsame** — C character comparison (trans/uplo etc.).
- **LAPACKE_*_trans** — Layout conversion helpers (e.g. cge_trans, chb_trans).

### CBLAS

- **cblas_*** — C interface to BLAS (Level 1–3); naming follows BLAS (e.g. cblas_saxpy, cblas_dgemm). Layout and transpose options passed as arguments.

---

## Deprecated

- **DEPRECATED** — Older routines in SRC/DEPRECATED and BLAS/SRC/DEPRECATED; replaced by current drivers/computational routines.

---

*Generated from the LAPACK repository (Reference LAPACK). Routine names are base names; S (single), D (double), C (single complex), Z (double complex) prefixes apply per routine.*
