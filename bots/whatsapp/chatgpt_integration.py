#!/usr/bin/env python3
"""
chatgpt_integration.py — Bot ChatGPT para WhatsApp
MODIFICAR: cambiar MODEL y SYSTEM_PROMPT según tus necesidades.
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

import openai

OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")
MODEL         = "gpt-4o-mini"  # MODIFICAR: gpt-4o para mejor calidad
# MODIFICAR: personalizar el rol del asistente
SYSTEM_PROMPT = "Sos un asistente amigable. Respondé de forma concisa en el idioma del usuario."
history: dict[str, list] = {}
ai_client = openai.OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None

def get_ai_response(uid: str, text: str) -> str:
    msgs = history.setdefault(uid, [{"role": "system", "content": SYSTEM_PROMPT}])
    msgs.append({"role": "user", "content": text})
    if len(msgs) > 21: msgs = [msgs[0]] + msgs[-20:]
    if not ai_client:
        return "OPENAI_API_KEY no configurada."
    resp  = ai_client.chat.completions.create(model=MODEL, messages=msgs, max_tokens=500)
    reply = resp.choices[0].message.content
    msgs.append({"role": "assistant", "content": reply})
    return reply

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
                        history.pop(sender, None)
                        send_message(sender, "Historial borrado.")
                    else:
                        send_message(sender, get_ai_response(sender, text))
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    if not all([PHONE_ID, ACCESS_TOKEN]):
        raise ValueError("Configurá las variables WA en .env")
    app.run(host="0.0.0.0", port=PORT, debug=False)
