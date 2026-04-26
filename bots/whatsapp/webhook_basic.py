"""
Webhook basico de WhatsApp con Flask + Twilio.

La base de todos los bots de WhatsApp via Twilio. Un servidor Flask
recibe webhooks POST en /whatsapp y responde con TwiML.

NOTA del audit (Fase 2): los templates originales usan Twilio.
La doc del proyecto apunta a la API oficial de Meta. Fase 3 introducira
equivalentes Meta. Mientras tanto, Twilio funciona perfecto y es el camino
mas rapido para tener un sandbox de prueba.

Uso:
    python bots/whatsapp/webhook_basic.py
    # Expone el puerto 5000. Usa ngrok/cloudflared para que Twilio lo alcance.

Requisitos en .env:
    PORT (opcional, default 5000)
"""

import os
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


# MODIFICAR: cambia la ruta '/whatsapp' si quieres usar otra URL para el webhook.
@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    # MODIFICAR: 'Body' contiene el texto del mensaje. Puedes agregar validacion.
    incoming_msg = request.values.get("Body", "").strip()
    # MODIFICAR: 'From' tiene el numero del usuario en formato 'whatsapp:+XXXX'.
    sender = request.values.get("From", "")

    logger.info("Mensaje de %s: %s", sender, incoming_msg)

    resp = MessagingResponse()
    msg = resp.message()
    # MODIFICAR: cambia esta respuesta por la logica real de tu bot.
    msg.body(f"Recibi tu mensaje: '{incoming_msg}'")

    return str(resp)


if __name__ == "__main__":
    port = int(get_env("PORT", "5000"))
    # MODIFICAR: debug=False en produccion. En produccion usa gunicorn o waitress.
    app.run(host="0.0.0.0", port=port, debug=True)
