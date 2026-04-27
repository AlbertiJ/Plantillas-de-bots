"""
Agente multimodal con vision (Telegram).

Cuando el usuario envia una foto (con o sin caption), el bot la pasa
al modelo de OpenAI con vision (gpt-4o-mini) para describir, analizar
o responder a la pregunta del caption.

Uso:
    python bots/telegram/agent_vision.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
    OPENAI_API_KEY
"""

import base64
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from openai import OpenAI
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
# MODIFICAR: gpt-4o (mejor calidad) o gpt-4o-mini (mas barato).
MODEL = get_env("OPENAI_VISION_MODEL", "gpt-4o-mini")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Enviame una foto y la describo o respondo lo que me preguntes en el caption."
    )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Ultimo elemento = mayor resolucion.
    photo = update.message.photo[-1]
    file = await photo.get_file()
    photo_bytes = await file.download_as_bytearray()

    b64 = base64.b64encode(bytes(photo_bytes)).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"

    # MODIFICAR: prompt por defecto si no hay caption.
    user_prompt = (update.message.caption or "Describe esta imagen en detalle.").strip()

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
            # MODIFICAR: ajusta max_tokens segun la longitud que necesitas.
            max_tokens=600,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error vision: %s", e)
        await update.message.reply_text("No pude analizar la imagen.")
        return

    await update.message.reply_text(reply)


async def text_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Soy un agente de vision: enviame una IMAGEN, no texto."
    )


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_fallback))
    logger.info("Agente de vision iniciado. Modelo: %s", MODEL)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
