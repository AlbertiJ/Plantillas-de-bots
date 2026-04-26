"""
Bot descargador de archivos para Telegram.

Recibe fotos o documentos enviados por usuarios y los guarda en la
carpeta `downloads/`. Util como base para bots de procesamiento de
archivos (OCR, parsing de PDFs, analisis de Excels, etc.).

Uso:
    python bots/telegram/files_bot.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
"""

import os
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

# MODIFICAR: cambia 'downloads' por la ruta donde quieres guardar los archivos.
DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


async def download_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Telegram envia fotos en multiples tamanos. El ultimo es el de mayor resolucion.
    photo_file = await update.message.photo[-1].get_file()

    # MODIFICAR: cambia el nombre del archivo o sube directamente a un bucket S3/GCS.
    file_path = f"{DOWNLOAD_DIR}/photo_{update.message.message_id}.jpg"
    await photo_file.download_to_drive(file_path)

    logger.info("Foto guardada en %s", file_path)
    # MODIFICAR: personaliza el mensaje de confirmacion al usuario.
    await update.message.reply_text("Foto recibida y guardada.")


async def download_document(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    document = update.message.document
    doc_file = await document.get_file()

    file_path = f"{DOWNLOAD_DIR}/{document.file_name}"
    await doc_file.download_to_drive(file_path)

    # MODIFICAR: puedes analizar el documento (PDF, Excel) despues de descargarlo.
    logger.info("Documento guardado en %s", file_path)
    await update.message.reply_text(f"Documento '{document.file_name}' recibido.")


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # MODIFICAR: agrega mas filtros para aceptar solo ciertos tipos de archivos.
    # Ejemplo: filters.Document.PDF para aceptar solo PDFs.
    application.add_handler(MessageHandler(filters.PHOTO, download_photo))
    application.add_handler(MessageHandler(filters.Document.ALL, download_document))

    logger.info("Bot descargador iniciado. Carpeta destino: %s", DOWNLOAD_DIR)
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
