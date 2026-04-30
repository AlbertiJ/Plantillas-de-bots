#!/usr/bin/env python3
"""
conv_handler_bot.py — Bot con flujo de conversación multi-paso
MODIFICAR: agregar más estados en STATES y sus handlers correspondientes.
"""
import logging, os
from telegram import Update
from telegram.ext import (Application, CommandHandler, MessageHandler,
    ConversationHandler, filters, ContextTypes)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

# MODIFICAR: definir tus propios estados
NOMBRE, EMAIL, CONFIRMAR = range(3)

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("\U0001F44B Hola!\n/register — Iniciar registro\n/cancel — Cancelar")

async def register(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("¿Cuál es tu nombre?")
    return NOMBRE

async def get_nombre(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.user_data["nombre"] = update.message.text
    await update.message.reply_text(f"Perfecto, {ctx.user_data['nombre']}. ¿Cuál es tu email?")
    return EMAIL

async def get_email(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    # MODIFICAR: agregar validación de email
    ctx.user_data["email"] = update.message.text
    await update.message.reply_text(
        f"\U0001F4CB Confirmar:\nNombre: {ctx.user_data['nombre']}\n"
        f"Email: {ctx.user_data['email']}\n\nRespondé SI o NO."
    )
    return CONFIRMAR

async def confirmar(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    if update.message.text.strip().upper() == "SI":
        # MODIFICAR: guardar en tu base de datos aquí
        await update.message.reply_text(
            f"\U00002705 Registro completo!\nNombre: {ctx.user_data['nombre']}\nEmail: {ctx.user_data['email']}"
        )
    else:
        await update.message.reply_text("\U0000274C Registro cancelado.")
    ctx.user_data.clear()
    return ConversationHandler.END

async def cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.user_data.clear()
    await update.message.reply_text("\U0001F6D1 Operación cancelada.")
    return ConversationHandler.END

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    conv = ConversationHandler(
        entry_points=[CommandHandler("register", register)],
        states={
            NOMBRE:    [MessageHandler(filters.TEXT & ~filters.COMMAND, get_nombre)],
            EMAIL:     [MessageHandler(filters.TEXT & ~filters.COMMAND, get_email)],
            CONFIRMAR: [MessageHandler(filters.TEXT & ~filters.COMMAND, confirmar)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
    app.add_handler(CommandHandler("start", start))
    app.add_handler(conv)
    app.run_polling()

if __name__ == "__main__":
    main()
