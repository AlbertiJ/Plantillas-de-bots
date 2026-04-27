# Telegram — Plantillas

Bots de Telegram listos para usar, basados en `python-telegram-bot v20+`.

## Plantillas incluidas

| Archivo | Que hace |
|---|---|
| `echo_bot.py` | Bot eco basico. Repite cualquier mensaje de texto. Punto de partida ideal. |
| `commands_bot.py` | Manejador de comandos `/start`, `/help`, `/about`, `/ping`. |
| `inline_keyboard_bot.py` | Mensajes con botones inline y callbacks. |
| `poll_bot.py` | Crea encuestas/quizzes con `/poll` y procesa las respuestas. |
| `files_bot.py` | Recibe fotos y documentos y los guarda en `downloads/`. |
| `agent_openai_basic.py` | Agente OpenAI con memoria persistente en `data/chats/<chat_id>.json`. |
| `agent_anthropic_tools.py` | Claude (Anthropic) con uso de herramientas (calculadora, hora). |
| `agent_websearch.py` | Busqueda en DuckDuckGo + sintesis con OpenAI citando fuentes. |
| `agent_rag_documents.py` | RAG sobre `data/rag_docs/*.{txt,md}` con TF-IDF puro Python. |
| `agent_vision.py` | Multimodal con vision: analiza fotos enviadas (gpt-4o-mini). |

## Como ejecutar

Desde la raiz del proyecto:

```bash
# 1. Instala dependencias (una vez)
pip install -r bots/requirements.txt

# 2. Configura tu token (en .env raiz o desde el panel admin)
echo "TELEGRAM_BOT_TOKEN=tu_token_aqui" >> .env

# 3. Ejecuta el bot
python bots/telegram/echo_bot.py
```

Tambien funciona como modulo desde la raiz:

```bash
python -m bots.telegram.echo_bot
```

## Variables de entorno

Todas las plantillas usan `bots.shared.env.require_env`, que falla con un
mensaje claro si la variable no existe.

| Variable | Obligatoria en | Descripcion |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | todos | Token de tu bot (lo da [@BotFather](https://t.me/BotFather)). |
| `OPENAI_API_KEY` | agent_openai_basic, websearch, rag, vision | API key de OpenAI. |
| `ANTHROPIC_API_KEY` | agent_anthropic_tools | API key de Anthropic. |
| `OPENAI_MODEL` | opcional | Default `gpt-4o-mini`. |
| `OPENAI_VISION_MODEL` | opcional (vision) | Default `gpt-4o-mini`. |
| `ANTHROPIC_MODEL` | opcional | Default `claude-3-5-sonnet-latest`. |
| `LOG_LEVEL` | opcional | `DEBUG` / `INFO` / `WARNING` / `ERROR`. Default `INFO`. |

## Convenciones

- **`# MODIFICAR:`** marca lineas o bloques disenados para que personalices.
- **Logs** via `bots.shared.logger.get_logger(__name__)`. Nada de `print()` para mensajes operativos.
- **Errores claros**: si falta una variable de entorno, el bot no arranca y te dice exactamente cual falta.
