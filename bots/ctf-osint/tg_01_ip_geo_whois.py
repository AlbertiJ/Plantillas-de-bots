# bots/ctf-osint/tg_01_ip_geo_whois.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram — IP Lookup + GeoIP + WHOIS
# Ejecución: python bots/ctf-osint/tg_01_ip_geo_whois.py
#         o: python -m bots.ctf-osint.tg_01_ip_geo_whois
# IDEA FUTURA: agregar mapa interactivo con coordenadas del IP
# IDEA FUTURA: caché de consultas para evitar rate limits
# ─────────────────────────────────────────────────────────────

import requests
import whois
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
# MODIFICAR: nombre de la variable en tu .env
TOKEN = require_env("TELEGRAM_BOT_TOKEN")

DISCLAIMER = (
    "⚠️ Solo para uso educativo, CTF y auditorías en entornos autorizados.\n"
    "Nunca uses esto contra sistemas sin permiso explícito del propietario."
)


def lookup_ip(target: str) -> str:
    """Consulta GeoIP usando ip-api.com (gratuito, sin clave)."""
    try:
        # MODIFICAR: podés usar ipinfo.io con API key para más datos
        r = requests.get(
            f"http://ip-api.com/json/{target}?fields=status,message,country,regionName,city,isp,org,as,query",
            timeout=10
        )
        data = r.json()
        if data.get("status") != "success":
            return f"Error: {data.get('message', 'sin respuesta')}"
        return (
            f"IP: {data['query']}\n"
            f"País: {data['country']}\n"
            f"Región: {data['regionName']}\n"
            f"Ciudad: {data['city']}\n"
            f"ISP: {data['isp']}\n"
            f"Org: {data['org']}\n"
            f"AS: {data['as']}"
        )
    except Exception as e:
        logger.error(f"lookup_ip error: {e}")
        return f"Error consultando IP: {e}"


def lookup_whois(domain: str) -> str:
    """WHOIS de un dominio. IDEA FUTURA: parsear fechas de expiración."""
    try:
        w = whois.whois(domain)
        created = str(w.creation_date)[:10] if w.creation_date else "N/D"
        expires = str(w.expiration_date)[:10] if w.expiration_date else "N/D"
        registrar = w.registrar or "N/D"
        nameservers = ", ".join(w.name_servers[:3]) if w.name_servers else "N/D"
        return (
            f"Dominio: {domain}\n"
            f"Registrar: {registrar}\n"
            f"Creado: {created}\n"
            f"Expira: {expires}\n"
            f"NS: {nameservers}"
        )
    except Exception as e:
        logger.error(f"lookup_whois error: {e}")
        return f"Error en WHOIS: {e}"


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Bot CTF/OSINT — IP Lookup + WHOIS\n\n"
        "/ip <ip_o_dominio>    — GeoIP lookup\n"
        "/whois <dominio>      — WHOIS del dominio\n\n"
        + DISCLAIMER
    )


async def ip_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /ip <ip_o_dominio>")
        return
    target = ctx.args[0]
    logger.info(f"IP lookup: {target}")
    await update.message.reply_text(f"GeoIP — {target}\n\n{lookup_ip(target)}")


async def whois_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /whois <dominio>")
        return
    domain = ctx.args[0]
    logger.info(f"WHOIS: {domain}")
    await update.message.reply_text(f"WHOIS — {domain}\n\n{lookup_whois(domain)}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ip", ip_cmd))
    app.add_handler(CommandHandler("whois", whois_cmd))
    logger.info("Bot IP/WHOIS iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
