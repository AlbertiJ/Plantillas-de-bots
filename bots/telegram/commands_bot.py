"""
Bot con manejador de comandos para Telegram.

Responde a comandos especificos como /start, /help, /about, /ping.
Util como esqueleto de bots con menu de comandos.

Uso:
    python bots/telegram/commands_bot.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)


# MODIFICAR: personaliza este mensaje de bienvenida con el nombre de tu bot.
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Bienvenido/a! Usa /help para ver los comandos disponibles."
    )


# MODIFICAR: actualiza la lista de comandos para reflejar los que tiene tu bot.
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    help_text = (
        "Comandos disponibles:\n"
        "/start - Iniciar el bot\n"
        "/help  - Mostrar este mensaje\n"
        "/about - Info sobre este bot\n"
        "/ping  - Verificar si el bot esta activo"
    )
    await update.message.reply_text(help_text)


# MODIFICAR: agrega aqui la descripcion real de tu bot, su proposito y creador.
async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Soy un bot de demostracion construido con python-telegram-bot v20+."
    )


async def ping_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # MODIFICAR: puedes agregar metricas reales como uptime, uso de CPU
    # o estado de la base de datos.
    await update.message.reply_text("Pong!")


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # MODIFICAR: agrega aqui todos los comandos que tu bot soportara.
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("about", about_command))
    application.add_handler(CommandHandler("ping", ping_command))

    logger.info("Bot de comandos iniciado.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
