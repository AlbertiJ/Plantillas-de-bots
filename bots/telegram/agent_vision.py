#!/usr/bin/env python3
"""
agent_vision.py — Agente de visión con GPT-4o Vision para Telegram
MODIFICAR: cambiar VISION_PROMPT según tu caso (análisis, OCR, descripción).
Requiere: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY
"""
import logging, os, base64
from openai import AsyncOpenAI
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
# MODIFICAR: personalizar el prompt de análisis
VISION_PROMPT = (
    "Analizá esta imagen detalladamente. "
    "Describí qué ves, colores, texto visible y detalles relevantes. "
    "Respondé en el idioma del usuario."
)
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F441 Agente de Visión (GPT-4o)\n\nEnviame una imagen y la analizaré."
    )

async def handle_photo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not client:
        await update.message.reply_text("OPENAI_API_KEY no configurada.")
        return
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
    photo      = update.message.photo[-1]
    file       = await ctx.bot.get_file(photo.file_id)
    file_bytes = await file.download_as_bytearray()
    img_b64    = base64.b64encode(bytes(file_bytes)).decode()
    caption    = update.message.caption or ""
    prompt     = VISION_PROMPT + (f" El usuario pregunta: {caption}" if caption else "")
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
            ]}],
            max_tokens=1000,
        )
        await update.message.reply_text(f"\U0001F50D Análisis:\n\n{resp.choices[0].message.content}")
    except Exception as e:
        logger.error("Vision error: %s", e)
        await update.message.reply_text(f"\U0000274C Error: {e}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    if not OPENAI_KEY:
        raise ValueError("OPENAI_API_KEY no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.run_polling()

if __name__ == "__main__":
    main()
