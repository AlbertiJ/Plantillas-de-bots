# bots/ctf-osint/tg_02_dns_recon.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot Telegram — DNS Recon (A, MX, NS, TXT, CNAME, SOA)
# Ejecución: python bots/ctf-osint/tg_02_dns_recon.py
# IDEA FUTURA: detección de subdominios con wordlist configurable

import dns.resolver
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env
RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]


def resolve_records(domain: str, rtype: str) -> list[str]:
    try:
        answers = dns.resolver.resolve(domain, rtype, lifetime=8)
        return [str(r) for r in answers]
    except dns.resolver.NoAnswer:
        return []
    except dns.resolver.NXDOMAIN:
        return ["NXDOMAIN — dominio no encontrado"]
    except Exception as e:
        return [f"Error: {e}"]


def full_recon(domain: str) -> str:
    lines = [f"DNS Recon — {domain}\n"]
    for rtype in RECORD_TYPES:
        records = resolve_records(domain, rtype)
        if records:
            lines.append(f"[{rtype}]")
            for r in records[:5]:  # MODIFICAR: límite de resultados por tipo
                lines.append(f"  {r}")
    return "\n".join(lines) if len(lines) > 1 else f"Sin registros DNS para {domain}"


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Bot DNS Recon\n\n"
        "/dns <dominio>   — Recon completo\n"
        "/a <dominio>     — Registros A\n"
        "/mx <dominio>    — Registros MX\n"
        "/txt <dominio>   — Registros TXT\n\n"
        "⚠️ Solo entornos autorizados."
    )


async def dns_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /dns <dominio>")
        return
    logger.info(f"DNS full recon: {ctx.args[0]}")
    await update.message.reply_text(full_recon(ctx.args[0])[:4000])


async def record_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text(f"Uso: /{ctx.command} <dominio>")
        return
    rtype = ctx.command.upper()
    records = resolve_records(ctx.args[0], rtype)
    await update.message.reply_text(f"[{rtype}] {ctx.args[0]}\n" + ("\n".join(records) or "Sin resultados"))


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("dns", dns_cmd))
    for rtype in ["a", "mx", "txt", "ns", "cname"]:  # MODIFICAR: agregar/quitar tipos
        app.add_handler(CommandHandler(rtype, record_cmd))
    logger.info("Bot DNS Recon iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
