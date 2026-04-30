# bots/ctf-osint/tg_03_hash_suite.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot Telegram — Hash Suite (generar + identificar)
# Ejecución: python bots/ctf-osint/tg_03_hash_suite.py
# IDEA FUTURA: integrar con haveibeenpwned.com para verificar leaks

import hashlib, re
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env


def all_hashes(text: str) -> dict:
    enc = text.encode("utf-8")
    return {
        "MD5":      hashlib.md5(enc).hexdigest(),
        "SHA1":     hashlib.sha1(enc).hexdigest(),
        "SHA256":   hashlib.sha256(enc).hexdigest(),
        "SHA512":   hashlib.sha512(enc).hexdigest(),
        "SHA3-256": hashlib.sha3_256(enc).hexdigest(),
    }


def identify_hash(h: str) -> str:
    h = h.strip()
    if not re.match(r'^[a-fA-F0-9]+$', h):
        return "No parece un hash hexadecimal"
    return {32:"MD5",40:"SHA-1",56:"SHA-224",64:"SHA-256",96:"SHA-384",128:"SHA-512"}.get(len(h), f"Desconocido ({len(h)} chars)")


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Bot Hash Suite\n\n"
        "/hash <texto>     — Todos los hashes\n"
        "/md5 <texto>      — Solo MD5\n"
        "/sha256 <texto>   — Solo SHA-256\n"
        "/identify <hash>  — Identificar tipo\n\n"
        "⚠️ Solo uso educativo y CTF."
    )


async def hash_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /hash <texto>"); return
    text = " ".join(ctx.args)
    h = all_hashes(text)
    lines = [f"Hashes de: {text[:40]}\n"] + [f"{k}:\n{v}" for k,v in h.items()]
    await update.message.reply_text("\n".join(lines))


async def identify_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /identify <hash>"); return
    await update.message.reply_text(f"Tipo probable: {identify_hash(ctx.args[0])}")


async def single_hash_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text(f"Uso: /{ctx.command} <texto>"); return
    h = all_hashes(" ".join(ctx.args))
    val = h.get(ctx.command.upper(), h["SHA256"])
    await update.message.reply_text(f"{ctx.command.upper()}: {val}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("hash", hash_cmd))
    app.add_handler(CommandHandler("md5", single_hash_cmd))
    app.add_handler(CommandHandler("sha256", single_hash_cmd))
    app.add_handler(CommandHandler("identify", identify_cmd))
    logger.info("Bot Hash Suite iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
