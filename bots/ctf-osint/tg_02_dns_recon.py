#!/usr/bin/env python3
"""
tg_02_dns_recon.py — CTF/OSINT: Reconocimiento DNS completo para Telegram
MODIFICAR: agregar más tipos de registro o resolvers alternativos en dns_lookup().
pip install python-telegram-bot dnspython
"""
import logging, os
import dns.resolver
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

def dns_lookup(domain: str, rtype: str) -> list[str]:
    # MODIFICAR: agregar resolvers alternativos (8.8.8.8, 1.1.1.1)
    try:
        return [str(r) for r in dns.resolver.resolve(domain, rtype, lifetime=8)]
    except Exception as e:
        return [f"Sin registros {rtype}: {e}"]

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F50E DNS Recon Bot\n\n"
        "/dns <dominio> — Todos los registros\n"
        "/mx <dominio> — Servidores de correo\n"
        "/sub <dominio> — Subdominios comunes"
    )

async def dns_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /dns example.com")
        return
    domain  = ctx.args[0]
    results = []
    for rtype in ["A", "AAAA", "MX", "NS", "TXT", "SOA"]:
        records = dns_lookup(domain, rtype)
        results.append(f"{rtype}:\n" + "\n".join(f"  {r}" for r in records))
    await update.message.reply_text(f"DNS {domain}:\n\n" + "\n\n".join(results))

async def mx_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /mx gmail.com")
        return
    records = dns_lookup(ctx.args[0], "MX")
    await update.message.reply_text(f"\U0001F4E7 MX {ctx.args[0]}:\n" + "\n".join(records))

async def sub_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /sub example.com")
        return
    domain = ctx.args[0]
    # MODIFICAR: agregar más subdominios según el caso de uso
    SUBS = ["www","mail","ftp","api","dev","staging","admin","vpn","ns1","ns2","smtp","pop"]
    found = []
    for sub in SUBS:
        records = dns_lookup(f"{sub}.{domain}", "A")
        if not records[0].startswith("Sin registros"):
            found.append(f"{sub}.{domain} -> {records[0]}")
    msg = "\n".join(found) if found else "No se encontraron subdominios comunes."
    await update.message.reply_text(f"\U0001F310 Subdominios de {domain}:\n{msg}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("dns", dns_cmd))
    app.add_handler(CommandHandler("mx", mx_cmd))
    app.add_handler(CommandHandler("sub", sub_cmd))
    app.run_polling()

if __name__ == "__main__":
    main()
