#!/usr/bin/env python3
"""
wa_04_encoding.py — CTF: Encodings para WhatsApp (Base64, ROT13, Morse, Hex)
MODIFICAR: agregar más encodings según se necesiten en CTF.
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

import base64, codecs, urllib.parse

MORSE = {"A":".-","B":"-...","C":"-.-.","D":"-..","E":".","F":"..-.","G":"--.","H":"....","I":"..","J":".---","K":"-.-","L":".-..","M":"--","N":"-.","O":"---","P":".--.","Q":"--.-","R":".-.","S":"...","T":"-","U":"..-","V":"...-","W":".--","X":"-..-","Y":"-.--","Z":"--..","0":"-----","1":".----","2":"..---","3":"...--","4":"....-","5":".....","6":"-....","7":"--...","8":"---..","9":"----.",".":" "}

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
                    if cmd == "!b64" and arg:
                        send_message(sender, f"Base64: {base64.b64encode(arg.encode()).decode()}")
                    elif cmd == "!db64" and arg:
                        try: send_message(sender, f"Decoded: {base64.b64decode(arg).decode()}")
                        except: send_message(sender, "Error decodificando base64.")
                    elif cmd == "!rot13" and arg:
                        send_message(sender, f"ROT13: {codecs.encode(arg, 'rot_13')}")
                    elif cmd == "!morse" and arg:
                        result = " ".join(MORSE.get(c.upper(), "?") for c in arg)
                        send_message(sender, f"Morse: {result}")
                    elif cmd == "!hex" and arg:
                        send_message(sender, f"Hex: {arg.encode().hex()}")
                    else:
                        send_message(sender, "Comandos: !b64 <txt>, !db64 <b64>, !rot13 <txt>, !morse <txt>, !hex <txt>")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
