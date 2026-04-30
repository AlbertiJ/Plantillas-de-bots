#!/usr/bin/env python3
"""
group_multiuser.py — Bot multiusuario grupos WhatsApp
MODIFICAR: agregar más campos al contexto en get_or_create_ctx().
Requiere: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN
pip install flask requests
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

import datetime

user_contexts: dict[str, dict] = {}
group_stats: dict[str, int] = {}

def get_or_create_ctx(phone: str, name: str) -> dict:
    if phone not in user_contexts:
        user_contexts[phone] = {"name": name, "session_start": datetime.datetime.now().isoformat(), "message_count": 0}
    user_contexts[phone]["message_count"] += 1
    return user_contexts[phone]

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender = msg["from"]
                    name   = change.get("value", {}).get("contacts", [{}])[0].get("profile", {}).get("name", sender)
                    text   = msg["text"]["body"].strip().lower()
                    ctx    = get_or_create_ctx(sender, name)
                    group_stats[sender] = group_stats.get(sender, 0) + 1
                    if text == "!yo":
                        send_message(sender, f"Tu sesión:\nNombre: {ctx['name']}\nInicio: {ctx['session_start'][:19]}\nMensajes: {ctx['message_count']}")
                    elif text == "!stats":
                        total = sum(group_stats.values())
                        lines = [f"{k[-4:]}: {v}" for k,v in list(group_stats.items())[:10]]
                        send_message(sender, f"Total: {total} msgs\n" + "\n".join(lines))
                    elif text == "!grupo":
                        send_message(sender, f"Usuarios: {len(user_contexts)}\nTotal msgs: {sum(group_stats.values())}")
                    else:
                        send_message(sender, "Comandos: !yo, !grupo, !stats")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
