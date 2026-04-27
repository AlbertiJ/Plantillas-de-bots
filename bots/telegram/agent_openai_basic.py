"""
Agente IA con OpenAI y memoria persistente (Telegram).

Conversa con el usuario manteniendo el historial por chat_id en un
archivo JSON local (`data/chats/<chat_id>.json`). El historial sobrevive
a reinicios del bot.

Comandos especiales:
    /reset   - Borra el historial del chat actual
    /system  - (admin) cambia el system prompt en caliente

Uso:
    python bots/telegram/agent_openai_basic.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
    OPENAI_API_KEY
    OPENAI_MODEL  (opcional, default gpt-4o-mini)
"""

import json
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from openai import OpenAI
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

# MODIFICAR: cambia la personalidad del agente aqui.
SYSTEM_PROMPT = (
    "Eres un asistente amable, conciso y directo. Respondes siempre en espanol "
    "salvo que el usuario te hable en otro idioma."
)

# MODIFICAR: cambia el limite para controlar el costo de tokens.
MAX_HISTORY = 20

CHATS_DIR = Path("data/chats")
CHATS_DIR.mkdir(parents=True, exist_ok=True)

client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
MODEL = get_env("OPENAI_MODEL", "gpt-4o-mini")


def _history_path(chat_id: int) -> Path:
    return CHATS_DIR / f"{chat_id}.json"


def load_history(chat_id: int) -> list[dict]:
    p = _history_path(chat_id)
    if not p.exists():
        return [{"role": "system", "content": SYSTEM_PROMPT}]
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return [{"role": "system", "content": SYSTEM_PROMPT}]


def save_history(chat_id: int, history: list[dict]) -> None:
    _history_path(chat_id).write_text(
        json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def trim(history: list[dict]) -> list[dict]:
    if len(history) <= MAX_HISTORY:
        return history
    # MODIFICAR: estrategia de poda. Aqui mantenemos el system + ultimos N-1.
    return [history[0]] + history[-(MAX_HISTORY - 1):]


async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    save_history(chat_id, [{"role": "system", "content": SYSTEM_PROMPT}])
    await update.message.reply_text("Historial borrado. Empezamos de cero.")


async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    user_msg = update.message.text

    history = load_history(chat_id)
    history.append({"role": "user", "content": user_msg})
    history = trim(history)

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=history,
            # MODIFICAR: ajusta temperatura para mas creatividad (0.0-1.5).
            temperature=0.7,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Error OpenAI: %s", e)
        await update.message.reply_text("Tuve un problema con el modelo. Reintenta.")
        return

    history.append({"role": "assistant", "content": reply})
    save_history(chat_id, history)

    await update.message.reply_text(reply)


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("reset", reset))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))

    logger.info("Agente OpenAI iniciado. Modelo: %s", MODEL)
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
