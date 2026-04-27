"""
Agente con busqueda web (WhatsApp + Twilio + DuckDuckGo + OpenAI).

Equivalente WhatsApp del bot Telegram homonimo. Para cada pregunta:
    1. Busca en DuckDuckGo (HTML, sin API key)
    2. Toma los 5 primeros resultados
    3. Pide a OpenAI que sintetice citando fuentes

Uso:
    python bots/whatsapp/agent_websearch.py

Requisitos en .env:
    OPENAI_API_KEY
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import requests
from bs4 import BeautifulSoup
from flask import Flask, request
from openai import OpenAI
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
MODEL = get_env("OPENAI_MODEL", "gpt-4o-mini")

UA = "Mozilla/5.0 plantillas-de-bots/1.0"
TOP_N = 5


def web_search(query: str) -> list[dict]:
    # MODIFICAR: cambia por una API real (Tavily/Brave/Serper) para mas calidad.
    r = requests.post(
        "https://html.duckduckgo.com/html/",
        data={"q": query},
        headers={"User-Agent": UA},
        timeout=10,
    )
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for el in soup.select("div.result")[:TOP_N]:
        a = el.select_one("a.result__a")
        s = el.select_one("a.result__snippet, div.result__snippet")
        if not a:
            continue
        out.append({
            "title": a.get_text(strip=True),
            "url": a.get("href", ""),
            "snippet": s.get_text(strip=True) if s else "",
        })
    return out


app = Flask(__name__)


@app.route("/whatsapp", methods=["POST"])
def webhook():
    query = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()

    try:
        results = web_search(query)
    except Exception as e:
        logger.error("Busqueda fallida: %s", e)
        msg.body("No pude hacer la busqueda.")
        return str(resp)

    if not results:
        msg.body("Sin resultados utiles.")
        return str(resp)

    ctx = "\n\n".join(
        f"[{i+1}] {r['title']}\n{r['snippet']}\n{r['url']}"
        for i, r in enumerate(results)
    )

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": (
                    "Responde basandote SOLO en estos resultados. "
                    "Cita con [1], [2], etc. Responde en espanol."
                )},
                {"role": "user", "content": f"Pregunta: {query}\n\nResultados:\n{ctx}"},
            ],
            temperature=0.3,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error OpenAI: %s", e)
        msg.body("Encontre resultados pero el modelo fallo.")
        return str(resp)

    sources = "\n".join(f"[{i+1}] {r['url']}" for i, r in enumerate(results))
    msg.body(f"{reply}\n\nFuentes:\n{sources}")
    return str(resp)


if __name__ == "__main__":
    logger.info("Agente busqueda web (WhatsApp) iniciado.")
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
