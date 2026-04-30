#!/usr/bin/env python3
"""
inline_keyboard_bot.py — Bot con teclado inline interactivo
MODIFICAR: agregar más botones en build_menu() y casos en button_callback().
"""
import logging, os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

# MODIFICAR: personalizar las opciones del menú
def build_menu():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001F4CA Opción 1", callback_data="opt1"),
         InlineKeyboardButton("\U0001F3AE Opción 2", callback_data="opt2")],
        [InlineKeyboardButton("\U0001F4A1 Opción 3", callback_data="opt3")],
        [InlineKeyboardButton("\U0001F6AA Cerrar", callback_data="close")],
    ])

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Elige una opción:", reply_markup=build_menu())

async def menu(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("\U0001F4CB Menú principal:", reply_markup=build_menu())

async def button_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    # MODIFICAR: agregar más casos según tus callback_data
    responses = {
        "opt1": "\U0001F4CA Seleccionaste la Opción 1",
        "opt2": "\U0001F3AE Seleccionaste la Opción 2",
        "opt3": "\U0001F4A1 Seleccionaste la Opción 3",
        "close": "\U0001F6AA Menú cerrado.",
    }
    await query.edit_message_text(responses.get(query.data, "Opción desconocida."))

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("menu", menu))
    app.add_handler(CallbackQueryHandler(button_callback))
    app.run_polling()

if __name__ == "__main__":
    main()
