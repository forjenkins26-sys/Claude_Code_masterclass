"""Lazy loaders for the embedding and re-ranking models.

Both are hundreds of megabytes to a few gigabytes. Loading them at import time
would mean `python app.py` appears to hang before the port opens, so each loader
runs on first use and caches the instance.

A lock guards the load: Flask serves requests on threads, and two threads
entering the loader at once would each pull the model into memory.

Two embedding backends sit behind one `encode()` contract, chosen by
EMBED_BACKEND. Both produce a dense vector plus a {token_id: weight} sparse map,
so nothing downstream — store, retrieval, the UI — knows which one ran.
"""

from __future__ import annotations

import threading

from config import (
    BGE_USE_FP16,
    EMBED_BACKEND,
    EMBED_MODEL,
    FAST_DENSE_MODEL,
    FAST_RERANK_MODEL,
    FAST_SPARSE_MODEL,
    RERANK_BACKEND,
    RERANK_ENABLED,
    RERANK_MODEL,
    TORCH_THREADS,
)

# Torch is imported only to raise the CPU thread count for the bge backends, and
# importing it costs ~165 MB of resident memory (measured: 341 MB without it,
# 504 MB with). The fast ONNX path does not need it at all, so on a small
# container — a 512 MB free tier is the common case — that import is the
# difference between fitting and being OOM-killed. Hence: optional, not
# top-level. A missing torch is only an error if a bge backend is selected.
if EMBED_BACKEND != "fast" or RERANK_BACKEND != "fast":
    import torch

    # Torch defaults to half the physical cores; the other half is free capacity.
    torch.set_num_threads(TORCH_THREADS)

_embed_model = None
_rerank_model = None
_fast_dense = None
_fast_sparse = None
_embed_lock = threading.Lock()
_rerank_lock = threading.Lock()


def embedder():
    """BGEM3FlagModel — returns dense and sparse vectors from one forward pass.

    This single-model property is why bge-m3 is the more elegant choice: one
    pass, one vocabulary, no second tokeniser to keep in sync. The fast backend
    trades that elegance for ~23x throughput on a CPU.
    """
    global _embed_model
    if _embed_model is None:
        with _embed_lock:
            if _embed_model is None:
                from FlagEmbedding import BGEM3FlagModel

                _embed_model = BGEM3FlagModel(EMBED_MODEL, use_fp16=BGE_USE_FP16)
    return _embed_model


def fast_models():
    """fastembed dense + sparse pair, loaded together and cached.

    ONNX Runtime rather than PyTorch: the same bge-small weights execute several
    times faster on CPU, and the sparse leg is BM25, which is term statistics
    rather than a neural forward pass — effectively free (0.05 s per 32 docs
    against 4.85 s for the dense leg).
    """
    global _fast_dense, _fast_sparse
    if _fast_dense is None:
        with _embed_lock:
            if _fast_dense is None:
                from fastembed import SparseTextEmbedding, TextEmbedding

                _fast_sparse = SparseTextEmbedding(FAST_SPARSE_MODEL)
                _fast_dense = TextEmbedding(FAST_DENSE_MODEL)
    return _fast_dense, _fast_sparse


def reranker():
    """A cross-encoder that scores (query, passage) jointly.

    A bi-encoder embeds the query and the passage separately, so it can only
    compare them through a dot product computed after the fact. The cross-encoder
    reads both together, which is why it reorders the candidate list usefully and
    also why it is too slow to run over 5,000 rows — it only sees the top-N.

    That per-query cost is the whole problem on CPU: the 568M bge reranker spends
    ~43 s on 31 candidates, which is longer than the rest of the chat turn put
    together. The MiniLM cross-encoder is 22M parameters over ONNX and returns
    the same leading documents in ~1.9 s.
    """
    global _rerank_model
    if _rerank_model is None:
        with _rerank_lock:
            if _rerank_model is None:
                if RERANK_BACKEND == "fast":
                    from fastembed.rerank.cross_encoder import TextCrossEncoder

                    _rerank_model = TextCrossEncoder(FAST_RERANK_MODEL)
                else:
                    from FlagEmbedding import FlagReranker

                    _rerank_model = FlagReranker(RERANK_MODEL, use_fp16=BGE_USE_FP16)
    return _rerank_model


def warm() -> None:
    """Load the configured embedder now rather than inside the first batch."""
    if EMBED_BACKEND == "fast":
        fast_models()
    else:
        embedder()


def loaded() -> dict:
    """Which models are warm. Drives the 'cold start' hint in the UI."""
    return {
        "embedder": _embed_model is not None or _fast_dense is not None,
        "reranker": _rerank_model is not None,
    }


def encode(texts: list[str], batch_size: int = 32) -> dict:
    """Encode texts into dense + sparse representations.

    Returns {"dense": [vector, ...], "sparse": [{token_id: weight}, ...]} from
    either backend, so callers never branch on which one is configured.
    """
    if EMBED_BACKEND == "fast":
        dense_model, sparse_model = fast_models()
        dense = list(dense_model.embed(texts, batch_size=batch_size))
        # fastembed returns indices/values arrays; the rest of the pipeline
        # speaks {token_id: weight}, which is also bge-m3's shape.
        sparse = [
            dict(zip((int(i) for i in s.indices), (float(v) for v in s.values)))
            for s in sparse_model.embed(texts, batch_size=batch_size)
        ]
        return {"dense": dense, "sparse": sparse}

    out = embedder().encode(
        texts,
        batch_size=batch_size,
        max_length=8192,
        return_dense=True,
        return_sparse=True,
        return_colbert_vecs=False,
    )
    return {"dense": out["dense_vecs"], "sparse": out["lexical_weights"]}


def encode_one(text: str) -> dict:
    """Encode a single query. Returns plain Python types, ready for Qdrant.

    BM25 scores a query differently from a document — a document gets term
    frequency saturation and length normalisation, a query does not — so the
    fast backend must use query_embed here. Calling embed() for a query would
    weight the query's own repeated terms as if it were a document.
    """
    if EMBED_BACKEND == "fast":
        dense_model, sparse_model = fast_models()
        dvec = next(iter(dense_model.query_embed(text)))
        svec = next(iter(sparse_model.query_embed(text)))
        return {
            "dense": [float(x) for x in dvec],
            "sparse": dict(
                zip((int(i) for i in svec.indices), (float(v) for v in svec.values))
            ),
        }

    out = encode([text], batch_size=1)
    sparse = {int(k): float(v) for k, v in out["sparse"][0].items()}
    return {"dense": [float(x) for x in out["dense"][0]], "sparse": sparse}


def rerank(query: str, passages: list[str]) -> list[float]:
    """Cross-encoder relevance scores, one per passage, in the input order.

    With re-ranking disabled every passage scores 0.0, which leaves the
    RRF-fused order untouched — a stable sort keeps equal scores in place.
    """
    if not passages:
        return []
    if not RERANK_ENABLED:
        return [0.0] * len(passages)

    if RERANK_BACKEND == "fast":
        # Raw logits, not 0-1 probabilities. Only the ordering is used, and the
        # UI prints the number beside each hit, so they are passed through
        # as-is rather than squashed into a false-looking confidence.
        return [float(s) for s in reranker().rerank(query, passages)]

    scores = reranker().compute_score([[query, p] for p in passages], normalize=True)
    # compute_score returns a bare float when given a single pair.
    return [float(scores)] if isinstance(scores, float) else [float(s) for s in scores]
