#!/usr/bin/env python3
"""
echo_bot.py — Bot de Eco para Telegram
MODIFICAR: reemplazar la lógica en handle_message() con tu respuesta personalizada.
"""
import logging, os
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F916 Hola! Soy el Bot de Eco.\n"
        "Enviame cualquier mensaje y lo repetiré."
    )

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    # MODIFICAR: aquí va tu lógica personalizada
    user = update.effective_user.first_name
    text = update.message.text
    logger.info("Mensaje de %s: %s", user, text)
    await update.message.reply_text(f"\U0001F4AC {user} dijo:\n{text}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    logger.info("Echo bot iniciado...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
