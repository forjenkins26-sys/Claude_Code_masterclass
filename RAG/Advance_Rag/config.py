"""Tunables for the Advanced RAG Explorer.

Every knob the teaching material refers to lives here, so a workshop can change
one value and re-run without hunting through the pipeline code.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

# ---------------------------------------------------------------- chunking
# A test case is a short, self-contained document, so the goal is one row = one
# chunk: splitting a test case mid-steps produces a chunk whose expected result
# is missing, and the LLM then answers from half a test.
#
# 1400 is measured, not guessed. Over the bundled 5,000-row corpus the assembled
# document (Summary + Description + Test Steps + Expected Result) runs 874 chars
# at the shortest, 1038 at the median and 1239 at the longest, so 1400 keeps
# 100% of rows whole. Drop it to 1000 to watch 77% of rows split in two and see
# what a mid-document boundary does to retrieval — that contrast is worth
# demonstrating in a workshop.
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1400))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))

# ---------------------------------------------------------------- retrieval
TOP_N_HYBRID = int(os.getenv("TOP_N_HYBRID", 20))  # candidates per dense/sparse leg
TOP_K_RERANK = int(os.getenv("TOP_K_RERANK", 4))   # chunks that reach the LLM
RRF_K = int(os.getenv("RRF_K", 60))                # Reciprocal Rank Fusion constant
REWRITE_ENABLED = os.getenv("REWRITE_ENABLED", "1") not in ("0", "false", "False")
REWRITE_COUNT = int(os.getenv("REWRITE_COUNT", 3))

# ---------------------------------------------------------------- models
# Two embedding backends, both local and free. The default is picked for a
# machine without a GPU, which is what this demo actually runs on.
#
# "fast"  — fastembed (ONNX): bge-small-en-v1.5 dense + Qdrant/bm25 sparse.
# "bge-m3" — FlagEmbedding (PyTorch): one model emitting dense + sparse.
#
# Measured on this workstation (8-core CPU, torch 2.14.0+cpu, no CUDA), over
# documents from the bundled 5,000-row corpus:
#
#   bge-m3      3.59 s/doc  ->  5,000 rows in ~299 min
#   fast        0.15 s/doc  ->  5,000 rows in ~13 min      (23x faster)
#
# bge-m3 is the better model and the more interesting one to teach — one
# vocabulary, one forward pass, genuine learned sparse weights. It is simply
# not usable on CPU at this corpus size, so it is kept behind a switch rather
# than removed: EMBED_BACKEND=bge-m3 restores it.
EMBED_BACKEND = os.getenv("EMBED_BACKEND", "fast").strip().lower()

FAST_DENSE_MODEL = os.getenv("FAST_DENSE_MODEL", "BAAI/bge-small-en-v1.5")
FAST_SPARSE_MODEL = os.getenv("FAST_SPARSE_MODEL", "Qdrant/bm25")

EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-m3")

# Re-ranking follows the same split as embedding. bge-reranker-v2-m3 is a 568M
# cross-encoder; ms-marco-MiniLM-L-6-v2 is 22M and runs through ONNX.
#
# Measured on 31 candidates from the bundled corpus:
#   bge-reranker-v2-m3   42.7 s   (per chat query)
#   MiniLM-L-6-v2         1.9 s   (22x faster, same top-2 documents)
RERANK_BACKEND = os.getenv("RERANK_BACKEND", "fast").strip().lower()
FAST_RERANK_MODEL = os.getenv("FAST_RERANK_MODEL", "Xenova/ms-marco-MiniLM-L-6-v2")
RERANK_MODEL = os.getenv("RERANK_MODEL", "BAAI/bge-reranker-v2-m3")

# fp16 is a GPU optimisation. On CPU there is no fast half-precision path, so
# torch emulates it and the model runs slower than in fp32 — measured, not
# assumed. Left configurable for anyone running this on a GPU.
BGE_USE_FP16 = os.getenv("BGE_USE_FP16", "0") not in ("0", "false", "False")

# Embedding batch size, and the single most important number for memory: one
# ONNX inference over 32 documents allocates a working arena that took RSS from
# 295 MB to 587 MB in a single step (measured), which OOM-kills a 512 MB
# instance before anything is indexed. Batch 4 peaks at 363 MB.
#
# The default is therefore chosen from the environment rather than fixed at 32:
# a hosted instance gets the safe value even if INGEST_BATCH never arrives,
# because the failure mode there is a crash loop, not a slow run.
INGEST_BATCH = int(os.getenv("INGEST_BATCH") or (4 if os.getenv("RENDER") else 32))

# Torch defaults to half the physical cores. Using all of them measured 20%
# faster on bge-m3 (373 min -> 299 min) and costs nothing on the fast path.
TORCH_THREADS = int(os.getenv("TORCH_THREADS", os.cpu_count() or 4))

# Re-ranking is a cross-encoder: it re-reads every candidate against the query,
# so its cost is per-query, not per-corpus. On CPU that is seconds per chat
# turn. Disable to serve the RRF-fused order straight to the LLM.
RERANK_ENABLED = os.getenv("RERANK_ENABLED", "1") not in ("0", "false", "False")

# Dense output width. Must match the backend, because the Qdrant collection is
# created before the first vector exists and its size cannot change afterwards.
DENSE_DIM = 384 if EMBED_BACKEND == "fast" else 1024

# ---------------------------------------------------------------- vector db
# Embedded by default: qdrant-client writes to a local folder, so the demo runs
# with no Docker and no server. Set QDRANT_URL to point at a real server.
QDRANT_URL = os.getenv("QDRANT_URL", "").strip()
QDRANT_PATH = str(ROOT / "qdrant_data")
COLLECTION = os.getenv("COLLECTION", "vwo_test_cases")

# ---------------------------------------------------------------- llm
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
# llama-3.3-70b-versatile was decommissioned by Groq and now returns 404
# model_not_found, which surfaced as a 500 on /api/chat. Verified working on
# this key: openai/gpt-oss-120b, openai/gpt-oss-20b, groq/compound.
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_TEMPERATURE = float(os.getenv("GROQ_TEMPERATURE", 0.3))

# ---------------------------------------------------------------- server
PORT = int(os.getenv("PORT", 5050))
HOST = os.getenv("HOST", "127.0.0.1")

UPLOAD_DIR = ROOT / "data"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", 64))
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


def summary() -> dict:
    """Config as shown in the UI. Never includes the API key."""
    return {
        "chunk_size": CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
        "top_n_hybrid": TOP_N_HYBRID,
        "top_k_rerank": TOP_K_RERANK,
        "rrf_k": RRF_K,
        "rewrite_enabled": REWRITE_ENABLED,
        "rewrite_count": REWRITE_COUNT,
        "embed_backend": EMBED_BACKEND,
        "embed_model": (
            f"{FAST_DENSE_MODEL} + {FAST_SPARSE_MODEL}"
            if EMBED_BACKEND == "fast"
            else EMBED_MODEL
        ),
        "rerank_model": (
            "disabled"
            if not RERANK_ENABLED
            else (FAST_RERANK_MODEL if RERANK_BACKEND == "fast" else RERANK_MODEL)
        ),
        "rerank_enabled": RERANK_ENABLED,
        "dense_dim": DENSE_DIM,
        "vector_db": f"Qdrant ({'server ' + QDRANT_URL if QDRANT_URL else 'embedded'})",
        "collection": COLLECTION,
        "llm_model": GROQ_MODEL,
        "llm_configured": bool(GROQ_API_KEY),
    }
