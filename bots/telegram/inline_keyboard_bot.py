"""
Bot con teclado inline y callbacks para Telegram.

Envia mensajes con botones adjuntos y maneja la respuesta cuando el
usuario presiona un boton. Util para menus de productos, opciones de
idioma, confirmaciones, etc.

Uso:
    python bots/telegram/inline_keyboard_bot.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)


# MODIFICAR: cambia los textos y datos de los botones segun tu caso de uso.
# Puedes crear menus de productos, opciones de idioma, confirmaciones, etc.
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [
            InlineKeyboardButton("Opcion 1", callback_data="1"),
            InlineKeyboardButton("Opcion 2", callback_data="2"),
        ],
        # MODIFICAR: agrega mas filas de botones o cambia la distribucion.
        [InlineKeyboardButton("Opcion 3", callback_data="3")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    # MODIFICAR: personaliza el texto del mensaje que acompana a los botones.
    await update.message.reply_text(
        "Por favor elige una opcion:", reply_markup=reply_markup
    )


# MODIFICAR: agrega logica real para cada boton en lugar de solo mostrar el ID.
# Por ejemplo: guardar preferencia en DB, abrir un menu secundario, etc.
async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    # Obligatorio responder al callback para no bloquear el cliente.
    await query.answer()

    # MODIFICAR: aqui va la logica real segun el valor de query.data.
    await query.edit_message_text(text=f"Seleccionaste la opcion: {query.data}")


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("start", start))
    # MODIFICAR: puedes pasar un patron regex al CallbackQueryHandler
    # para filtrar callbacks por prefijo (ej: pattern="^menu_").
    application.add_handler(CallbackQueryHandler(button_callback))

    logger.info("Bot de teclado inline iniciado.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
