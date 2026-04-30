#!/usr/bin/env python3
"""
command_router.py — Enrutador de comandos WhatsApp
MODIFICAR: agregar nuevos comandos como funciones y registrarlos en COMMANDS.
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

# MODIFICAR: agregar tus comandos aquí
def cmd_help(sender, args): return "Comandos:\n!help\n!info\n!ping\n!hora"
def cmd_info(sender, args): return "WhatsApp Bot v1.0"
def cmd_ping(sender, args): return "Pong! El bot responde."
def cmd_hora(sender, args): return f"Hora: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

# MODIFICAR: registrar tus comandos aquí
COMMANDS = {"!help": cmd_help, "!info": cmd_info, "!ping": cmd_ping, "!hora": cmd_hora}

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender  = msg["from"]
                    parts   = msg["text"]["body"].strip().split(None, 1)
                    cmd     = parts[0].lower()
                    args    = parts[1] if len(parts) > 1 else ""
                    handler = COMMANDS.get(cmd)
                    send_message(sender, handler(sender, args) if handler else "Comando desconocido. Usá !help")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
