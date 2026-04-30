#!/usr/bin/env python3
"""
agent_rag_documents.py — Agente RAG: indexa PDF/TXT y responde preguntas
MODIFICAR: ajustar CHUNK_SIZE y MAX_CHUNKS para balancear calidad/costo.
pip install openai python-telegram-bot PyPDF2
Requiere: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY
"""
import logging, os, io
from openai import AsyncOpenAI
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
CHUNK_SIZE = 2000   # MODIFICAR: tamaño de chunk en caracteres
MAX_CHUNKS = 5      # MODIFICAR: chunks a enviar al modelo por consulta
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None
user_docs: dict[int, list[str]] = {}

def chunk_text(text: str) -> list[str]:
    return [text[i:i + CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE - 200)]

def extract_pdf(data: bytes) -> str:
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ImportError:
        return "[PyPDF2 no instalado — pip install PyPDF2]"

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F4DA Agente RAG\n\n"
        "1. Enviame un PDF o TXT\n2. Preguntá con /ask <pregunta>\n/clear — Borrar docs"
    )

async def handle_document(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    doc = update.message.document
    uid = update.effective_user.id
    if doc.mime_type not in ("application/pdf", "text/plain"):
        await update.message.reply_text("Solo acepto PDF o TXT.")
        return
    await update.message.reply_text("\U000023F3 Procesando...")
    file      = await ctx.bot.get_file(doc.file_id)
    file_data = await file.download_as_bytearray()
    text      = extract_pdf(bytes(file_data)) if doc.mime_type == "application/pdf" else file_data.decode("utf-8", errors="replace")
    chunks    = chunk_text(text)
    user_docs[uid] = chunks
    await update.message.reply_text(f"\U0001F4DA Indexado: {doc.file_name}\n{len(chunks)} chunks. Usá /ask <pregunta>")

async def ask(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not client:
        await update.message.reply_text("OPENAI_API_KEY no configurada.")
        return
    if not ctx.args:
        await update.message.reply_text("Uso: /ask tu pregunta")
        return
    uid      = update.effective_user.id
    question = " ".join(ctx.args)
    chunks   = user_docs.get(uid, [])
    if not chunks:
        await update.message.reply_text("No hay documentos cargados.")
        return
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
    # MODIFICAR: implementar búsqueda semántica con embeddings para mejor precisión
    context = "\n---\n".join(chunks[:MAX_CHUNKS])
    prompt  = f"Contexto:\n{context}\n\nPregunta: {question}\nSi no está en el contexto, decilo."
    try:
        resp = await client.chat.completions.create(model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}], max_tokens=800)
        await update.message.reply_text(f"\U0001F4AC Respuesta:\n\n{resp.choices[0].message.content}")
    except Exception as e:
        await update.message.reply_text(f"\U0000274C Error: {e}")

async def clear(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    user_docs.pop(update.effective_user.id, None)
    await update.message.reply_text("\U0001F5D1 Documentos borrados.")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    if not OPENAI_KEY:
        raise ValueError("OPENAI_API_KEY no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ask", ask))
    app.add_handler(CommandHandler("clear", clear))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.run_polling()

if __name__ == "__main__":
    main()
