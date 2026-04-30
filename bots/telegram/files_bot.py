#!/usr/bin/env python3
"""
files_bot.py — Bot para recibir y procesar archivos en Telegram
MODIFICAR: agregar procesamiento personalizado en handle_photo() y handle_document().
"""
import logging, os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F4C2 Bot de Archivos\n\nEnviame:\n- Una foto\n- Un documento\n- Un audio"
    )

async def handle_photo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    photo = update.message.photo[-1]
    # MODIFICAR: descargar y procesar la imagen
    logger.info("Foto recibida: %s (%.1f KB)", photo.file_id, photo.file_size / 1024)
    await update.message.reply_text(
        f"\U0001F5BC Foto recibida\n"
        f"Resolución: {photo.width}x{photo.height}px\n"
        f"Tamaño: {photo.file_size / 1024:.1f} KB"
    )

async def handle_document(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    doc = update.message.document
    # MODIFICAR: procesar según mime_type
    logger.info("Documento: %s (%s)", doc.file_name, doc.mime_type)
    await update.message.reply_text(
        f"\U0001F4C4 Documento\nNombre: {doc.file_name}\n"
        f"Tipo: {doc.mime_type}\nTamaño: {doc.file_size / 1024:.1f} KB"
    )

async def handle_audio(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    audio = update.message.audio or update.message.voice
    await update.message.reply_text(
        f"\U0001F3A7 Audio recibido\nDuración: {audio.duration}s"
    )

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.AUDIO | filters.VOICE, handle_audio))
    app.run_polling()

if __name__ == "__main__":
    main()
