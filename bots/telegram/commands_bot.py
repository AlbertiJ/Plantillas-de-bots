#!/usr/bin/env python3
"""
commands_bot.py — Bot de Comandos personalizados para Telegram
MODIFICAR: agregar nuevos comandos con add_handler() en main().
"""
import logging, os, platform, datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F916 Bot de comandos activo.\n\n"
        "Comandos:\n/start /help /info /ping"
    )

async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "/start\n/help\n/info — Info del sistema\n/ping — Verificar respuesta"
    )

async def info(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    # MODIFICAR: agregar información personalizada de tu sistema
    text = (
        f"\U0001F5A5 Sistema: {platform.system()} {platform.release()}\n"
        f"\U0001F40D Python: {platform.python_version()}\n"
        f"\U0001F554 Hora: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    await update.message.reply_text(text)

async def ping(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("\U0001F3D3 Pong!")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("info", info))
    app.add_handler(CommandHandler("ping", ping))
    app.run_polling()

if __name__ == "__main__":
    main()
