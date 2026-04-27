"""
Agente IA con busqueda web (Telegram).

Para cada pregunta del usuario:
    1. Busca en DuckDuckGo (HTML, sin API key)
    2. Toma los 5 primeros resultados (titulo + snippet + url)
    3. Pide a OpenAI que sintetice una respuesta citando las fuentes

Uso:
    python bots/telegram/agent_websearch.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
    OPENAI_API_KEY
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import requests
from bs4 import BeautifulSoup
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

UA = "Mozilla/5.0 (X11; Linux x86_64) plantillas-de-bots/1.0"
# MODIFICAR: ajusta el numero de resultados a procesar.
TOP_N = 5


def web_search(query: str) -> list[dict]:
    """Devuelve lista de {title, url, snippet}."""
    # MODIFICAR: cambia por una API real (Tavily, Serper, Brave) si quieres
    # mas calidad y resiliencia al cambio del HTML.
    resp = requests.post(
        "https://html.duckduckgo.com/html/",
        data={"q": query},
        headers={"User-Agent": UA},
        timeout=10,
    )
    soup = BeautifulSoup(resp.text, "html.parser")
    results = []
    for r in soup.select("div.result")[:TOP_N]:
        title_el = r.select_one("a.result__a")
        snippet_el = r.select_one("a.result__snippet, div.result__snippet")
        if not title_el:
            continue
        results.append({
            "title": title_el.get_text(strip=True),
            "url": title_el.get("href", ""),
            "snippet": snippet_el.get_text(strip=True) if snippet_el else "",
        })
    return results


def format_context(results: list[dict]) -> str:
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"[{i}] {r['title']}\n{r['snippet']}\nURL: {r['url']}")
    return "\n\n".join(lines)


async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.message.text
    await update.message.reply_text("Buscando informacion...")

    try:
        results = web_search(query)
    except Exception as e:
        logger.error("Error de busqueda: %s", e)
        await update.message.reply_text("No pude hacer la busqueda web.")
        return

    if not results:
        await update.message.reply_text("Sin resultados utiles.")
        return

    ctx = format_context(results)
    # MODIFICAR: ajusta el system prompt para tu estilo de respuesta.
    messages = [
        {"role": "system", "content": (
            "Eres un asistente que responde basandote SOLO en los resultados "
            "de busqueda dados. Cita las fuentes con [1], [2], etc. al final "
            "de cada afirmacion. Responde en espanol."
        )},
        {"role": "user", "content": f"Pregunta: {query}\n\nResultados:\n{ctx}"},
    ]

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.3,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error OpenAI: %s", e)
        await update.message.reply_text("Encontre resultados pero el modelo fallo.")
        return

    sources = "\n".join(f"[{i}] {r['url']}" for i, r in enumerate(results, 1))
    await update.message.reply_text(f"{reply}\n\nFuentes:\n{sources}")


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    app = Application.builder().token(token).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))
    logger.info("Agente con busqueda web iniciado.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
