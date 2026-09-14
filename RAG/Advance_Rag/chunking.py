"""Row -> document -> chunk.

Tabular RAG differs from PDF RAG in one way that matters: the row boundary is
already a meaningful semantic boundary. A test case is a complete thought. So the
rule here is "one row is one chunk unless it is too long", not "slice the corpus
into equal windows and hope".
"""

from __future__ import annotations

from config import CHUNK_OVERLAP, CHUNK_SIZE


def build_document(row: dict, text_cols: list[str]) -> str:
    """Assemble the embedded text for one row.

    The column name is kept as a label. Dropping it would flatten
    "Expected Result: HTTP 403 is returned" into bare text, and a question like
    "which tests expect a 403?" then has nothing to match the word "expected"
    against — the label is part of what makes the sparse leg work.
    """
    parts = []
    for col in text_cols:
        val = row.get(col)
        if val is None:
            continue
        text = str(val).strip()
        if not text or text.lower() == "nan":
            continue
        parts.append(f"{col}: {text}")
    return "\n".join(parts)


def split_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split on paragraph, then line, then hard character boundary.

    Overlap repeats the tail of each chunk at the head of the next so a sentence
    straddling the boundary survives in at least one chunk intact.
    """
    text = text.strip()
    if len(text) <= size:
        return [text] if text else []

    if overlap >= size:
        raise ValueError(f"CHUNK_OVERLAP ({overlap}) must be smaller than CHUNK_SIZE ({size})")

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + size
        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Prefer the latest natural break inside the window. Searching from
        # `start` (not from `end - 200`) means a window with a single break near
        # its beginning still splits there rather than mid-word.
        window = text[start:end]
        for sep in ("\n\n", "\n", ". ", " "):
            cut = window.rfind(sep)
            if cut > size // 2:  # refuse a break that would leave a tiny chunk
                end = start + cut + len(sep)
                break

        chunks.append(text[start:end].strip())
        start = max(end - overlap, start + 1)  # +1 guards against a zero-advance loop

    return [c for c in chunks if c]


def chunk_rows(rows: list[dict], text_cols: list[str], meta_cols: list[str]) -> list[dict]:
    """Turn rows into chunk records carrying their source row and payload."""
    out: list[dict] = []
    for row_idx, row in enumerate(rows):
        doc = build_document(row, text_cols)
        if not doc:
            continue
        pieces = split_text(doc)
        for part_idx, piece in enumerate(pieces):
            payload = {c: _clean(row.get(c)) for c in meta_cols}
            payload.update(
                {
                    "text": piece,
                    "row_index": row_idx,
                    "chunk_index": part_idx,
                    "chunk_count": len(pieces),
                    "char_len": len(piece),
                }
            )
            out.append(payload)
    return out


def _clean(val) -> str:
    """Payload values as strings.

    Qdrant filters compare exact values, and a column read as int64 by pandas in
    one file and as str in another would silently stop matching. Normalising to
    str at write time keeps the filter behaviour stable.
    """
    if val is None:
        return ""
    s = str(val).strip()
    return "" if s.lower() == "nan" else s


def stats(chunks: list[dict]) -> dict:
    """Chunk-length summary plus a histogram, for the ingest UI card."""
    if not chunks:
        return {"total": 0, "avg": 0, "min": 0, "max": 0, "histogram": []}

    lengths = sorted(c["char_len"] for c in chunks)
    lo, hi = lengths[0], lengths[-1]

    bins = 12
    width = max((hi - lo) // bins, 1)
    counts = [0] * bins
    for n in lengths:
        idx = min((n - lo) // width, bins - 1)
        counts[idx] += 1

    return {
        "total": len(chunks),
        "avg": round(sum(lengths) / len(lengths), 1),
        "min": lo,
        "max": hi,
        "histogram": [
            {"from": lo + i * width, "to": lo + (i + 1) * width, "count": c}
            for i, c in enumerate(counts)
        ],
    }
