#!/usr/bin/env python3
"""
agent_openai_persistent.py — Agente OpenAI persistente WhatsApp
MODIFICAR: cambiar MODEL y SYSTEM_PROMPT según tu caso de uso.
Requiere: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, OPENAI_API_KEY
pip install flask requests openai
"""
import logging, os, requests
from flask import Flask, request, jsonify

PHONE_ID     = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "mi_token_secreto")
ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
PORT         = int(os.getenv("PORT", "5000"))
WA_API_URL   = f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages"
app = Flask(__name__)
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

def send_message(to: str, text: str) -> dict:
    """MODIFICAR: agregar más tipos de mensajes (imagen, template, etc.)"""
    if not ACCESS_TOKEN or not PHONE_ID:
        logger.error("ACCESS_TOKEN o PHONE_ID no configurados")
        return {}
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text[:4000]}}
    r = requests.post(WA_API_URL, headers=headers, json=payload, timeout=10)
    return r.json()

@app.route("/webhook", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge", ""), 200
    return "Token inválido", 403

import openai, sqlite3
from pathlib import Path

OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")
MODEL         = "gpt-4o-mini"
DB_PATH       = Path(__file__).parent / "wa_agent_history.db"
# MODIFICAR: personalizar el agente
SYSTEM_PROMPT = "Sos un asistente con memoria persistente. Recordás el contexto de conversaciones previas."
ai_client     = openai.OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None

def init_db():
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS messages (
            phone TEXT, role TEXT, content TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)""")

def load_history(phone: str) -> list:
    with sqlite3.connect(DB_PATH) as con:
        rows = con.execute("SELECT role, content FROM messages WHERE phone=? ORDER BY ts DESC LIMIT 20", (phone,)).fetchall()
    return [{"role": "system", "content": SYSTEM_PROMPT}] + [{"role": r, "content": c} for r,c in reversed(rows)]

def save_msg(phone, role, content):
    with sqlite3.connect(DB_PATH) as con:
        con.execute("INSERT INTO messages (phone, role, content) VALUES (?,?,?)", (phone, role, content))

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender = msg["from"]
                    text   = msg["text"]["body"].strip()
                    if text == "!reset":
                        with sqlite3.connect(DB_PATH) as con:
                            con.execute("DELETE FROM messages WHERE phone=?", (sender,))
                        send_message(sender, "Historial borrado.")
                        continue
                    if not ai_client:
                        send_message(sender, "OPENAI_API_KEY no configurada.")
                        continue
                    save_msg(sender, "user", text)
                    msgs  = load_history(sender)
                    resp  = ai_client.chat.completions.create(model=MODEL, messages=msgs, max_tokens=500)
                    reply = resp.choices[0].message.content
                    save_msg(sender, "assistant", reply)
                    send_message(sender, reply)
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=PORT, debug=False)
