#!/usr/bin/env python3
"""
group_admin_bot.py — Bot administrador de grupos Telegram
MODIFICAR: personalizar WELCOME_MSG y RULES para tu grupo.
Requiere: TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_ID
"""
import logging, os
from telegram import Update, ChatPermissions
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN    = os.getenv("TELEGRAM_BOT_TOKEN", "")
OWNER_ID = int(os.getenv("TELEGRAM_OWNER_ID", "0"))
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# MODIFICAR: personalizar bienvenida y reglas
WELCOME_MSG = "Bienvenido/a {name}! \U0001F44B Leé las reglas con /reglas."
RULES       = "\U0001F4DC Reglas:\n1. Respeto mutuo\n2. Sin spam\n3. Tema relevante"

def is_admin(uid: int) -> bool:
    return uid == OWNER_ID

async def welcome(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    for member in update.message.new_chat_members:
        if not member.is_bot:
            await update.message.reply_text(WELCOME_MSG.format(name=member.first_name))

async def reglas(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(RULES)

async def mute(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("\U0001F512 Solo el administrador puede usar este comando.")
        return
    if not update.message.reply_to_message:
        await update.message.reply_text("Respondé al mensaje del usuario a silenciar.")
        return
    target = update.message.reply_to_message.from_user
    await ctx.bot.restrict_chat_member(update.effective_chat.id, target.id,
        ChatPermissions(can_send_messages=False))
    await update.message.reply_text(f"\U0001F507 {target.first_name} fue silenciado.")

async def unmute(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id) or not update.message.reply_to_message:
        return
    target = update.message.reply_to_message.from_user
    await ctx.bot.restrict_chat_member(update.effective_chat.id, target.id,
        ChatPermissions(can_send_messages=True, can_send_media_messages=True))
    await update.message.reply_text(f"\U0001F50A {target.first_name} puede hablar nuevamente.")

async def kick(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id) or not update.message.reply_to_message:
        return
    target = update.message.reply_to_message.from_user
    await ctx.bot.ban_chat_member(update.effective_chat.id, target.id)
    await update.message.reply_text(f"\U0001F6AB {target.first_name} fue expulsado.")

async def warn(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id) or not update.message.reply_to_message:
        return
    target = update.message.reply_to_message.from_user
    await update.message.reply_text(f"\U000026A0 {target.first_name}: advertencia oficial.")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    if not OWNER_ID:
        raise ValueError("TELEGRAM_OWNER_ID no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("reglas", reglas))
    app.add_handler(CommandHandler("mute", mute))
    app.add_handler(CommandHandler("unmute", unmute))
    app.add_handler(CommandHandler("kick", kick))
    app.add_handler(CommandHandler("warn", warn))
    app.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, welcome))
    logger.info("Group admin bot iniciado (owner=%d)...", OWNER_ID)
    app.run_polling()

if __name__ == "__main__":
    main()
