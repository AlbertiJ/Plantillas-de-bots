#!/usr/bin/env python3
"""
wa_03_hash_suite.py — CTF: Suite de hashes para WhatsApp
MODIFICAR: agregar más algoritmos según se necesiten en CTF.
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

def send_message(to, text):
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text[:4000]}}
    requests.post(WA_API_URL, headers=headers, json=payload, timeout=10)

@app.route("/webhook", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge", ""), 200
    return "Forbidden", 403

import hashlib, re

def hashes(text):
    d = text.encode()
    return {"MD5": hashlib.md5(d).hexdigest(), "SHA1": hashlib.sha1(d).hexdigest(),
            "SHA256": hashlib.sha256(d).hexdigest(), "SHA512": hashlib.sha512(d).hexdigest()}

def identify(h):
    h = h.strip()
    lengths = {32:"MD5", 40:"SHA1", 56:"SHA224", 64:"SHA256", 96:"SHA384", 128:"SHA512"}
    if not re.match(r"^[0-9a-fA-F]+$", h):
        return "No es un hash hexadecimal válido"
    return lengths.get(len(h), f"Desconocido (longitud {len(h)})")

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender = msg["from"]
                    parts  = msg["text"]["body"].strip().split(None, 1)
                    cmd    = parts[0].lower() if parts else ""
                    arg    = parts[1] if len(parts) > 1 else ""
                    if cmd == "!hash" and arg:
                        h = hashes(arg)
                        send_message(sender, f"Hashes de: {arg[:30]}\n" + "\n".join(f"{k}: {v}" for k,v in h.items()))
                    elif cmd == "!id" and arg:
                        send_message(sender, f"Tipo: {identify(arg)}")
                    elif cmd == "!sha256" and arg:
                        send_message(sender, f"SHA256: {hashlib.sha256(arg.encode()).hexdigest()}")
                    else:
                        send_message(sender, "Comandos: !hash <texto>, !id <hash>, !sha256 <texto>")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
