#!/usr/bin/env python3
"""
poll_bot.py — Bot de encuestas y quizzes para Telegram
MODIFICAR: personalizar POLL_QUESTIONS y QUIZ_QUESTIONS con tus propias preguntas.
"""
import logging, os
from telegram import Update
from telegram.ext import Application, CommandHandler, PollAnswerHandler, ContextTypes

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

# MODIFICAR: agregar tus propias preguntas y opciones
POLL_QUESTIONS = [
    ("¿Cuál es tu lenguaje favorito?", ["Python", "JavaScript", "Go", "Rust", "Otro"]),
]
QUIZ_QUESTIONS = [
    ("¿Cuántos bits tiene un byte?", ["4", "8", "16", "32"], 1),
]

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F4CA Bot de Encuestas\n\n/poll — Encuesta\n/quiz — Quiz con respuesta correcta"
    )

async def poll(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    q = POLL_QUESTIONS[0]
    await ctx.bot.send_poll(chat_id=update.effective_chat.id, question=q[0],
        options=q[1], is_anonymous=False, allows_multiple_answers=False)

async def quiz(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    q = QUIZ_QUESTIONS[0]
    await ctx.bot.send_poll(chat_id=update.effective_chat.id, question=q[0],
        options=q[1], type="quiz", correct_option_id=q[2], is_anonymous=False,
        explanation="\U0001F916 Respuesta correcta!")

async def poll_answer(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    ans = update.poll_answer
    logging.getLogger(__name__).info("Respuesta de %s: %s", ans.user.first_name, ans.option_ids)

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("poll", poll))
    app.add_handler(CommandHandler("quiz", quiz))
    app.add_handler(PollAnswerHandler(poll_answer))
    app.run_polling()

if __name__ == "__main__":
    main()
