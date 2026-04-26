"""
Integracion ChatGPT para WhatsApp (Twilio + Flask + OpenAI).

Reenvia el mensaje del usuario a la API de OpenAI y devuelve la
respuesta del modelo al chat. Mantiene historial de conversacion en
memoria por numero de telefono.

NOTA: este es un template de la "version basica" de IA. Las plantillas
con agente IA mas avanzadas (memoria persistente, herramientas, etc.)
llegaran en Fase 3.

Uso:
    python bots/whatsapp/chatgpt_integration.py

Requisitos en .env:
    OPENAI_API_KEY
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import openai
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

app = Flask(__name__)
openai.api_key = require_env("OPENAI_API_KEY")

# MODIFICAR: en produccion usa Redis o una DB indexada por numero de telefono.
# El dict en memoria se pierde si reinicias el proceso.
conversations: dict[str, list[dict]] = {}


def get_chatgpt_response(sender: str, message: str) -> str:
    if sender not in conversations:
        conversations[sender] = [
            # MODIFICAR: el system prompt define el comportamiento y personalidad
            # del bot. Cambialo segun el caso de uso.
            {
                "role": "system",
                "content": "Eres un asistente de WhatsApp util y conciso.",
            }
        ]

    conversations[sender].append({"role": "user", "content": message})

    # MODIFICAR: ajusta el limite de mensajes para controlar el costo de tokens.
    if len(conversations[sender]) > 10:
        conversations[sender] = [conversations[sender][0]] + conversations[sender][-9:]

    try:
        response = openai.chat.completions.create(
            # MODIFICAR: puedes usar 'gpt-4o' para mejor calidad (mas costoso).
            model=get_env("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=conversations[sender],
            # MODIFICAR: ajusta max_tokens segun la longitud de respuesta que necesitas.
            max_tokens=250,
        )
        reply = response.choices[0].message.content.strip()
        conversations[sender].append({"role": "assistant", "content": reply})
        return reply
    except Exception as e:
        logger.error("Error de OpenAI: %s", e)
        return "Lo siento, tengo problemas para responder ahora."


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    # MODIFICAR: agrega mas comandos especiales ademas de /reset.
    if incoming_msg.lower() == "/reset":
        conversations[sender] = []
        msg.body("Historial de conversacion borrado.")
    else:
        ai_reply = get_chatgpt_response(sender, incoming_msg)
        msg.body(ai_reply)

    return str(resp)


if __name__ == "__main__":
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
