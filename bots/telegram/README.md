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

| Variable | Obligatoria | Descripcion |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Si | Token de tu bot (lo da [@BotFather](https://t.me/BotFather)). |
| `LOG_LEVEL` | No | `DEBUG` / `INFO` / `WARNING` / `ERROR`. Default: `INFO`. |

## Convenciones

- **`# MODIFICAR:`** marca lineas o bloques disenados para que personalices.
- **Logs** via `bots.shared.logger.get_logger(__name__)`. Nada de `print()` para mensajes operativos.
- **Errores claros**: si falta una variable de entorno, el bot no arranca y te dice exactamente cual falta.
