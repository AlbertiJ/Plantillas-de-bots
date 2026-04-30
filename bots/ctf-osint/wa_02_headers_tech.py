#!/usr/bin/env python3
"""
wa_02_headers_tech.py — CTF/OSINT: Headers HTTP y tecnologías WhatsApp
MODIFICAR: agregar más headers de fingerprinting.
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

import ssl, socket

def get_headers(url):
    # MODIFICAR: agregar más headers de interés
    try:
        if not url.startswith("http"): url = "https://" + url
        r = requests.get(url, timeout=10, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
        interest = ["server","x-powered-by","x-frame-options","content-security-policy","strict-transport-security"]
        return {k: v for k,v in r.headers.items() if k.lower() in interest}, r.status_code
    except Exception as e:
        return {}, f"Error: {e}"

def get_ssl_info(domain):
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(8); s.connect((domain, 443))
            cert = s.getpeercert()
        issuer = dict(x[0] for x in cert.get("issuer", []))
        return f"Emisor: {issuer.get('organizationName','?')}\nExpira: {cert.get('notAfter','?')}"
    except Exception as e:
        return f"Error SSL: {e}"

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
                    if cmd == "!headers" and arg:
                        headers, status = get_headers(arg)
                        lines = [f"Status: {status}"] + [f"{k}: {v[:80]}" for k,v in headers.items()]
                        send_message(sender, f"Headers {arg}:\n" + "\n".join(lines))
                    elif cmd == "!ssl" and arg:
                        import urllib.parse
                        domain = urllib.parse.urlparse(arg).netloc or arg
                        send_message(sender, f"SSL {domain}:\n{get_ssl_info(domain)}")
                    elif cmd == "!tech" and arg:
                        headers, _ = get_headers(arg)
                        techs = []
                        srv = (headers.get("server","") + headers.get("Server","")).lower()
                        if "nginx" in srv: techs.append("Nginx")
                        if "apache" in srv: techs.append("Apache")
                        if "cloudflare" in srv: techs.append("Cloudflare")
                        powered = headers.get("x-powered-by","")
                        if powered: techs.append(powered)
                        send_message(sender, f"Tecnologías {arg}:\n" + (", ".join(techs) if techs else "No detectadas"))
                    else:
                        send_message(sender, "Comandos: !headers <url>, !tech <url>, !ssl <dominio>")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
