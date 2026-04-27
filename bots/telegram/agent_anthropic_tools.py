"""
Agente IA con Claude (Anthropic) + uso de herramientas (Telegram).

El modelo decide cuando llamar a herramientas locales:
    - calculadora: evalua expresiones aritmeticas seguras
    - hora_actual: devuelve fecha y hora actual

Comandos:
    /reset - Borra el historial

Uso:
    python bots/telegram/agent_anthropic_tools.py

Requisitos en .env:
    TELEGRAM_BOT_TOKEN
    ANTHROPIC_API_KEY
    ANTHROPIC_MODEL  (opcional, default claude-3-5-sonnet-latest)
"""

import json
import operator as op
import sys
from datetime import datetime
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from anthropic import Anthropic
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

client = Anthropic(api_key=require_env("ANTHROPIC_API_KEY"))
MODEL = get_env("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

# MODIFICAR: define las herramientas que el modelo puede invocar.
TOOLS = [
    {
        "name": "calculadora",
        "description": "Evalua una expresion aritmetica simple (suma, resta, multiplicacion, division).",
        "input_schema": {
            "type": "object",
            "properties": {
                "expresion": {"type": "string", "description": "ej: '2 + 2 * 3'"}
            },
            "required": ["expresion"],
        },
    },
    {
        "name": "hora_actual",
        "description": "Devuelve la fecha y hora actual en formato ISO.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

_OPS = {"+": op.add, "-": op.sub, "*": op.mul, "/": op.truediv}


def safe_eval(expr: str) -> str:
    """Evaluador minimal sin usar eval(). Solo numeros y +-*/."""
    # MODIFICAR: usa una libreria como `simpleeval` si necesitas mas operaciones.
    try:
        tokens, current = [], ""
        for ch in expr.replace(" ", ""):
            if ch in "+-*/":
                if current:
                    tokens.append(float(current))
                    current = ""
                tokens.append(ch)
            else:
                current += ch
        if current:
            tokens.append(float(current))
        # Evaluacion izquierda-a-derecha sin precedencia (suficiente para demo).
        result = tokens[0]
        i = 1
        while i < len(tokens):
            result = _OPS[tokens[i]](result, tokens[i + 1])
            i += 2
        return str(result)
    except Exception as e:
        return f"Error: {e}"


def run_tool(name: str, params: dict) -> str:
    if name == "calculadora":
        return safe_eval(params.get("expresion", ""))
    if name == "hora_actual":
        return datetime.now().isoformat(timespec="seconds")
    return f"Herramienta desconocida: {name}"


HISTORY: dict[int, list[dict]] = {}  # MODIFICAR: persiste a disco si lo necesitas.


async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    HISTORY.pop(update.effective_chat.id, None)
    await update.message.reply_text("Historial borrado.")


async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    user_msg = update.message.text
    history = HISTORY.setdefault(chat_id, [])
    history.append({"role": "user", "content": user_msg})

    # MODIFICAR: bucle agentico. Hasta 5 vueltas de tool_use.
    for _ in range(5):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                # MODIFICAR: cambia la personalidad del agente aqui.
                system="Eres un asistente util. Llama herramientas si te ayudan.",
                tools=TOOLS,
                messages=history,
            )
        except Exception as e:
            logger.error("Error Anthropic: %s", e)
            await update.message.reply_text("Hubo un problema con el modelo.")
            return

        history.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason != "tool_use":
            text = "".join(b.text for b in resp.content if b.type == "text")
            await update.message.reply_text(text or "(sin respuesta)")
            return

        tool_results = []
        for block in resp.content:
            if block.type == "tool_use":
                logger.info("Tool %s con %s", block.name, block.input)
                result = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        history.append({"role": "user", "content": tool_results})

    await update.message.reply_text("Demasiadas vueltas; intenta de nuevo.")


def main() -> None:
    token = require_env("TELEGRAM_BOT_TOKEN")
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))
    logger.info("Agente Claude con tools iniciado. Modelo: %s", MODEL)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
