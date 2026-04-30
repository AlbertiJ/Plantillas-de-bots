#!/usr/bin/env python3
"""
auto_language_detect.py — Bot detección de idioma WhatsApp
MODIFICAR: instalar langdetect para detección más precisa.
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


# MODIFICAR: agregar más idiomas y respuestas
RESPONSES = {
    "es": {"greet": "Hola! Detecté español. ¿En qué te puedo ayudar?", "bye": "Hasta luego!", "default": "Mensaje en español."},
    "en": {"greet": "Hello! I detected English. How can I help?", "bye": "Goodbye!", "default": "Message in English."},
    "pt": {"greet": "Olá! Detectei português. Como posso ajudar?", "bye": "Até logo!", "default": "Mensagem em português."},
}

def detect_language(text: str) -> str:
    """MODIFICAR: usar langdetect para mayor precisión: pip install langdetect"""
    tl     = text.lower()
    es_w   = ["hola","gracias","como","para","que","esta","bien","estás","cómo"]
    en_w   = ["hello","thanks","how","what","the","and","for","good","please"]
    pt_w   = ["olá","obrigado","como","bom","para","que","está","boa","você"]
    scores = {"es": sum(w in tl for w in es_w), "en": sum(w in tl for w in en_w), "pt": sum(w in tl for w in pt_w)}
    best   = max(scores, key=scores.get)
    return best if scores[best] > 0 else "es"

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
                    lang   = detect_language(text)
                    resp   = RESPONSES.get(lang, RESPONSES["es"])
                    tl     = text.lower()
                    if any(w in tl for w in ["hola","hello","olá","hi","hey","oi"]):
                        reply = resp["greet"]
                    elif any(w in tl for w in ["bye","adios","chau","hasta","até"]):
                        reply = resp["bye"]
                    else:
                        reply = resp["default"] + f" [Idioma: {lang.upper()}]"
                    send_message(sender, reply)
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
