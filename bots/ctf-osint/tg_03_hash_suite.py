#!/usr/bin/env python3
"""
tg_03_hash_suite.py — CTF: Suite de hashes para Telegram
MODIFICAR: agregar más algoritmos en calculate_hashes() (sha3_256, blake2b, etc.)
"""
import logging, os, hashlib, re
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

def calculate_hashes(text: str) -> dict:
    # MODIFICAR: agregar más algoritmos
    data = text.encode()
    return {"MD5": hashlib.md5(data).hexdigest(), "SHA1": hashlib.sha1(data).hexdigest(),
            "SHA256": hashlib.sha256(data).hexdigest(), "SHA512": hashlib.sha512(data).hexdigest()}

def identify_hash(h: str) -> str:
    h = h.strip()
    patterns = {32:"MD5 (128 bits)", 40:"SHA1 (160 bits)", 56:"SHA224 (224 bits)",
                64:"SHA256 (256 bits)", 96:"SHA384 (384 bits)", 128:"SHA512 (512 bits)"}
    if not re.match(r"^[0-9a-fA-F]+$", h):
        return "No parece un hash hexadecimal válido"
    return patterns.get(len(h), f"Hash desconocido (longitud {len(h)})")

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F511 Hash Suite\n\n/hash <texto>\n/identify <hash>\n/crack <md5>"
    )

async def hash_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /hash texto a hashear")
        return
    text   = " ".join(ctx.args)
    hashes = calculate_hashes(text)
    await update.message.reply_text(
        f"\U0001F511 Hashes de: {text[:50]}\n" + "\n".join(f"{k}: {v}" for k,v in hashes.items())
    )

async def identify_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        return
    await update.message.reply_text(f"\U0001F50D Tipo: {identify_hash(ctx.args[0])}")

async def crack_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        return
    target = ctx.args[0].lower().strip()
    # MODIFICAR: ampliar el diccionario o usar una API de rainbow tables
    common = ["password","123456","admin","root","qwerty","letmein","abc123","hello","test","1234"]
    for word in common:
        if hashlib.md5(word.encode()).hexdigest() == target:
            await update.message.reply_text(f"\U0001F513 Crackeado: '{word}'")
            return
    await update.message.reply_text("\U0001F512 No encontrado. Probá hashcat o crackstation.net")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("hash", hash_cmd))
    app.add_handler(CommandHandler("identify", identify_cmd))
    app.add_handler(CommandHandler("crack", crack_cmd))
    app.run_polling()

if __name__ == "__main__":
    main()
