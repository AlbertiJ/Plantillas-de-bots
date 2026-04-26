"""
Enrutador de comandos para WhatsApp (Twilio + Flask).

Dirige los mensajes entrantes a diferentes funciones segun el comando
o palabra clave detectada. Util como esqueleto de bots con multiples
funciones.

Uso:
    python bots/whatsapp/command_router.py
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


# MODIFICAR: personaliza el mensaje de saludo con el nombre de tu servicio.
def handle_hello(sender: str) -> str:
    return "Hola! En que te puedo ayudar hoy?"


# MODIFICAR: actualiza la lista de comandos para reflejar los que ofreces.
def handle_help(sender: str) -> str:
    return (
        "Comandos disponibles:\n"
        "- hola: Saludo\n"
        "- estado: Estado del sistema\n"
        "- ayuda: Este menu"
    )


# MODIFICAR: aqui puedes verificar APIs externas, bases de datos, etc.
def handle_status(sender: str) -> str:
    return "Todos los sistemas operativos!"


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    # MODIFICAR: agrega mas comandos al if/elif segun lo que tu bot deba hacer.
    incoming_msg = request.values.get("Body", "").strip().lower()
    sender = request.values.get("From", "")
    logger.info("Comando '%s' de %s", incoming_msg, sender)

    resp = MessagingResponse()
    msg = resp.message()

    if incoming_msg in ["hola", "hello", "hi", "hey"]:
        response_text = handle_hello(sender)
    elif incoming_msg in ["ayuda", "help"]:
        response_text = handle_help(sender)
    elif incoming_msg in ["estado", "status"]:
        response_text = handle_status(sender)
    else:
        # MODIFICAR: cambia el mensaje fallback por uno que tenga sentido para tu bot.
        response_text = "No entendi ese comando. Envia 'ayuda' para ver opciones."

    msg.body(response_text)
    return str(resp)


if __name__ == "__main__":
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
