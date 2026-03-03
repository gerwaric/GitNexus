"""
Backend client for GitNexus REST tool endpoints.
Used by the Streamlit app to call query, context, and cypher.
"""

import os
import json
import requests

GITNEXUS_URL = os.environ.get("GITNEXUS_URL", "http://127.0.0.1:4747")
TIMEOUT = 60


def _post(path: str, body: dict) -> tuple[dict | str, bool]:
    """POST to GitNexus API. Returns (parsed JSON or error string, ok)."""
    url = f"{GITNEXUS_URL.rstrip('/')}{path}"
    try:
        r = requests.post(url, json=body, timeout=TIMEOUT)
        if r.status_code != 200:
            return f"HTTP {r.status_code}: {r.text[:500]}", False
        return r.json(), True
    except requests.exceptions.ConnectionError:
        return "Connection error: GitNexus server unreachable. Is it running?", False
    except requests.exceptions.Timeout:
        return "Request timed out.", False
    except Exception as e:
        return str(e), False


def call_query(
    query: str,
    repo: str = "lapack",
    limit: int = 5,
    max_symbols: int = 10,
    include_content: bool = False,
    task_context: str | None = None,
    goal: str | None = None,
) -> dict | str:
    """Call POST /api/tools/query. Returns result dict or error string."""
    body = {
        "query": query,
        "repo": repo,
        "limit": limit,
        "max_symbols": max_symbols,
        "include_content": include_content,
    }
    if task_context is not None:
        body["task_context"] = task_context
    if goal is not None:
        body["goal"] = goal
    result, ok = _post("/api/tools/query", body)
    if ok:
        return result
    return result


def call_context(
    name: str | None = None,
    uid: str | None = None,
    repo: str = "lapack",
    file_path: str | None = None,
    include_content: bool = False,
) -> dict | str:
    """Call POST /api/tools/context. Returns result dict or error string."""
    body = {"repo": repo, "include_content": include_content}
    if name is not None:
        body["name"] = name
    if uid is not None:
        body["uid"] = uid
    if file_path is not None:
        body["file_path"] = file_path
    result, ok = _post("/api/tools/context", body)
    if ok:
        return result
    return result


def call_cypher(query: str, repo: str = "lapack") -> dict | str:
    """Call POST /api/tools/cypher. Returns result dict or error string."""
    result, ok = _post("/api/tools/cypher", {"query": query, "repo": repo})
    if ok:
        return result
    return result


def call_impact(
    target: str,
    direction: str = "upstream",
    repo: str = "lapack",
    max_depth: int = 3,
    relation_types: list[str] | None = None,
    include_tests: bool = False,
    min_confidence: float | None = None,
) -> dict | str:
    """Call POST /api/tools/impact. Returns result dict or error string."""
    body: dict = {
        "target": target,
        "direction": direction,
        "repo": repo,
        "maxDepth": max_depth,
        "includeTests": include_tests,
    }
    if relation_types is not None:
        body["relationTypes"] = relation_types
    if min_confidence is not None:
        body["minConfidence"] = min_confidence
    result, ok = _post("/api/tools/impact", body)
    if ok:
        return result
    return result


# Wiki can take 1–5+ minutes; use long timeout.
WIKI_TIMEOUT = 600


def call_wiki(repo: str = "lapack", force: bool = False) -> dict | str:
    """Call POST /api/tools/wiki. Triggers wiki generation; long-running (1–5+ min). Returns result dict or error string."""
    url = f"{GITNEXUS_URL.rstrip('/')}/api/tools/wiki"
    try:
        r = requests.post(
            url,
            json={"repo": repo, "force": force},
            timeout=WIKI_TIMEOUT,
        )
        if r.status_code != 200:
            return f"HTTP {r.status_code}: {r.text[:500]}"
        return r.json()
    except requests.exceptions.Timeout:
        return "Request timed out. Wiki generation may take 5+ minutes."
    except requests.exceptions.ConnectionError:
        return "Connection error: GitNexus server unreachable. Is it running?"
    except Exception as e:
        return str(e)
