#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot de Administración de Grupos – Telegram
==========================================
Plantilla de bot para moderar grupos de Telegram.
Funciones: bienvenida automática, silenciar, expulsar y registrar advertencias.

Instalación:
    pip install python-telegram-bot python-dotenv

Variables de entorno (.env):
    TELEGRAM_BOT_TOKEN  – Token del bot (obligatorio)
    TELEGRAM_OWNER_ID   – Tu ID de usuario Telegram (para comandos de admin)
"""

import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update, ChatPermissions
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    ChatMemberHandler, ContextTypes, filters
)

load_dotenv()

# ── MODIFICAR ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")  # MODIFICAR: pegá tu token
OWNER_ID           = int(os.getenv("TELEGRAM_OWNER_ID", "0"))  # MODIFICAR: tu ID de Telegram
WELCOME_MESSAGE    = "¡Bienvenido/a al grupo, {name}! 👋"  # MODIFICAR: mensaje de bienvenida
LOG_CHANNEL_ID     = int(os.getenv("LOG_CHANNEL_ID", "0"))  # MODIFICAR: ID del canal de logs (0 = desactivado)
# ───────────────────────────────────────────────────────────────────────────────

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# Registro de advertencias {user_id: count}
warnings: dict[int, int] = {}


async def on_new_member(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Mensaje de bienvenida cuando alguien entra al grupo."""
    for member in update.message.new_chat_members:
        name = member.full_name
        await update.message.reply_text(WELCOME_MESSAGE.format(name=name))
        logger.info(f"Nuevo miembro: {name} ({member.id})")


async def cmd_mute(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Silencia a un usuario. Uso: /mute @usuario [minutos]"""
    if update.effective_user.id != OWNER_ID:
        await update.message.reply_text("⛔ Solo el propietario puede usar este comando.")
        return
    if not update.message.reply_to_message:
        await update.message.reply_text("Respondé el mensaje del usuario a silenciar.")
        return
    user = update.message.reply_to_message.from_user
    duration = int(ctx.args[0]) if ctx.args else 10  # minutos por defecto
    until = datetime.now().timestamp() + duration * 60
    perms = ChatPermissions(can_send_messages=False)
    await ctx.bot.restrict_chat_member(update.effective_chat.id, user.id, perms, until_date=until)
    await update.message.reply_text(f"🔇 {user.full_name} silenciado por {duration} minutos.")


async def cmd_unmute(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Quita el silencio. Uso: /unmute @usuario"""
    if update.effective_user.id != OWNER_ID:
        return
    if not update.message.reply_to_message:
        await update.message.reply_text("Respondé el mensaje del usuario.")
        return
    user = update.message.reply_to_message.from_user
    perms = ChatPermissions(can_send_messages=True, can_send_media_messages=True)
    await ctx.bot.restrict_chat_member(update.effective_chat.id, user.id, perms)
    await update.message.reply_text(f"🔊 {user.full_name} puede hablar nuevamente.")


async def cmd_kick(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Expulsa a un usuario del grupo. Uso: /kick @usuario"""
    if update.effective_user.id != OWNER_ID:
        return
    if not update.message.reply_to_message:
        await update.message.reply_text("Respondé el mensaje del usuario a expulsar.")
        return
    user = update.message.reply_to_message.from_user
    await ctx.bot.ban_chat_member(update.effective_chat.id, user.id)
    await ctx.bot.unban_chat_member(update.effective_chat.id, user.id)
    await update.message.reply_text(f"👢 {user.full_name} fue expulsado.")


async def cmd_warn(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Advierte a un usuario. A 3 advertencias se lo expulsa automáticamente."""
    if update.effective_user.id != OWNER_ID:
        return
    if not update.message.reply_to_message:
        await update.message.reply_text("Respondé el mensaje del usuario a advertir.")
        return
    user = update.message.reply_to_message.from_user
    warnings[user.id] = warnings.get(user.id, 0) + 1
    count = warnings[user.id]
    await update.message.reply_text(f"⚠️ {user.full_name}: advertencia {count}/3.")
    if count >= 3:
        await ctx.bot.ban_chat_member(update.effective_chat.id, user.id)
        await update.message.reply_text(f"🚫 {user.full_name} expulsado por acumular 3 advertencias.")
        warnings.pop(user.id, None)


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🤖 Bot de Admin activo.\n"
        "Comandos disponibles:\n"
        "/mute [minutos] – Silenciar (respondé un mensaje)\n"
        "/unmute – Quitar silencio\n"
        "/kick – Expulsar\n"
        "/warn – Advertir (3 = expulsión)"
    )


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("ERROR: Definí TELEGRAM_BOT_TOKEN en el archivo .env")
        return
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("mute", cmd_mute))
    app.add_handler(CommandHandler("unmute", cmd_unmute))
    app.add_handler(CommandHandler("kick", cmd_kick))
    app.add_handler(CommandHandler("warn", cmd_warn))
    app.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, on_new_member))
    print("Bot de Admin iniciado. Ctrl+C para detener.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
