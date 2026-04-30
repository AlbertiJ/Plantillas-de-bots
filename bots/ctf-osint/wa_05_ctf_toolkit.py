#!/usr/bin/env python3
"""
wa_05_ctf_toolkit.py — CTF Toolkit completo para WhatsApp
SOLO PARA SISTEMAS AUTORIZADOS / EDUCATIVO / CTF.
MODIFICAR: agregar más comandos en el webhook handler.
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

import hashlib, base64, codecs, ipaddress

MORSE = {"A":".-","B":"-...","C":"-.-.","D":"-..","E":".","F":"..-.","G":"--.","H":"....","I":"..","J":".---","K":"-.-","L":".-..","M":"--","N":"-.","O":"---","P":".--.","Q":"--.-","R":".-.","S":"...","T":"-","U":"..-","V":"...-","W":".--","X":"-..-","Y":"-.--","Z":"--..","0":"-----","1":".----","2":"..---","3":"...--","4":"....-","5":".....","6":"-....","7":"--...","8":"---..","9":"----.",".":" "}

HELP = """CTF Toolkit WhatsApp:
HASHES: !hash <txt>, !sha256 <txt>
ENCODE: !b64 <txt>, !db64 <b64>, !rot13 <txt>, !morse <txt>, !hex <txt>
NETWORK: !ip <IP>, !cidr <red/mask>
ATAQUE: !xss, !sqli
!help — Esta ayuda"""

def get_ip_info(ip):
    try: return requests.get(f"https://ipapi.co/{ip}/json/", timeout=6).json()
    except: return {}

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
                    # MODIFICAR: agregar más comandos aquí
                    if cmd == "!help":
                        send_message(sender, HELP)
                    elif cmd == "!hash" and arg:
                        d = arg.encode()
                        send_message(sender, f"MD5: {hashlib.md5(d).hexdigest()}\nSHA256: {hashlib.sha256(d).hexdigest()}")
                    elif cmd == "!sha256" and arg:
                        send_message(sender, f"SHA256: {hashlib.sha256(arg.encode()).hexdigest()}")
                    elif cmd == "!b64" and arg:
                        send_message(sender, f"Base64: {base64.b64encode(arg.encode()).decode()}")
                    elif cmd == "!db64" and arg:
                        try: send_message(sender, f"Decoded: {base64.b64decode(arg).decode()}")
                        except: send_message(sender, "Error decodificando base64.")
                    elif cmd == "!rot13" and arg:
                        send_message(sender, f"ROT13: {codecs.encode(arg, 'rot_13')}")
                    elif cmd == "!morse" and arg:
                        send_message(sender, "Morse: " + " ".join(MORSE.get(c.upper(),"?") for c in arg))
                    elif cmd == "!hex" and arg:
                        send_message(sender, f"Hex: {arg.encode().hex()}")
                    elif cmd == "!ip" and arg:
                        info = get_ip_info(arg)
                        send_message(sender, f"IP: {arg}\nPaís: {info.get('country_name','?')}\nISP: {info.get('org','?')}")
                    elif cmd == "!cidr" and arg:
                        try:
                            net = ipaddress.ip_network(arg, strict=False)
                            send_message(sender, f"Red: {net}\nIPs: {net.num_addresses}\nMask: {net.netmask}")
                        except: send_message(sender, "CIDR inválido.")
                    elif cmd == "!xss":
                        send_message(sender, "XSS:\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>")
                    elif cmd == "!sqli":
                        send_message(sender, "SQLi:\n' OR 1=1--\n' UNION SELECT NULL--\nadmin'--")
                    else:
                        send_message(sender, "Usá !help para ver los comandos.")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
