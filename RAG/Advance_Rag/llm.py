"""Groq calls: query rewriting, grounded answering, test-case generation."""

from __future__ import annotations

import json
import re

from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_TEMPERATURE, REWRITE_COUNT

_client: Groq | None = None


def client() -> Groq:
    global _client
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def _chat(system: str, user: str, temperature: float = GROQ_TEMPERATURE) -> str:
    res = client().chat.completions.create(
        model=GROQ_MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return res.choices[0].message.content or ""


def _strip_fences(text: str) -> str:
    """Remove a ```json fence if the model wrapped its JSON in one."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


REWRITE_SYSTEM = """You rewrite search queries for a QA test-case knowledge base.

Given a question, produce alternate phrasings that would retrieve the same test
cases through different vocabulary. Vary the wording, not the meaning:
- swap synonyms a tester might use (campaign/experiment, visitor/user)
- add the likely product-module name if the question omits it
- write one phrasing as keywords only, for the lexical search leg

Return ONLY a JSON array of strings. No prose, no code fence."""


def rewrite_query(question: str, count: int = REWRITE_COUNT) -> list[str]:
    """Alternate phrasings for the retrieval step.

    Failure here is non-fatal on purpose: a rewrite is an optimisation, and
    losing it should degrade recall rather than break the chat. The original
    question is always first in the returned list.
    """
    try:
        raw = _chat(
            REWRITE_SYSTEM,
            f"Question: {question}\n\nProduce exactly {count} alternate phrasings.",
            temperature=0.5,  # some spread is the point; 0.0 returns near-copies
        )
        parsed = json.loads(_strip_fences(raw))
        variants = [str(v).strip() for v in parsed if str(v).strip()]
    except Exception:
        variants = []

    out = [question]
    for v in variants:
        if v.lower() != question.lower() and v not in out:
            out.append(v)
    return out[: count + 1]


ANSWER_SYSTEM = """You answer questions about a QA test-case library using ONLY
the numbered context chunks provided.

Rules:
- Cite the chunks you used as [Chunk N] inline, where N is the number given.
- If the context does not contain the answer, say so plainly. Never fill the gap
  from your own knowledge of the product.
- When counting or listing, count only what is in the context, and say that the
  count covers the retrieved chunks rather than the whole library.
- Keep it tight. No preamble."""


GENERATE_SYSTEM = """You write a new QA test case, using the provided context
chunks as style and format templates.

Output exactly these sections as markdown:

**Title:** <one line>
**Module:** <module>
**Preconditions:**
- <one per line>
**Steps:**
1. <numbered>
**Expected Result:** <the assertion>
**Priority:** <P0 - Critical | P1 - High | P2 - Medium | P3 - Low>
**Labels:** <space separated>

Match the conventions visible in the context. Invent only what the request
requires; do not restate a retrieved test case as if it were new."""


GENERATE_PATTERNS = (
    r"\b(create|write|generate|draft|add|compose)\b.{0,40}\b(test case|test cases|tc)\b",
    r"\bnew test case\b",
    r"\btest case for\b.{0,30}\b(jira|vwo-\d+)\b",
)


def detect_mode(question: str) -> str:
    """'generate' when the user is asking for a new test case, else 'answer'.

    Matched on intent phrases rather than a keyword like "test case", which
    appears in almost every legitimate question about this corpus.
    """
    low = question.lower()
    for pattern in GENERATE_PATTERNS:
        if re.search(pattern, low):
            return "generate"
    return "answer"


def build_context(chunks: list[dict]) -> str:
    blocks = []
    for i, hit in enumerate(chunks, start=1):
        p = hit["payload"]
        meta = " | ".join(
            f"{k}={p[k]}"
            for k in ("Issue Key", "Module", "Feature", "Priority", "Test Type")
            if p.get(k)
        )
        blocks.append(f"[Chunk {i}]{(' ' + meta) if meta else ''}\n{p.get('text', '')}")
    return "\n\n".join(blocks)


def answer(question: str, chunks: list[dict], mode: str | None = None) -> dict:
    """Generate the grounded reply. Returns the text plus the exact prompt sent."""
    mode = mode or detect_mode(question)
    context = build_context(chunks)

    if not chunks:
        return {
            "mode": mode,
            "text": "Nothing was retrieved for that question, so there is no "
                    "grounded answer to give. Try different wording, or relax "
                    "the filters if any are applied.",
            "prompt": "",
            "chunks_used": 0,
        }

    system = GENERATE_SYSTEM if mode == "generate" else ANSWER_SYSTEM
    user = f"Context chunks:\n\n{context}\n\n---\n\nRequest: {question}"

    return {
        "mode": mode,
        "text": _chat(system, user),
        "prompt": f"[system]\n{system}\n\n[user]\n{user}",
        "chunks_used": len(chunks),
    }
