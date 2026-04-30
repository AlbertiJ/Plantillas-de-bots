# bots/ctf-osint/tg_04_encoding_knife.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot Telegram — Encoding Swiss Knife (b64, hex, ROT13, URL, JWT, Morse)
# Ejecución: python bots/ctf-osint/tg_04_encoding_knife.py
# IDEA FUTURA: auto-detectar el encoding de un string desconocido
# IDEA FUTURA: modo brute-force de ROT (1-25)

import base64, codecs, json, urllib.parse
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env

MORSE = {
    'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
    'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
    'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','0':'-----','1':'.----','2':'..---',
    '3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
}


def decode_jwt_unsafe(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {"error": "No es un JWT válido (debe tener 3 partes)"}
        def _decode(s):
            s += "=" * (-len(s) % 4)
            return json.loads(base64.urlsafe_b64decode(s))
        return {"header": _decode(parts[0]), "payload": _decode(parts[1])}
    except Exception as e:
        return {"error": str(e)}


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Encoding Swiss Knife\n\n"
        "/b64enc /b64dec <texto>\n"
        "/hex /unhex <texto>\n"
        "/rot13 <texto>\n"
        "/url /unurl <texto>\n"
        "/jwt <token>\n"
        "/morse <texto>\n"
        "/bin <texto>\n\n"
        "⚠️ Solo uso educativo y CTF."
    )


async def b64enc(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /b64enc <texto>"); return
    await update.message.reply_text(f"Base64:\n{base64.b64encode(' '.join(ctx.args).encode()).decode()}")

async def b64dec(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /b64dec <base64>"); return
    try: await update.message.reply_text(f"Decoded:\n{base64.b64decode(ctx.args[0]).decode('utf-8', errors='replace')}")
    except Exception as e: await update.message.reply_text(f"Error: {e}")

async def hex_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /hex <texto>"); return
    await update.message.reply_text(f"HEX:\n{' '.join(ctx.args).encode().hex()}")

async def unhex_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /unhex <hex>"); return
    try: await update.message.reply_text(f"Texto:\n{bytes.fromhex(ctx.args[0]).decode('utf-8', errors='replace')}")
    except Exception as e: await update.message.reply_text(f"Error: {e}")

async def rot13_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /rot13 <texto>"); return
    await update.message.reply_text(f"ROT13:\n{codecs.encode(' '.join(ctx.args), 'rot_13')}")

async def url_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /url <texto>"); return
    await update.message.reply_text(f"URL encoded:\n{urllib.parse.quote(' '.join(ctx.args))}")

async def unurl_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /unurl <texto>"); return
    await update.message.reply_text(f"URL decoded:\n{urllib.parse.unquote(' '.join(ctx.args))}")

async def jwt_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /jwt <token>"); return
    result = decode_jwt_unsafe(ctx.args[0])
    await update.message.reply_text(f"JWT:\n{json.dumps(result, indent=2, ensure_ascii=False)[:2000]}")

async def morse_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /morse <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"Morse:\n{' '.join(MORSE.get(c.upper(), '?') for c in text if c != ' ')}")

async def bin_cmd(update, ctx):
    if not ctx.args: await update.message.reply_text("Uso: /bin <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"Binario:\n{' '.join(format(ord(c), '08b') for c in text)[:2000]}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    for name, handler in [
        ("start",start),("b64enc",b64enc),("b64dec",b64dec),("hex",hex_cmd),
        ("unhex",unhex_cmd),("rot13",rot13_cmd),("url",url_cmd),("unurl",unurl_cmd),
        ("jwt",jwt_cmd),("morse",morse_cmd),("bin",bin_cmd),
    ]:
        app.add_handler(CommandHandler(name, handler))
    logger.info("Encoding Knife iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
