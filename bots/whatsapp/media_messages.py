#!/usr/bin/env python3
"""
media_messages.py — Bot de multimedia WhatsApp
MODIFICAR: reemplazar las URLs con tus recursos reales.
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


def send_image(to: str, url: str, caption: str = "") -> dict:
    """MODIFICAR: usar image_id para imágenes subidas al Media API."""
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": to, "type": "image",
               "image": {"link": url, "caption": caption}}
    return requests.post(WA_API_URL, headers=headers, json=payload, timeout=10).json()

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    sender   = msg["from"]
                    msg_type = msg.get("type")
                    if msg_type == "text":
                        text = msg["text"]["body"].strip().lower()
                        if text == "!imagen":
                            # MODIFICAR: reemplazar con URL de tu imagen
                            send_image(sender, "https://picsum.photos/400/300", "Imagen de ejemplo")
                        elif text == "!audio":
                            send_message(sender, "Para audio, subí el archivo al Media API primero.")
                        else:
                            send_message(sender, "Comandos: !imagen, !audio")
                    elif msg_type == "image":
                        mid = msg.get("image", {}).get("id", "?")
                        send_message(sender, f"Imagen recibida! Media ID: {mid}")
                    elif msg_type == "document":
                        doc = msg.get("document", {})
                        send_message(sender, f"Documento: {doc.get('filename','?')} ({doc.get('mime_type','?')})")
                    elif msg_type == "audio":
                        send_message(sender, "Audio recibido!")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
