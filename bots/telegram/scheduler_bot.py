#!/usr/bin/env python3
"""
scheduler_bot.py — Bot con mensajes programados para Telegram
MODIFICAR: agregar tareas periódicas con job_queue.run_repeating().
"""
import logging, os, datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
scheduled_jobs: dict = {}

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F551 Bot Programador\n\n"
        "/schedule HH:MM mensaje\n/list — Recordatorios activos\n/cancel nombre"
    )

async def schedule_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if len(ctx.args) < 2:
        await update.message.reply_text("Uso: /schedule HH:MM tu mensaje")
        return
    time_str = ctx.args[0]
    message  = " ".join(ctx.args[1:])
    try:
        hour, minute = map(int, time_str.split(":"))
        target = datetime.datetime.now().replace(hour=hour, minute=minute, second=0)
        if target < datetime.datetime.now():
            target += datetime.timedelta(days=1)
        delay   = (target - datetime.datetime.now()).total_seconds()
        chat_id = update.effective_chat.id
        # MODIFICAR: usar job_queue para persistencia real
        async def send_reminder(context):
            await context.bot.send_message(chat_id, f"\U000023F0 Recordatorio: {message}")
        job = ctx.job_queue.run_once(send_reminder, when=delay, name=f"sched_{chat_id}_{time_str}")
        scheduled_jobs[job.name] = message
        await update.message.reply_text(f"\U0001F4C5 Programado para {time_str}: {message}")
    except ValueError:
        await update.message.reply_text("Formato inválido. Usá HH:MM (ej: 14:30)")

async def list_jobs(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    jobs = ctx.job_queue.jobs()
    if not jobs:
        await update.message.reply_text("No hay recordatorios activos.")
        return
    lines = ["\U0001F4CB Recordatorios:"] + [f"- {j.name}: {scheduled_jobs.get(j.name,'?')}" for j in jobs]
    await update.message.reply_text("\n".join(lines))

async def cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        return
    removed = False
    for job in ctx.job_queue.get_jobs_by_name(ctx.args[0]):
        job.schedule_removal()
        removed = True
    await update.message.reply_text("\U0001F5D1 Cancelado." if removed else "No encontré ese recordatorio.")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("schedule", schedule_cmd))
    app.add_handler(CommandHandler("list", list_jobs))
    app.add_handler(CommandHandler("cancel", cancel))
    app.run_polling()

if __name__ == "__main__":
    main()
