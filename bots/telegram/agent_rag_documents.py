"""
Agente RAG sobre documentos locales (Telegram).

Indexa todos los .txt y .md de `data/rag_docs/` con TF-IDF en memoria,
busca los pasajes mas relevantes a la pregunta del usuario y los pasa
como contexto a OpenAI para que responda.

No requiere bases vectoriales externas (chromadb, pinecone, etc.). Usa
solo Python estandar + openai.

Uso:
    1. Pon tus .txt y .md en data/rag_docs/
    2. python bots/telegram/agent_rag_documents.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
    OPENAI_API_KEY
"""

import math
import re
import sys
from collections import Counter
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from openai import OpenAI
from telegram import Update
from telegram.ext import (
    Application,
    MessageHandler,
    filters,
    ContextTypes,
)

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
MODEL = get_env("OPENAI_MODEL", "gpt-4o-mini")

DOCS_DIR = Path("data/rag_docs")
DOCS_DIR.mkdir(parents=True, exist_ok=True)

# MODIFICAR: tamano del chunk (palabras) y solapamiento.
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

    # IDF
    df: Counter = Counter()
    for c in chunks:
        for t in set(c["tokens"]):
            df[t] += 1
    n = max(len(chunks), 1)
    idf = {t: math.log((n + 1) / (cnt + 1)) + 1 for t, cnt in df.items()}
    return chunks, idf


def score(chunk: dict, query_tokens: list[str], idf: dict) -> float:
    cnt = Counter(chunk["tokens"])
    total = max(len(chunk["tokens"]), 1)
    s = 0.0
    for t in query_tokens:
        if t in cnt:
            tf = cnt[t] / total
            s += tf * idf.get(t, 0.0)
    return s


def search(query: str, chunks: list[dict], idf: dict) -> list[dict]:
    qt = tokenize(query)
    scored = [(score(c, qt, idf), c) for c in chunks]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for s, c in scored[:TOP_K] if s > 0]


# Indice cargado al inicio. MODIFICAR: rebuild si cambias docs en caliente.
CHUNKS, IDF = build_index()
logger.info("Indice RAG: %d chunks de %s", len(CHUNKS), DOCS_DIR)


async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.message.text
    if not CHUNKS:
        await update.message.reply_text(
            f"No hay documentos en {DOCS_DIR}. Agrega .txt o .md ahi."
        )
        return

    hits = search(query, CHUNKS, IDF)
    if not hits:
        await update.message.reply_text("No encontre nada relevante en mis documentos.")
        return

    context_text = "\n\n".join(
        f"[{i+1}] ({h['source']})\n{h['text']}" for i, h in enumerate(hits)
    )
    messages = [
        {"role": "system", "content": (
            "Responde la pregunta usando SOLO la informacion del contexto. "
            "Si la respuesta no esta, dilo. Cita las fuentes con [1], [2], etc. "
            "Responde en espanol."
        )},
        {"role": "user", "content": f"Pregunta: {query}\n\nContexto:\n{context_text}"},
    ]

    try:
        completion = client.chat.completions.create(
            model=MODEL, messages=messages, temperature=0.2
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error OpenAI: %s", e)
        await update.message.reply_text("El modelo fallo. Reintenta.")
        return

    sources = "\n".join(f"[{i+1}] {h['source']}" for i, h in enumerate(hits))
    await update.message.reply_text(f"{reply}\n\nFuentes:\n{sources}")


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    app = Application.builder().token(token).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))
    logger.info("Agente RAG iniciado. %d chunks indexados.", len(CHUNKS))
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
