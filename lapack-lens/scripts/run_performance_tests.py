#!/usr/bin/env python3
"""
Performance test script for Lapack Lens.

Simulates the chat flow: for each natural-language query, calls GitNexus REST API
and OpenAI in the same tool loop as the Streamlit app, records end-to-end latency,
and writes a structured report (JSON and optional Markdown).

Usage:
  From lapack-lens directory (with app deps installed, e.g. pip install -r app/requirements.txt):
    PYTHONPATH=app python3 scripts/run_performance_tests.py [--queries scripts/queries.json] [--output performance_report.json]
  Or from lapack-lens/app with venv activated:
    python3 -m run_performance_tests  (if script is on path) or
    PYTHONPATH=. python3 ../scripts/run_performance_tests.py

Requires: OPENAI_API_KEY, GitNexus server running (GITNEXUS_URL, default http://127.0.0.1:4747).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Allow importing from lapack-lens/app
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from openai import OpenAI

from app.app import SYSTEM_PROMPT, TOOLS, chat_round


def load_queries(path: Path) -> list[str]:
    """Load query strings from a JSON file (array of strings) or return default list."""
    if path and path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [str(q) for q in data]
        if isinstance(data, dict) and "queries" in data:
            return [str(q) for q in data["queries"]]
        raise ValueError(f"Expected JSON array or {{'queries': [...]}} in {path}")
    # Default: same 10 as docs/testing-scenarios.md
    return [
        "Where is the main entry point of this program?",
        "What does the routine dgemm do?",
        "What are the dependencies of the module or routine that computes eigenvalues?",
        "Where is the Cholesky factorization implemented?",
        "Find all file I/O operations in the codebase.",
        "Show me error handling patterns in this codebase.",
        "What BLAS routines does LAPACK call for matrix multiplication?",
        "Where is the singular value decomposition (SVD) implemented?",
        "What would be affected if I change routine dgetrf?",
        "Explain what the dsyev subroutine does and where it is defined.",
    ]


def run_one_query(
    client: OpenAI,
    query: str,
    max_excerpt_len: int = 300,
) -> dict:
    """
    Run a single query through the same tool loop as the app.
    Returns dict with latency_s, success, excerpt, error (if any).
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]
    start = time.perf_counter()
    try:
        updated, final = chat_round(messages, client)
        elapsed = time.perf_counter() - start
        excerpt = (final or "")[:max_excerpt_len] if final else ""
        return {
            "query": query,
            "latency_s": round(elapsed, 2),
            "success": True,
            "excerpt": excerpt,
            "error": None,
        }
    except Exception as e:
        elapsed = time.perf_counter() - start
        return {
            "query": query,
            "latency_s": round(elapsed, 2),
            "success": False,
            "excerpt": "",
            "error": str(e),
        }


def report_markdown(results: list[dict]) -> str:
    """Produce a Markdown summary of the report."""
    lines = [
        "# Lapack Lens performance report",
        "",
        "| # | Query | Latency (s) | Success | Excerpt / Error |",
        "|---|-------|-------------|---------|-----------------|",
    ]
    for i, r in enumerate(results, 1):
        q = (r["query"][:50] + "…") if len(r["query"]) > 50 else r["query"]
        lat = r["latency_s"]
        ok = "✓" if r["success"] else "✗"
        excerpt_or_err = (r["excerpt"] or r["error"] or "")[:80].replace("\n", " ")
        if len((r["excerpt"] or r["error"] or "")) > 80:
            excerpt_or_err += "…"
        lines.append(f"| {i} | {q} | {lat} | {ok} | {excerpt_or_err} |")
    latencies = [r["latency_s"] for r in results if r["success"]]
    if latencies:
        lines.extend([
            "",
            f"- **Queries:** {len(results)} total, {sum(1 for r in results if r['success'])} succeeded.",
            f"- **Latency:** min={min(latencies)}s, max={max(latencies)}s, avg={sum(latencies)/len(latencies):.2f}s.",
        ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run performance tests: simulate chat with GitNexus + OpenAI, record latency per query.",
    )
    parser.add_argument(
        "--queries",
        type=Path,
        default=_ROOT / "scripts" / "queries.json",
        help="Path to JSON file with array of query strings (default: scripts/queries.json)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_ROOT / "performance_report.json",
        help="Output path for JSON report (default: performance_report.json in lapack-lens)",
    )
    parser.add_argument(
        "--md",
        type=Path,
        default=None,
        help="If set, also write a Markdown report to this path",
    )
    args = parser.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is not set.", file=sys.stderr)
        return 1

    queries = load_queries(args.queries)
    print(f"Running {len(queries)} queries (GitNexus at {os.environ.get('GITNEXUS_URL', 'http://127.0.0.1:4747')})...")
    client = OpenAI()

    results: list[dict] = []
    for i, query in enumerate(queries, 1):
        print(f"  [{i}/{len(queries)}] {query[:60]}...")
        results.append(run_one_query(client, query))

    report = {
        "queries_count": len(queries),
        "success_count": sum(1 for r in results if r["success"]),
        "results": results,
    }
    if results and all(r["success"] for r in results):
        latencies = [r["latency_s"] for r in results]
        report["latency_s"] = {"min": min(latencies), "max": max(latencies), "avg": round(sum(latencies) / len(latencies), 2)}

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Wrote {args.output}")

    if args.md:
        args.md.parent.mkdir(parents=True, exist_ok=True)
        with open(args.md, "w", encoding="utf-8") as f:
            f.write(report_markdown(results))
        print(f"Wrote {args.md}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
