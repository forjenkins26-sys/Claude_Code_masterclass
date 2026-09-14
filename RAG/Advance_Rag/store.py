"""Qdrant access: one collection carrying both a dense and a sparse vector.

Why a single collection with two named vectors rather than two collections: a
point then has one id, one payload and one lifecycle. Dense and sparse hits can
be fused by id without a join, and a filter written once applies to both legs.
"""

from __future__ import annotations

import shutil
import threading
import uuid
from pathlib import Path

from qdrant_client import QdrantClient, models

from config import COLLECTION, DENSE_DIM, QDRANT_PATH, QDRANT_URL

DENSE_VECTOR = "dense"
SPARSE_VECTOR = "sparse"

_client: QdrantClient | None = None
_lock = threading.Lock()


def client() -> QdrantClient:
    """The Qdrant handle.

    Embedded mode holds an exclusive lock on the data folder, so exactly one
    client may exist per process — hence the singleton rather than a new client
    per request.
    """
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _client = (
                    QdrantClient(url=QDRANT_URL)
                    if QDRANT_URL
                    else QdrantClient(path=QDRANT_PATH)
                )
    return _client


def ensure_collection(recreate: bool = False) -> None:
    c = client()
    exists = c.collection_exists(COLLECTION)

    # A collection's vector width is fixed at creation. Switching EMBED_BACKEND
    # changes it (bge-m3 is 1024-dim, the fast backend 384), so a collection
    # built by the other backend has to be rebuilt rather than appended to —
    # otherwise every upsert fails with a dimension error mid-run.
    if exists and not recreate:
        try:
            current = c.get_collection(COLLECTION).config.params.vectors[DENSE_VECTOR].size
        except Exception:
            current = None
        if current is not None and current != DENSE_DIM:
            raise ValueError(
                f"Collection '{COLLECTION}' holds {current}-dim vectors but the "
                f"current embedder produces {DENSE_DIM}-dim. Tick 'Recreate "
                f"collection' to rebuild it."
            )
        return
    if exists and recreate:
        # delete_collection() does not empty an embedded collection: the points
        # survive a delete + create in the same process AND across a reopen
        # (verified — a 5-point collection still reported 5 afterwards). That is
        # why re-ingesting kept ADDING to the collection instead of replacing it,
        # and why vectors from a previous embedder stayed behind to trigger
        # dimension errors. Clearing the points explicitly does work.
        current = c.get_collection(COLLECTION).config.params.vectors[DENSE_VECTOR].size
        if current == DENSE_DIM:
            c.delete(
                collection_name=COLLECTION,
                points_selector=models.FilterSelector(filter=models.Filter(must=[])),
                wait=True,
            )
            return
        # A width change cannot be fixed by clearing points — the collection
        # itself has to go, and with it the stale on-disk store.
        c.delete_collection(COLLECTION)
        shutil.rmtree(Path(QDRANT_PATH) / "collection" / COLLECTION, ignore_errors=True)

    c.create_collection(
        collection_name=COLLECTION,
        vectors_config={
            DENSE_VECTOR: models.VectorParams(
                size=DENSE_DIM, distance=models.Distance.COSINE
            )
        },
        sparse_vectors_config={
            SPARSE_VECTOR: models.SparseVectorParams(
                index=models.SparseIndexParams(on_disk=False)
            )
        },
    )

    # Payload indexes on the fields the UI filters by.
    #
    # These are a NO-OP in embedded mode — local Qdrant filters by scanning the
    # payload, and the client logs a warning saying so. They are declared anyway
    # because the same code runs against a real server when QDRANT_URL is set,
    # and there the index is what keeps a filter over 5,000 points instant. At
    # this corpus size the embedded scan is not noticeable either way.
    if not QDRANT_URL:
        return

    for field in ("Module", "Feature", "Priority", "Test Type", "Issue Key", "Browser", "Device"):
        try:
            c.create_payload_index(
                collection_name=COLLECTION,
                field_name=filter_key(field),
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        except Exception:
            # A field absent from the uploaded file is not an error — the user
            # chose which columns become metadata, and indexing is best-effort.
            pass


def upsert(chunks: list[dict], dense, sparse) -> None:
    """Write a batch of chunks with both vectors attached."""
    points = []
    for chunk, dvec, svec in zip(chunks, dense, sparse):
        # Spaced column names cannot be used as filter keys (see filter_key), so
        # a filterable alias is written beside the original. The original is kept
        # because it is what the chunk viewer displays and what the LLM reads.
        payload = dict(chunk)
        for key in list(payload):
            if " " in key:
                payload.setdefault(key.replace(" ", "_"), payload[key])

        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector={
                    DENSE_VECTOR: [float(x) for x in dvec],
                    SPARSE_VECTOR: models.SparseVector(
                        indices=[int(k) for k in svec.keys()],
                        values=[float(v) for v in svec.values()],
                    ),
                },
                payload=payload,
            )
        )
    client().upsert(collection_name=COLLECTION, points=points, wait=True)


def filter_key(field: str) -> str:
    """The key a filter must address for a given payload field.

    Qdrant parses a filter key as a path expression, and a space is not legal in
    one: filtering on the column "Test Type" raises `ValueError: Invalid path`
    while "Module" works. Since the uploaded file decides the column names, and
    Jira exports are full of two-word headers, every spaced field is ALSO stored
    under an underscored alias (see `upsert`) and filters address that.
    """
    return field.replace(" ", "_") if " " in field else field


def _filter(filters: dict | None) -> models.Filter | None:
    """Build an AND filter from {field: value}, ignoring blanks."""
    if not filters:
        return None
    conditions = [
        models.FieldCondition(key=filter_key(k), match=models.MatchValue(value=v))
        for k, v in filters.items()
        if v not in (None, "", "all")
    ]
    return models.Filter(must=conditions) if conditions else None


def search_dense(vector: list[float], limit: int, filters: dict | None = None) -> list[dict]:
    res = client().query_points(
        collection_name=COLLECTION,
        query=vector,
        using=DENSE_VECTOR,
        limit=limit,
        query_filter=_filter(filters),
        with_payload=True,
    )
    return [{"id": p.id, "score": p.score, "payload": p.payload} for p in res.points]


def search_sparse(sparse: dict[int, float], limit: int, filters: dict | None = None) -> list[dict]:
    if not sparse:
        return []
    res = client().query_points(
        collection_name=COLLECTION,
        query=models.SparseVector(
            indices=list(sparse.keys()), values=list(sparse.values())
        ),
        using=SPARSE_VECTOR,
        limit=limit,
        query_filter=_filter(filters),
        with_payload=True,
    )
    return [{"id": p.id, "score": p.score, "payload": p.payload} for p in res.points]


def browse(offset=None, limit: int = 50, filters: dict | None = None, contains: str = ""):
    """Page through the collection for the chunk viewer.

    Qdrant has no substring operator, so `contains` is applied in Python after
    the scroll. That is honest for a teaching demo over 5,000 rows; at corpus
    scale it would need a full-text payload index instead.
    """
    c = client()
    points, next_offset = c.scroll(
        collection_name=COLLECTION,
        limit=limit,
        offset=offset,
        scroll_filter=_filter(filters),
        with_payload=True,
        with_vectors=False,
    )
    rows = [{"id": p.id, "payload": p.payload} for p in points]
    if contains:
        needle = contains.lower()
        rows = [r for r in rows if needle in (r["payload"].get("text") or "").lower()]
    return rows, next_offset


def facet_values(field: str, cap: int = 2000) -> list[str]:
    """Distinct values of a payload field, for the filter dropdowns.

    Read from a bounded scroll rather than the whole collection: the dropdown
    only needs the values a user would plausibly pick, and scanning 5,000
    payloads on every page load is wasted work.
    """
    try:
        points, _ = client().scroll(
            collection_name=COLLECTION, limit=cap, with_payload=True, with_vectors=False
        )
    except Exception:
        return []
    vals = {str(p.payload.get(field, "")).strip() for p in points}
    return sorted(v for v in vals if v)


def info() -> dict:
    c = client()
    if not c.collection_exists(COLLECTION):
        return {"exists": False, "points": 0, "collection": COLLECTION}
    ci = c.get_collection(COLLECTION)
    return {
        "exists": True,
        "collection": COLLECTION,
        "points": ci.points_count or 0,
        "status": str(ci.status),
        "mode": f"server {QDRANT_URL}" if QDRANT_URL else "embedded",
        "dense_dim": DENSE_DIM,
    }
