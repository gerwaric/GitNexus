"""
Lapack Lens — Streamlit chat UI.
Uses OpenAI with GitNexus REST tools (query, context, cypher) to answer questions about the LAPACK codebase.
"""

import os
import json
import streamlit as st
from openai import OpenAI

from tools import call_query, call_context, call_cypher, call_impact, call_wiki

# ─── Config ─────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DEFAULT_REPO = "lapack"

# OpenAI tool definitions (same descriptions as MCP for agent proficiency)
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_lapack",
            "description": "Query the code knowledge graph for execution flows related to a concept. "
            "Returns processes (call chains) ranked by relevance, each with its symbols and file locations. "
            "WHEN TO USE: Understanding how code works together. Use this when you need execution flows and relationships, not just file matches. "
            "AFTER THIS: Use context() on a specific symbol for 360-degree view (callers, callees, categorized refs). "
            "Returns results grouped by process: processes, process_symbols, definitions. "
            "Hybrid ranking: BM25 keyword + semantic vector search.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural language or keyword search query"},
                    "task_context": {"type": "string", "description": "What you are working on (helps ranking)."},
                    "goal": {"type": "string", "description": "What you want to find (helps ranking)."},
                    "limit": {"type": "number", "description": "Max processes to return (default: 5)", "default": 5},
                    "max_symbols": {"type": "number", "description": "Max symbols per process (default: 10)", "default": 10},
                    "include_content": {"type": "boolean", "description": "Include full symbol source code", "default": False},
                    "repo": {"type": "string", "description": "Repository name. Default: lapack."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "context",
            "description": "360-degree view of a single code symbol. Shows categorized incoming/outgoing references "
            "(calls, imports, extends), process participation, and file location. "
            "WHEN TO USE: After query_lapack to understand a specific symbol in depth. "
            "Handles disambiguation: if multiple symbols share the same name, returns candidates; use uid for zero-ambiguity lookup.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Symbol name (e.g. function or subroutine name)"},
                    "uid": {"type": "string", "description": "Direct symbol UID from prior tool results (zero-ambiguity)"},
                    "file_path": {"type": "string", "description": "File path to disambiguate common names"},
                    "include_content": {"type": "boolean", "description": "Include full symbol source code", "default": False},
                    "repo": {"type": "string", "description": "Repository name. Default: lapack."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cypher",
            "description": "Execute Cypher query against the code knowledge graph. "
            "WHEN TO USE: Complex structural queries. Schema: Nodes File, Folder, Function, Class, etc.; "
            "edges via CodeRelation with type CALLS, IMPORTS, STEP_IN_PROCESS, etc. "
            "Returns markdown table. Use context() on result symbols for deeper context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Cypher query to execute"},
                    "repo": {"type": "string", "description": "Repository name. Default: lapack."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "impact",
            "description": "Analyze the blast radius of changing a code symbol. Returns affected symbols by depth, "
            "risk assessment, affected execution flows and modules. Use when the user asks what would be affected "
            "if they change a routine, e.g. 'What would be affected if I change routine X?'",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Name of routine, function, or symbol to analyze"},
                    "direction": {"type": "string", "description": "upstream (what depends on this) or downstream (what this depends on)", "default": "upstream"},
                    "maxDepth": {"type": "number", "description": "Max relationship depth (default: 3)", "default": 3},
                    "repo": {"type": "string", "description": "Repository name. Default: lapack."},
                },
                "required": ["target", "direction"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "wiki",
            "description": "Generate repository documentation (wiki) from the knowledge graph. Use when the user asks "
            "for generated docs, module overview, or to document the codebase. Warning: may take 1–5 minutes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo": {"type": "string", "description": "Repository name. Default: lapack."},
                    "force": {"type": "boolean", "description": "Force full regeneration (default: false)", "default": False},
                },
            },
        },
    },
]

# Brief summaries for the tools panel (name, short description)
TOOL_SUMMARIES = [
    (
        "query_lapack",
        "Search the knowledge graph by concept or keyword. Returns execution flows (call chains) and related symbols with file locations. Use for “how does X work?” or “where is Y?”.",
    ),
    (
        "context",
        "360° view of one symbol: callers, callees, imports, and which execution flows it participates in. Use after a search to inspect a specific routine or file.",
    ),
    (
        "cypher",
        "Run a custom Cypher query on the code graph. For advanced structural questions (e.g. all callers of symbols in a module).",
    ),
    (
        "impact",
        "Blast radius: what would be affected by changing a routine? Shows dependents by depth and risk. Use for “what breaks if I change X?”.",
    ),
    (
        "wiki",
        "Generate repo documentation from the graph (module overview, cross-references). Can take 1–5 minutes.",
    ),
]

SYSTEM_PROMPT = """You answer questions about the LAPACK (Linear Algebra PACKage) codebase using GitNexus code intelligence.

- Use the query_lapack tool for natural-language or keyword search (e.g. "matrix multiplication", "dgemm", "eigenvalue solver").
- Use the context tool to get a 360-degree view of a specific symbol (function, subroutine, file) — callers, callees, execution flows.
- Use the cypher tool only when you need a custom graph query.
- Use the impact tool when the user asks what would be affected by changing a routine (e.g. "What would break if I change X?").
- Use the wiki tool when the user asks for generated documentation or a module overview (note: takes 1–5 minutes).

When answering:
- Always cite file paths and line ranges for code you refer to (e.g. path:start-end or filename:line).
- When showing source code, use markdown code blocks with the fortran language tag: ```fortran ... ```.
- If the user asks for code or a snippet, use include_content: true when calling query_lapack or context so you can show the actual code in a ```fortran block.

The default repository is "lapack". Be concise; cite file paths and symbol names when relevant."""


def run_tool(name: str, arguments: dict) -> str:
    """Dispatch tool call to backend; return string for the model."""
    args = arguments.copy()
    repo = args.pop("repo", None) or DEFAULT_REPO

    if name == "query_lapack":
        out = call_query(
            query=args.get("query", ""),
            repo=repo,
            limit=args.get("limit", 5),
            max_symbols=args.get("max_symbols", 10),
            include_content=args.get("include_content", False),
            task_context=args.get("task_context"),
            goal=args.get("goal"),
        )
    elif name == "context":
        out = call_context(
            name=args.get("name"),
            uid=args.get("uid"),
            repo=repo,
            file_path=args.get("file_path"),
            include_content=args.get("include_content", False),
        )
    elif name == "cypher":
        out = call_cypher(query=args.get("query", ""), repo=repo)
    elif name == "impact":
        out = call_impact(
            target=args.get("target", ""),
            direction=args.get("direction", "upstream"),
            repo=repo,
            max_depth=args.get("maxDepth", 3),
            relation_types=args.get("relationTypes"),
            include_tests=args.get("includeTests", False),
            min_confidence=args.get("minConfidence"),
        )
    elif name == "wiki":
        out = call_wiki(repo=repo, force=args.get("force", False))
    else:
        return f"Unknown tool: {name}"

    if isinstance(out, str):
        return out
    return json.dumps(out, indent=2)


def chat_round(messages: list[dict], client: OpenAI) -> tuple[list[dict], str | None]:
    """
    One round: call Chat Completions with tools; if tool_calls, execute and recurse.
    Returns (updated messages, final assistant text or None if error).
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
    )
    choice = response.choices[0]
    msg = choice.message

    if msg.content and not (msg.tool_calls and len(msg.tool_calls) > 0):
        return messages + [{"role": "assistant", "content": msg.content}], msg.content

    if not msg.tool_calls:
        return messages + [{"role": "assistant", "content": msg.content or ""}], msg.content or ""

    # Append assistant message with tool_calls
    new_messages = messages + [
        {
            "role": "assistant",
            "content": msg.content or None,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        }
    ]

    for tc in msg.tool_calls:
        try:
            args = json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments
        except json.JSONDecodeError:
            args = {}
        result = run_tool(tc.function.name, args)
        new_messages.append(
            {
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            }
        )

    return chat_round(new_messages, client)


def main():
    st.set_page_config(page_title="Lapack Lens", page_icon="🔬", layout="centered")
    st.title("Lapack Lens")
    st.caption(
        "Ask questions about the [LAPACK](https://www.netlib.org/lapack/) codebase. "
        "Powered by [GitNexus](https://github.com/gerwaric/GitNexus) + OpenAI."
    )

    # Collapsible side panel: tools available to the chat agent
    with st.sidebar:
        st.subheader("Chat tools")
        st.caption("These are the tools the chat assistant can use to answer your questions.")
        for name, summary in TOOL_SUMMARIES:
            with st.expander(name, expanded=False):
                st.caption(summary)

        st.subheader("References")
        st.markdown(
            """
            - <a href="https://fortran-lang.org/" target="_blank" rel="noopener noreferrer">Fortran ↗</a>
            - <a href="https://www.netlib.org/lapack/" target="_blank" rel="noopener noreferrer">LAPACK home ↗</a>
            - <a href="https://www.netlib.org/lapack/explore-html/" target="_blank" rel="noopener noreferrer">LAPACK documentation browser ↗</a>
            - <a href="https://www.hpc.lsu.edu/training/weekly-materials/Past%20Tutorials/Intro-LAPACK-0309.pdf" target="_blank" rel="noopener noreferrer">Introduction to LAPACK ↗</a>
            - <a href="https://github.com/gerwaric/GitNexus" target="_blank" rel="noopener noreferrer">GitNexus (Fortran fork) ↗</a>
            """,
            unsafe_allow_html=True,
        )

    if not OPENAI_API_KEY:
        st.error("OPENAI_API_KEY is not set. Set it in your environment or in a .env file.")
        st.stop()

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask about LAPACK (e.g. Where is matrix multiplication implemented?)"):
        st.session_state.messages.append({"role": "user", "content": prompt})

        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.status("Thinking…", expanded=False) as status:
                try:
                    client = OpenAI(api_key=OPENAI_API_KEY)
                    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + [
                        {"role": m["role"], "content": m["content"]} for m in st.session_state.messages
                    ]
                    updated, final = chat_round(messages, client)
                    if final:
                        st.session_state.messages.append({"role": "assistant", "content": final})
                        status.update(label="Done", state="complete")
                except Exception as e:
                    status.update(label="Error", state="error")
                    st.exception(e)
                    st.stop()

        # Rerun to show the new assistant message in the list
        st.rerun()


if __name__ == "__main__":
    main()
