"""
Mensajes multimedia para WhatsApp (Twilio + Flask).

Demuestra como recibir archivos enviados por el usuario (foto, audio,
documento) y como responder enviando una imagen o un PDF publico.

Uso:
    python bots/whatsapp/media_messages.py
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

app = Flask(__name__)


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip().lower()

    # MODIFICAR: NumMedia indica cuantos archivos envio el usuario.
    num_media = int(request.values.get("NumMedia", 0))
    if num_media > 0:
        # MODIFICAR: puedes descargar este archivo con requests.get(media_url)
        # autenticando con tus credenciales Twilio.
        media_url = request.values.get("MediaUrl0")
        media_type = request.values.get("MediaContentType0")
        logger.info("Archivo recibido: %s (%s)", media_url, media_type)

    resp = MessagingResponse()
    msg = resp.message()

    if "imagen" in incoming_msg or "image" in incoming_msg:
        msg.body("Aqui tienes una imagen:")
        # MODIFICAR: cambia esta URL por la imagen que quieras enviar
        # (debe ser publica y accesible desde internet).
        msg.media("https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400")
    elif "pdf" in incoming_msg or "doc" in incoming_msg:
        msg.body("Aqui esta el documento:")
        # MODIFICAR: cambia por la URL de tu PDF o documento.
        msg.media("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
    else:
        msg.body("Envia 'imagen' para una foto o 'pdf' para un documento.")

    return str(resp)


if __name__ == "__main__":
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
