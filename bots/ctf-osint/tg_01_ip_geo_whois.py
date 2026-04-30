#!/usr/bin/env python3
"""
tg_01_ip_geo_whois.py — CTF/OSINT: IP/Geo/Whois para Telegram
MODIFICAR: usar ipinfo.io con token para más requests en producción.
pip install python-telegram-bot requests
"""
import logging, os, ipaddress
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

def get_ip_info(ip: str) -> dict:
    # MODIFICAR: agregar token de ipinfo.io para más requests
    try:
        return requests.get(f"https://ipapi.co/{ip}/json/", timeout=8).json()
    except Exception as e:
        return {"error": str(e)}

def simple_whois(domain: str) -> str:
    try:
        import whois
        info = whois.whois(domain)
        return f"Registrar: {info.registrar}\nCreado: {info.creation_date}\nExpira: {info.expiration_date}"
    except ImportError:
        return "Instala: pip install python-whois"
    except Exception as e:
        return f"Error: {e}"

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F50D IP/Geo/Whois Bot\n\n/ip <IP>\n/whois <dominio>\n/cidr <red/mask>"
    )

async def ip_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /ip 8.8.8.8")
        return
    info = get_ip_info(ctx.args[0])
    if "error" in info:
        await update.message.reply_text(f"Error: {info['error']}")
        return
    await update.message.reply_text(
        f"\U0001F310 IP: {ctx.args[0]}\n"
        f"País: {info.get('country_name','?')} ({info.get('country','?')})\n"
        f"Ciudad: {info.get('city','?')}\nISP: {info.get('org','?')}\n"
        f"ASN: {info.get('asn','?')}\nLat/Lon: {info.get('latitude','?')}, {info.get('longitude','?')}"
    )

async def whois_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /whois google.com")
        return
    await update.message.reply_text(f"\U0001F4CB WHOIS {ctx.args[0]}:\n{simple_whois(ctx.args[0])[:3000]}")

async def cidr_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Uso: /cidr 192.168.1.0/24")
        return
    try:
        net = ipaddress.ip_network(ctx.args[0], strict=False)
        await update.message.reply_text(
            f"\U0001F5A7 Red: {net}\nBroadcast: {net.broadcast_address}\n"
            f"Máscara: {net.netmask}\nTotal IPs: {net.num_addresses}"
        )
    except ValueError as e:
        await update.message.reply_text(f"CIDR inválido: {e}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ip", ip_cmd))
    app.add_handler(CommandHandler("whois", whois_cmd))
    app.add_handler(CommandHandler("cidr", cidr_cmd))
    app.run_polling()

if __name__ == "__main__":
    main()
