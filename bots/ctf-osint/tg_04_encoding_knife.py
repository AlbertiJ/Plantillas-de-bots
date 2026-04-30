#!/usr/bin/env python3
"""
tg_04_encoding_knife.py — CTF: Navaja de Encodings para Telegram
MODIFICAR: agregar más encodings en los handlers.
"""
import logging, os, base64, urllib.parse, codecs
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

MORSE_MAP = {
    "A":".-","B":"-...","C":"-.-.","D":"-..","E":".","F":"..-.","G":"--.","H":"....","I":"..","J":".---",
    "K":"-.-","L":".-..","M":"--","N":"-.","O":"---","P":".--.","Q":"--.-","R":".-.","S":"...","T":"-",
    "U":"..-","V":"...-","W":".--","X":"-..-","Y":"-.--","Z":"--..","0":"-----","1":".----","2":"..---",
    "3":"...--","4":"....-","5":".....","6":"-....","7":"--...","8":"---..","9":"----.",".":" ",
}

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F52A Navaja de Encodings\n\n"
        "/b64e <texto>\n/b64d <b64>\n/rot13 <texto>\n/morse <texto>\n/hex <texto>\n/url <texto>"
    )

async def b64e(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args: return
    await update.message.reply_text(f"\U0001F4E6 Base64:\n{base64.b64encode(' '.join(ctx.args).encode()).decode()}")

async def b64d(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args: return
    try:
        await update.message.reply_text(f"\U0001F4E6 Decodificado:\n{base64.b64decode(' '.join(ctx.args)).decode()}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")

async def rot13(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args: return
    await update.message.reply_text(f"\U0001F501 ROT13:\n{codecs.encode(' '.join(ctx.args), 'rot_13')}")

async def morse(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args: return
    text   = " ".join(ctx.args).upper()
    result = " ".join(MORSE_MAP.get(c, "?" if c != " " else "/") for c in text)
    await update.message.reply_text(f"\U0001F4E1 Morse:\n{result}")

async def hex_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args: return
    await update.message.reply_text(f"\U0001F522 Hex:\n{' '.join(ctx.args).encode().hex()}")

async def url_encode(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args: return
    await update.message.reply_text(f"\U0001F517 URL encoded:\n{urllib.parse.quote(' '.join(ctx.args))}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("b64e", b64e))
    app.add_handler(CommandHandler("b64d", b64d))
    app.add_handler(CommandHandler("rot13", rot13))
    app.add_handler(CommandHandler("morse", morse))
    app.add_handler(CommandHandler("hex", hex_cmd))
    app.add_handler(CommandHandler("url", url_encode))
    app.run_polling()

if __name__ == "__main__":
    main()
