#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot de Conversación Multi-Paso – Telegram
==========================================
Implementa flujos de conversación con múltiples pasos y estados.
Ejemplo: registro de usuario con nombre, edad e email.

Instalación:
    pip install python-telegram-bot python-dotenv

Variables de entorno (.env):
    TELEGRAM_BOT_TOKEN  – Token del bot (obligatorio)
"""

import os
import logging
from dotenv import load_dotenv
from telegram import Update, ReplyKeyboardRemove
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    ConversationHandler, ContextTypes, filters
)

load_dotenv()

# ── MODIFICAR ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")  # MODIFICAR: pegá tu token
GREETING = "¡Hola! Voy a registrarte en el sistema."       # MODIFICAR: mensaje inicial
# ───────────────────────────────────────────────────────────────────────────────

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)

# Estados de la conversación
NOMBRE, EDAD, EMAIL = range(3)


async def cmd_register(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Inicia el flujo de registro."""
    await update.message.reply_text(
        f"{GREETING}\n\n¿Cuál es tu nombre completo?",
        reply_markup=ReplyKeyboardRemove()
    )
    return NOMBRE


async def step_nombre(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Paso 1: recibe el nombre."""
    ctx.user_data["nombre"] = update.message.text
    await update.message.reply_text(f"¡Hola, {ctx.user_data['nombre']}! ¿Cuántos años tenés?")
    return EDAD


async def step_edad(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Paso 2: recibe la edad."""
    text = update.message.text
    if not text.isdigit() or not (1 <= int(text) <= 120):
        await update.message.reply_text("Por favor ingresá una edad válida (número entre 1 y 120).")
        return EDAD
    ctx.user_data["edad"] = int(text)
    await update.message.reply_text("¿Cuál es tu email?")
    return EMAIL


async def step_email(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Paso 3: recibe el email y finaliza el registro."""
    email = update.message.text
    if "@" not in email or "." not in email:
        await update.message.reply_text("Email inválido. Intentá de nuevo.")
        return EMAIL
    ctx.user_data["email"] = email
    data = ctx.user_data
    await update.message.reply_text(
        f"✅ Registro completado:\n"
        f"👤 Nombre: {data['nombre']}\n"
        f"🎂 Edad:   {data['edad']} años\n"
        f"📧 Email:  {data['email']}\n\n"
        f"¡Bienvenido/a al sistema!"
    )
    # MODIFICAR: aquí podés guardar los datos en BD, enviar email, etc.
    return ConversationHandler.END


async def cmd_cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancela el flujo de conversación."""
    await update.message.reply_text("❌ Registro cancelado.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🤖 Bot de Conversación Multi-Paso\n\n"
        "Comandos:\n"
        "/register – Iniciar flujo de registro\n"
        "/cancel   – Cancelar conversación actual"
    )


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("ERROR: Definí TELEGRAM_BOT_TOKEN en el archivo .env")
        return
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    conv = ConversationHandler(
        entry_points=[CommandHandler("register", cmd_register)],
        states={
            NOMBRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, step_nombre)],
            EDAD:   [MessageHandler(filters.TEXT & ~filters.COMMAND, step_edad)],
            EMAIL:  [MessageHandler(filters.TEXT & ~filters.COMMAND, step_email)],
        },
        fallbacks=[CommandHandler("cancel", cmd_cancel)],
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(conv)
    print("Conversation Handler Bot iniciado. Ctrl+C para detener.")
    app.run_polling()


if __name__ == "__main__":
    main()
