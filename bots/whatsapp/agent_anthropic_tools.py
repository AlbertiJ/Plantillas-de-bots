"""
Agente Claude (Anthropic) con uso de herramientas (WhatsApp + Twilio).

Equivalente WhatsApp del bot Telegram homonimo. Herramientas:
    - calculadora: aritmetica simple
    - hora_actual: fecha y hora ISO

Uso:
    python bots/whatsapp/agent_anthropic_tools.py

Requisitos en .env:
    ANTHROPIC_API_KEY
"""

import operator as op
import sys
from datetime import datetime
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from anthropic import Anthropic
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

client = Anthropic(api_key=require_env("ANTHROPIC_API_KEY"))
MODEL = get_env("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

TOOLS = [
    {
        "name": "calculadora",
        "description": "Evalua una expresion aritmetica simple (+, -, *, /).",
        "input_schema": {
            "type": "object",
            "properties": {"expresion": {"type": "string"}},
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


# MODIFICAR: persiste en DB si necesitas recordar entre reinicios.
HISTORY: dict[str, list[dict]] = {}

app = Flask(__name__)


@app.route("/whatsapp", methods=["POST"])
def webhook():
    incoming = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    if incoming.lower() in ("/reset", "reset"):
        HISTORY.pop(sender, None)
        msg.body("Historial borrado.")
        return str(resp)

    history = HISTORY.setdefault(sender, [])
    history.append({"role": "user", "content": incoming})

    for _ in range(5):
        try:
            r = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system="Eres un asistente util. Llama herramientas si te ayudan.",
                tools=TOOLS,
                messages=history,
            )
        except Exception as e:
            logger.error("Error Anthropic: %s", e)
            msg.body("Hubo un problema con el modelo.")
            return str(resp)

        history.append({"role": "assistant", "content": r.content})

        if r.stop_reason != "tool_use":
            text = "".join(b.text for b in r.content if b.type == "text")
            msg.body(text or "(sin respuesta)")
            return str(resp)

        tool_results = []
        for block in r.content:
            if block.type == "tool_use":
                logger.info("Tool %s con %s", block.name, block.input)
                result = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        history.append({"role": "user", "content": tool_results})

    msg.body("Demasiadas vueltas; intenta de nuevo.")
    return str(resp)


if __name__ == "__main__":
    logger.info("Agente Claude con tools (WhatsApp) iniciado.")
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
