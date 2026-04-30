#!/usr/bin/env python3
"""
agent_openai_basic.py — Agente OpenAI (GPT-4o) para Telegram con memoria
MODIFICAR: cambiar SYSTEM_PROMPT y MODEL según tu caso de uso.
Requiere: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY
"""
import logging, os
from openai import AsyncOpenAI
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL      = "gpt-4o-mini"   # MODIFICAR: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
# MODIFICAR: personalizar el comportamiento del agente
SYSTEM_PROMPT = (
    "Sos un asistente amigable y conciso. "
    "Respondé en el mismo idioma que el usuario. Máximo 3 párrafos."
)
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None
history: dict[int, list] = {}
MAX_HISTORY = 20  # MODIFICAR: turnos a recordar

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("\U0001F916 Agente OpenAI activo.\n/reset — Borrar historial")

async def reset(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    history.pop(update.effective_user.id, None)
    await update.message.reply_text("\U0001F9F9 Historial borrado.")

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not client:
        await update.message.reply_text("OPENAI_API_KEY no configurada.")
        return
    uid  = update.effective_user.id
    text = update.message.text
    msgs = history.setdefault(uid, [{"role": "system", "content": SYSTEM_PROMPT}])
    msgs.append({"role": "user", "content": text})
    if len(msgs) > MAX_HISTORY + 1:
        msgs = [msgs[0]] + msgs[-MAX_HISTORY:]
        history[uid] = msgs
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
    try:
        resp  = await client.chat.completions.create(model=MODEL, messages=msgs)
        reply = resp.choices[0].message.content
        msgs.append({"role": "assistant", "content": reply})
        await update.message.reply_text(reply)
    except Exception as e:
        logger.error("OpenAI error: %s", e)
        await update.message.reply_text(f"\U0000274C Error: {e}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    if not OPENAI_KEY:
        raise ValueError("OPENAI_API_KEY no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    logger.info("OpenAI agent bot iniciado (modelo: %s)...", MODEL)
    app.run_polling()

if __name__ == "__main__":
    main()
