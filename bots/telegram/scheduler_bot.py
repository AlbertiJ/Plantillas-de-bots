#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot Programador / Scheduler – Telegram
=======================================
Envía mensajes programados y recordatorios automáticos.

Instalación:
    pip install python-telegram-bot python-dotenv apscheduler

Variables de entorno (.env):
    TELEGRAM_BOT_TOKEN  – Token del bot (obligatorio)
"""

import os
import logging
from datetime import datetime, time as dtime
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

# ── MODIFICAR ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")  # MODIFICAR: pegá tu token
TIMEZONE = "America/Argentina/Buenos_Aires"  # MODIFICAR: tu zona horaria
# ───────────────────────────────────────────────────────────────────────────────

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# Trabajos programados {job_name: job}
jobs: dict[str, object] = {}


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "⏰ Bot Programador activo.\n\n"
        "Comandos:\n"
        "/schedule <HH:MM> <mensaje> – Programa un mensaje diario\n"
        "/once <segundos> <mensaje> – Enviar una vez después de N segundos\n"
        "/list – Ver trabajos activos\n"
        "/cancel <nombre> – Cancelar un trabajo\n"
        f"\nZona horaria: {TIMEZONE}"
    )


async def cmd_schedule(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Programa un mensaje diario. Uso: /schedule 08:30 Buenos días!"""
    if not ctx.args or len(ctx.args) < 2:
        await update.message.reply_text("Uso: /schedule HH:MM tu mensaje aquí")
        return
    time_str = ctx.args[0]
    message = " ".join(ctx.args[1:])
    try:
        hour, minute = map(int, time_str.split(":"))
    except ValueError:
        await update.message.reply_text("Formato de hora inválido. Usá HH:MM (ej: 08:30)")
        return

    chat_id = update.effective_chat.id
    job_name = f"daily_{chat_id}_{time_str.replace(':','')}"

    # Cancelar si ya existe
    existing = ctx.job_queue.get_jobs_by_name(job_name)
    for j in existing:
        j.schedule_removal()

    async def send_msg(context: ContextTypes.DEFAULT_TYPE) -> None:
        await context.bot.send_message(chat_id=chat_id, text=f"⏰ Recordatorio: {message}")

    ctx.job_queue.run_daily(send_msg, time=dtime(hour=hour, minute=minute), name=job_name)
    await update.message.reply_text(f"✅ Programado diariamente a las {time_str}:\n"{message}"")


async def cmd_once(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Envía un mensaje después de N segundos. Uso: /once 30 Hola!"""
    if not ctx.args or len(ctx.args) < 2:
        await update.message.reply_text("Uso: /once <segundos> tu mensaje")
        return
    try:
        delay = int(ctx.args[0])
    except ValueError:
        await update.message.reply_text("El primer argumento debe ser un número de segundos.")
        return
    message = " ".join(ctx.args[1:])
    chat_id = update.effective_chat.id

    async def send_once(context: ContextTypes.DEFAULT_TYPE) -> None:
        await context.bot.send_message(chat_id=chat_id, text=f"🔔 {message}")

    ctx.job_queue.run_once(send_once, when=delay)
    await update.message.reply_text(f"✅ Mensaje programado en {delay} segundos.")


async def cmd_list(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Lista todos los trabajos activos."""
    jobs_list = ctx.job_queue.jobs()
    if not jobs_list:
        await update.message.reply_text("No hay trabajos programados.")
        return
    lines = [f"• {j.name} – próxima ejecución: {j.next_t}" for j in jobs_list]
    await update.message.reply_text("📋 Trabajos activos:\n" + "\n".join(lines))


async def cmd_cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Cancela un trabajo. Uso: /cancel nombre_trabajo"""
    if not ctx.args:
        await update.message.reply_text("Uso: /cancel <nombre>")
        return
    name = ctx.args[0]
    removed = False
    for job in ctx.job_queue.get_jobs_by_name(name):
        job.schedule_removal()
        removed = True
    if removed:
        await update.message.reply_text(f"❌ Trabajo '{name}' cancelado.")
    else:
        await update.message.reply_text(f"No se encontró el trabajo '{name}'.")


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("ERROR: Definí TELEGRAM_BOT_TOKEN en el archivo .env")
        return
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("schedule", cmd_schedule))
    app.add_handler(CommandHandler("once", cmd_once))
    app.add_handler(CommandHandler("list", cmd_list))
    app.add_handler(CommandHandler("cancel", cmd_cancel))
    print("Scheduler Bot iniciado. Ctrl+C para detener.")
    app.run_polling()


if __name__ == "__main__":
    main()
