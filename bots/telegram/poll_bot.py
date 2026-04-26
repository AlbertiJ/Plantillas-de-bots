"""
Bot de encuestas y quiz para Telegram.

Crea encuestas o quizzes con /poll y recibe las respuestas de los
usuarios para procesarlas (loguearlas, guardarlas, etc.).

Uso:
    python bots/telegram/poll_bot.py
    # En el chat: envia /poll para crear una encuesta de ejemplo.

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    PollAnswerHandler,
    ContextTypes,
)

from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)


# MODIFICAR: reemplaza la pregunta y las opciones con tu contenido real.
# Puedes cargar preguntas desde un archivo JSON o base de datos.
async def poll(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # MODIFICAR: tus opciones aqui.
    questions = ["Python", "JavaScript", "Go", "Rust"]
    message = await context.bot.send_poll(
        update.effective_chat.id,
        # MODIFICAR: cambia la pregunta por la tuya.
        "Cual es tu lenguaje de programacion favorito?",
        questions,
        # MODIFICAR: is_anonymous=True si no quieres saber quien voto que.
        is_anonymous=False,
        # MODIFICAR: allows_multiple_answers=False para respuesta unica (quiz).
        allows_multiple_answers=True,
    )

    payload = {
        message.poll.id: {
            "questions": questions,
            "message_id": message.message_id,
            "chat_id": update.effective_chat.id,
            "answers": 0,
        }
    }
    context.bot_data.update(payload)


# MODIFICAR: aqui puedes guardar los resultados en una DB, enviar
# notificaciones por email, actualizar un dashboard, etc.
async def receive_poll_answer(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    answer = update.poll_answer
    answered_poll = context.bot_data.get(answer.poll_id)

    if not answered_poll:
        return

    try:
        questions = answered_poll["questions"]
    except KeyError:
        return

    selected_options = answer.option_ids
    selected_text = ", ".join(questions[i] for i in selected_options)

    # MODIFICAR: guarda este resultado en tu DB en lugar de solo loguearlo.
    logger.info("Usuario %s selecciono %s", answer.user.id, selected_text)
    answered_poll["answers"] += 1


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("poll", poll))
    application.add_handler(PollAnswerHandler(receive_poll_answer))

    logger.info("Bot de encuestas iniciado. Envia /poll en el chat.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
