#!/usr/bin/env python3
"""
agent_anthropic_tools.py — Agente Claude con function calling (tools)
MODIFICAR: agregar más tools en TOOLS y sus implementaciones en execute_tool().
Requiere: TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY
"""
import logging, os, math, datetime
import anthropic
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
ANT_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL   = "claude-3-haiku-20240307"  # MODIFICAR: claude-3-5-sonnet-20241022 para mejor calidad
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# MODIFICAR: definir tus propias tools
TOOLS = [
    {"name": "calculator", "description": "Evalúa expresiones matemáticas.",
     "input_schema": {"type": "object", "properties": {"expression": {"type": "string", "description": "Expresión matemática"}}, "required": ["expression"]}},
    {"name": "get_datetime", "description": "Retorna la fecha y hora actual.",
     "input_schema": {"type": "object", "properties": {}, "required": []}},
]

def execute_tool(name: str, inputs: dict) -> str:
    # MODIFICAR: implementar la lógica de cada tool
    if name == "calculator":
        try:
            return str(eval(inputs["expression"], {"__builtins__": {}}, {"math": math}))
        except Exception as e:
            return f"Error: {e}"
    if name == "get_datetime":
        return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return "Tool desconocida."

history: dict[int, list] = {}

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F916 Agente Claude con tools\nPuedo calcular y decirte la hora.\n/reset — Borrar conversación"
    )

async def reset(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    history.pop(update.effective_user.id, None)
    await update.message.reply_text("\U0001F9F9 Conversación borrada.")

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ANT_KEY:
        await update.message.reply_text("ANTHROPIC_API_KEY no configurada.")
        return
    uid  = update.effective_user.id
    text = update.message.text
    msgs = history.setdefault(uid, [])
    msgs.append({"role": "user", "content": text})
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
    try:
        cl   = anthropic.Anthropic(api_key=ANT_KEY)
        resp = cl.messages.create(model=MODEL, max_tokens=1024, tools=TOOLS, messages=msgs,
            system="Sos un asistente con tools. Respondé en el idioma del usuario.")
        reply_text = ""
        for block in resp.content:
            if block.type == "tool_use":
                tool_result = execute_tool(block.name, block.input)
                msgs.append({"role": "assistant", "content": resp.content})
                msgs.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": block.id, "content": tool_result}]})
                final = cl.messages.create(model=MODEL, max_tokens=512, messages=msgs,
                    system="Respondé en el idioma del usuario.")
                reply_text = final.content[0].text
                msgs.append({"role": "assistant", "content": reply_text})
                break
            elif block.type == "text":
                reply_text += block.text
        await update.message.reply_text(reply_text or "Sin respuesta.")
    except Exception as e:
        logger.error("Anthropic error: %s", e)
        await update.message.reply_text(f"\U0000274C Error: {e}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    if not ANT_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurado en .env")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.run_polling()

if __name__ == "__main__":
    main()
