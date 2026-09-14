"""Hybrid retrieval: dense + sparse -> RRF -> cross-encoder rerank.

Every stage returns its own intermediate list rather than only the final answer,
because the point of the demo is watching the list change shape at each step.
"""

from __future__ import annotations

import models as M
import store
from config import RRF_K, TOP_K_RERANK, TOP_N_HYBRID


def reciprocal_rank_fusion(runs: list[list[dict]], k: int = RRF_K) -> list[dict]:
    """Fuse ranked lists by rank position, not by score.

    Dense cosine similarity and sparse lexical scores live on different scales —
    a 0.82 from one leg and a 14.7 from the other cannot be added or averaged
    meaningfully. RRF throws the magnitudes away and keeps only the ordering,
    which is why it needs no normalisation and no tuned per-leg weight.

    score(d) = sum over runs of 1 / (k + rank(d))

    k dampens the top of each list: at k=60 the gap between rank 1 and rank 2 is
    small, so a document ranked 2nd by both legs beats one ranked 1st by a single
    leg and missing from the other. That is the behaviour we want from a fusion.
    """
    fused: dict[str, dict] = {}
    for run_idx, run in enumerate(runs):
        for rank, hit in enumerate(run, start=1):
            key = str(hit["id"])
            entry = fused.setdefault(
                key,
                {
                    "id": hit["id"],
                    "payload": hit["payload"],
                    "rrf_score": 0.0,
                    "ranks": {},
                },
            )
            entry["rrf_score"] += 1.0 / (k + rank)
            entry["ranks"][f"run{run_idx}"] = rank

    return sorted(fused.values(), key=lambda e: e["rrf_score"], reverse=True)


def hybrid_search(
    query: str,
    queries: list[str] | None = None,
    top_n: int = TOP_N_HYBRID,
    filters: dict | None = None,
) -> dict:
    """Run every query variant down both legs and fuse the lot.

    `queries` carries the rewrites. Each variant contributes its own dense run
    and its own sparse run, so a document found by any phrasing enters the fusion
    — that is the whole reason to rewrite the query before searching.
    """
    variants = queries or [query]

    dense_runs: list[list[dict]] = []
    sparse_runs: list[list[dict]] = []

    for variant in variants:
        enc = M.encode_one(variant)
        dense_runs.append(store.search_dense(enc["dense"], top_n, filters))
        sparse_runs.append(store.search_sparse(enc["sparse"], top_n, filters))

    fused = reciprocal_rank_fusion(dense_runs + sparse_runs)

    return {
        "dense": dense_runs[0],       # the original query's dense leg, for display
        "sparse": sparse_runs[0],     # the original query's sparse leg, for display
        "dense_runs": len(dense_runs),
        "sparse_runs": len(sparse_runs),
        "fused": fused,
    }


def rerank_hits(query: str, hits: list[dict], top_k: int = TOP_K_RERANK) -> dict:
    """Reorder fused candidates with the cross-encoder and cut to top_k.

    The reranker sees the ORIGINAL question, never a rewrite: the rewrites exist
    to widen recall, and judging relevance against a paraphrase would optimise
    for the paraphrase instead of what the user asked.
    """
    if not hits:
        return {"before": [], "after": [], "final": []}

    candidates = hits[: max(top_k * 5, 20)]
    passages = [h["payload"].get("text", "") for h in candidates]
    scores = M.rerank(query, passages)

    scored = []
    for pos, (hit, score) in enumerate(zip(candidates, scores), start=1):
        scored.append({**hit, "rerank_score": score, "rank_before": pos})

    after = sorted(scored, key=lambda h: h["rerank_score"], reverse=True)
    for pos, hit in enumerate(after, start=1):
        hit["rank_after"] = pos

    return {"before": scored, "after": after, "final": after[:top_k]}


def retrieve(
    query: str,
    queries: list[str] | None = None,
    top_n: int = TOP_N_HYBRID,
    top_k: int = TOP_K_RERANK,
    filters: dict | None = None,
) -> dict:
    """The full retrieval half of the pipeline, with every stage retained."""
    hybrid = hybrid_search(query, queries, top_n, filters)
    reranked = rerank_hits(query, hybrid["fused"], top_k)
    return {**hybrid, "rerank": reranked, "final": reranked["final"]}
