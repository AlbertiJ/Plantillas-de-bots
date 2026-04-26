"""
Bot Eco Basico para Telegram.

El bot mas simple posible: escucha mensajes de texto y responde con
el mismo texto recibido. Sirve como punto de partida para cualquier
otro bot.

Uso:
    python bots/telegram/echo_bot.py
    # o desde la raiz del proyecto:
    python -m bots.telegram.echo_bot

Requisitos en .env (raiz del proyecto):
    TELEGRAM_BOT_TOKEN=tu_token_de_botfather
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)


# MODIFICAR: cambia el mensaje de bienvenida por el tuyo.
# Puedes agregar tu nombre, logo o descripcion del bot aqui.
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hola! Soy un bot de eco. Enviame cualquier mensaje y te lo repito."
    )


# MODIFICAR: en lugar de repetir el mensaje, puedes procesarlo, guardarlo
# o analizarlo. Por ejemplo: guardarlo en una base de datos, traducirlo,
# clasificarlo o pasarlo a un agente IA.
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(update.message.text)


def main() -> None:
    # require_env lanza un error claro si TELEGRAM_BOT_TOKEN no existe.
    token = require_env("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # MODIFICAR: agrega mas handlers para responder a diferentes comandos
    # o tipos de mensajes (fotos, documentos, ubicacion, etc.).
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    logger.info("Bot Eco iniciado. Esperando mensajes...")
    # MODIFICAR: allowed_updates controla que tipos de actualizaciones recibe el bot.
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
