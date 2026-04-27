"""
Agente multimodal con vision (WhatsApp + Twilio + OpenAI).

Cuando el usuario envia una imagen, descarga la URL de Twilio (con auth
basica HTTP), la pasa a OpenAI vision (gpt-4o-mini) y responde con la
descripcion o respuesta a la pregunta del caption (Body).

Uso:
    python bots/whatsapp/agent_vision.py

Requisitos en .env:
    OPENAI_API_KEY
    TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN
"""

import base64
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import requests
from flask import Flask, request
from openai import OpenAI
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
TWILIO_SID = require_env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = require_env("TWILIO_AUTH_TOKEN")
# MODIFICAR: gpt-4o (mejor calidad) o gpt-4o-mini (mas barato).
MODEL = get_env("OPENAI_VISION_MODEL", "gpt-4o-mini")

app = Flask(__name__)


@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    num_media = int(request.values.get("NumMedia", 0))
    resp = MessagingResponse()
    msg = resp.message()

    if num_media == 0:
        msg.body("Enviame una IMAGEN (con caption opcional) para analizarla.")
        return str(resp)

    media_url = request.values.get("MediaUrl0")
    media_type = request.values.get("MediaContentType0", "image/jpeg")

    try:
        # MODIFICAR: Twilio requiere auth basica para descargar media.
        r = requests.get(media_url, auth=(TWILIO_SID, TWILIO_AUTH), timeout=15)
        r.raise_for_status()
        b64 = base64.b64encode(r.content).decode("ascii")
    except Exception as e:
        logger.error("Descarga falló: %s", e)
        msg.body("No pude descargar la imagen.")
        return str(resp)

    data_url = f"data:{media_type};base64,{b64}"
    user_prompt = body or "Describe esta imagen en detalle."

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }],
            max_tokens=600,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error vision: %s", e)
        msg.body("No pude analizar la imagen.")
        return str(resp)

    msg.body(reply)
    return str(resp)


if __name__ == "__main__":
    logger.info("Agente de vision (WhatsApp) iniciado. Modelo: %s", MODEL)
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
