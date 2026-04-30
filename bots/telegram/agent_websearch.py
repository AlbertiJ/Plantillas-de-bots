#!/usr/bin/env python3
"""
agent_websearch.py — Agente con búsqueda web (DuckDuckGo + OpenAI)
MODIFICAR: cambiar el motor de búsqueda por SerpAPI u otro si necesitás más resultados.
Requiere: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY
"""
import logging, os, json, urllib.parse, urllib.request
from openai import AsyncOpenAI
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL      = "gpt-4o-mini"
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None

def duckduckgo_search(query: str, max_results: int = 5) -> str:
    """MODIFICAR: usar SerpAPI u otro motor para más resultados."""
    try:
        url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1"
        with urllib.request.urlopen(url, timeout=8) as r:
            data = json.loads(r.read().decode())
        results = []
        if data.get("Abstract"):
            results.append(f"Resumen: {data['Abstract']}")
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(f"- {topic['Text'][:200]}")
        return "\n".join(results) if results else "Sin resultados en DuckDuckGo."
    except Exception as e:
        return f"Error de búsqueda: {e}"

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F50D Agente de Búsqueda Web\n\n/search <consulta>\nO enviame una pregunta directamente."
    )

async def search_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /search tu consulta aquí")
        return
    query   = " ".join(ctx.args)
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
    results = duckduckgo_search(query)
    await update.message.reply_text(f"\U0001F50D Resultados para: {query}\n\n{results}")

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not client:
        await update.message.reply_text("OPENAI_API_KEY no configurada.")
        return
    question = update.message.text
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
    results  = duckduckgo_search(question)
    prompt   = f"El usuario pregunta: {question}\n\nResultados web:\n{results}\n\nRespondé de forma concisa."
    try:
        resp = await client.chat.completions.create(model=MODEL,
            messages=[{"role": "user", "content": prompt}])
        await update.message.reply_text(resp.choices[0].message.content)
    except Exception as e:
        await update.message.reply_text(f"\U0000274C Error: {e}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    if not OPENAI_KEY:
        raise ValueError("OPENAI_API_KEY no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("search", search_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.run_polling()

if __name__ == "__main__":
    main()
