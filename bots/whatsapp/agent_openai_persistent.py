"""
Agente IA con OpenAI y memoria persistente en SQLite (WhatsApp + Twilio).

Mejora a `chatgpt_integration.py` (que solo guarda en RAM): aqui el
historial por numero de telefono persiste en `data/whatsapp_chats.db`
y sobrevive a reinicios.

Uso:
    python bots/whatsapp/agent_openai_persistent.py

Requisitos en .env:
    OPENAI_API_KEY
"""

import json
import sqlite3
import sys
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

DB_PATH = "data/whatsapp_chats.db"
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)

# MODIFICAR: la personalidad del agente.
SYSTEM_PROMPT = "Eres un asistente WhatsApp util, conciso y siempre en espanol."
MAX_HISTORY = 16


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS chats (
            phone TEXT PRIMARY KEY, history_json TEXT NOT NULL
        )"""
    )
    conn.commit()
    conn.close()


def load_history(phone: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT history_json FROM chats WHERE phone = ?", (phone,)).fetchone()
    conn.close()
    if not row:
        return [{"role": "system", "content": SYSTEM_PROMPT}]
    try:
        return json.loads(row[0])
    except Exception:
        return [{"role": "system", "content": SYSTEM_PROMPT}]


def save_history(phone: str, history: list[dict]) -> None:
    if len(history) > MAX_HISTORY:
        # MODIFICAR: estrategia de poda.
        history = [history[0]] + history[-(MAX_HISTORY - 1):]
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO chats (phone, history_json) VALUES (?, ?)",
        (phone, json.dumps(history, ensure_ascii=False)),
    )
    conn.commit()
    conn.close()


def reset_history(phone: str) -> None:
    save_history(phone, [{"role": "system", "content": SYSTEM_PROMPT}])


app = Flask(__name__)


@app.route("/whatsapp", methods=["POST"])
def webhook():
    incoming = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    if incoming.lower() in ("/reset", "reset"):
        reset_history(sender)
        msg.body("Historial borrado.")
        return str(resp)

    history = load_history(sender)
    history.append({"role": "user", "content": incoming})

    try:
        completion = client.chat.completions.create(
            model=MODEL, messages=history, temperature=0.7
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error OpenAI: %s", e)
        msg.body("Tuve un problema con el modelo. Reintenta.")
        return str(resp)

    history.append({"role": "assistant", "content": reply})
    save_history(sender, history)
    msg.body(reply)
    return str(resp)


if __name__ == "__main__":
    init_db()
    logger.info("Agente OpenAI persistente iniciado. DB: %s", DB_PATH)
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
