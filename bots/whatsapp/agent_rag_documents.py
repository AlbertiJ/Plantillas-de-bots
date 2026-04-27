"""
Agente RAG sobre documentos locales (WhatsApp + Twilio).

Equivalente WhatsApp del bot Telegram homonimo. TF-IDF puro Python
sobre `data/rag_docs/*.{txt,md}` + sintesis con OpenAI.

Uso:
    1. Pon tus .txt y .md en data/rag_docs/
    2. python bots/whatsapp/agent_rag_documents.py

Requisitos en .env:
    OPENAI_API_KEY
"""

import math
import re
import sys
from collections import Counter
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from flask import Flask, request
from openai import OpenAI
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
MODEL = get_env("OPENAI_MODEL", "gpt-4o-mini")

DOCS_DIR = Path("data/rag_docs")
DOCS_DIR.mkdir(parents=True, exist_ok=True)

# MODIFICAR: tamano y solape de chunks, top-k.
CHUNK_WORDS = 200
OVERLAP = 40
TOP_K = 4

_token_re = re.compile(r"[a-z0-9]+", re.IGNORECASE)


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _token_re.findall(text)]


def chunk_text(text: str, source: str) -> list[dict]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        piece = " ".join(words[i:i + CHUNK_WORDS])
        chunks.append({"source": source, "text": piece, "tokens": tokenize(piece)})
        i += CHUNK_WORDS - OVERLAP
    return chunks


def build_index() -> tuple[list[dict], dict]:
    chunks: list[dict] = []
    for path in sorted(DOCS_DIR.glob("**/*")):
        if path.suffix.lower() not in (".txt", ".md"):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        chunks.extend(chunk_text(text, str(path.relative_to(DOCS_DIR))))
    df: Counter = Counter()
    for c in chunks:
        for t in set(c["tokens"]):
            df[t] += 1
    n = max(len(chunks), 1)
    idf = {t: math.log((n + 1) / (cnt + 1)) + 1 for t, cnt in df.items()}
    return chunks, idf


def search(query: str, chunks: list[dict], idf: dict) -> list[dict]:
    qt = tokenize(query)
    scored = []
    for c in chunks:
        cnt = Counter(c["tokens"])
        total = max(len(c["tokens"]), 1)
        s = sum((cnt[t] / total) * idf.get(t, 0.0) for t in qt if t in cnt)
        scored.append((s, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for s, c in scored[:TOP_K] if s > 0]


CHUNKS, IDF = build_index()
logger.info("Indice RAG: %d chunks de %s", len(CHUNKS), DOCS_DIR)

app = Flask(__name__)


@app.route("/whatsapp", methods=["POST"])
def webhook():
    query = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()

    if not CHUNKS:
        msg.body(f"No hay documentos en {DOCS_DIR}.")
        return str(resp)

    hits = search(query, CHUNKS, IDF)
    if not hits:
        msg.body("No encontre nada relevante en mis documentos.")
        return str(resp)

    ctx = "\n\n".join(
        f"[{i+1}] ({h['source']})\n{h['text']}" for i, h in enumerate(hits)
    )
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": (
                    "Responde la pregunta usando SOLO el contexto. "
                    "Si no esta, dilo. Cita con [1], [2]. En espanol."
                )},
                {"role": "user", "content": f"Pregunta: {query}\n\nContexto:\n{ctx}"},
            ],
            temperature=0.2,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error OpenAI: %s", e)
        msg.body("El modelo fallo. Reintenta.")
        return str(resp)

    sources = "\n".join(f"[{i+1}] {h['source']}" for i, h in enumerate(hits))
    msg.body(f"{reply}\n\nFuentes:\n{sources}")
    return str(resp)


if __name__ == "__main__":
    logger.info("Agente RAG (WhatsApp) iniciado. %d chunks.", len(CHUNKS))
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
