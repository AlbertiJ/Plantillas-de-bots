#!/usr/bin/env python3
"""
wa_01_ip_geo.py — CTF/OSINT: IP/Geo para WhatsApp
MODIFICAR: usar ipinfo.io con token para más requests en producción.
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

import ipaddress

def get_ip_info(ip):
    try:
        return requests.get(f"https://ipapi.co/{ip}/json/", timeout=8).json()
    except Exception as e:
        return {"error": str(e)}

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender = msg["from"]
                    parts  = msg["text"]["body"].strip().split()
                    cmd    = parts[0].lower() if parts else ""
                    arg    = parts[1] if len(parts) > 1 else ""
                    if cmd in ["!ip","!geo","!asn"] and arg:
                        info = get_ip_info(arg)
                        if "error" in info:
                            send_message(sender, f"Error: {info['error']}")
                        elif cmd == "!asn":
                            send_message(sender, f"ASN: {info.get('asn','?')} — {info.get('org','?')}")
                        elif cmd == "!geo":
                            send_message(sender, f"Geo {arg}: {info.get('city','?')}, {info.get('country_name','?')}")
                        else:
                            send_message(sender, f"IP: {arg}\nPaís: {info.get('country_name','?')}\nCiudad: {info.get('city','?')}\nISP: {info.get('org','?')}")
                    else:
                        send_message(sender, "Comandos: !ip <IP>, !geo <IP>, !asn <IP>")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
