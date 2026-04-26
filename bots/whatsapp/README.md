# WhatsApp — Plantillas

Bots de WhatsApp basados en **Twilio + Flask**. Reciben webhooks POST en
`/whatsapp` y responden con TwiML.

> **Nota del audit (Fase 2):** las plantillas existentes usan Twilio
> porque era lo que habia. La doc del proyecto apunta a la **API oficial
> de Meta** como objetivo final. La Fase 3 introducira equivalentes Meta
> en paralelo. Mientras tanto, Twilio funciona perfecto y es el camino
> mas rapido para tener un sandbox de pruebas (Twilio te da uno gratis).

## Plantillas incluidas

| Archivo | Que hace |
|---|---|
| `webhook_basic.py` | Webhook eco. La base de todo bot WhatsApp con Twilio. |
| `command_router.py` | Enrutador de comandos por palabras clave (hola/ayuda/estado). |
| `media_messages.py` | Recibe fotos/audio/docs y responde con imagenes y PDFs. |
| `scheduler_apscheduler.py` | Mensajes programados (recordatorios diarios) con APScheduler. |
| `chatgpt_integration.py` | Integra OpenAI ChatGPT con memoria de conversacion en RAM. |
| `sqlite_database.py` | Guarda usuarios y contadores en SQLite (`bot.db`). |
| `group_multiuser.py` | Identifica admins y soporta `/broadcast` y `/stats`. |
| `auto_language_detect.py` | Detecta idioma (ES/EN/PT) y responde en el mismo. |
| `order_tracker.py` | Sistema de seguimiento de pedidos con SQLite (`orders.db`). |

## Como ejecutar

Desde la raiz del proyecto:

```bash
# 1. Instala dependencias
pip install -r bots/requirements.txt

# 2. Configura .env (o usa el panel admin)
echo "TWILIO_ACCOUNT_SID=ACxxxxxxxx" >> .env
echo "TWILIO_AUTH_TOKEN=xxxxxxxx" >> .env

# 3. Lanza el webhook
python bots/whatsapp/webhook_basic.py
```

Por defecto escucha en el puerto **5000**. Para que Twilio pueda alcanzarlo
desde internet, expone el puerto con un tunel:

```bash
# opcion 1
ngrok http 5000

# opcion 2 (sin cuenta)
cloudflared tunnel --url http://localhost:5000
```

Luego en la consola de Twilio, en tu sandbox de WhatsApp, configura el
webhook a `https://TU-TUNEL.ngrok-free.app/whatsapp`.

## Variables de entorno

| Variable | Cuando | Descripcion |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | scheduler | SID de tu cuenta Twilio. |
| `TWILIO_AUTH_TOKEN` | scheduler | Auth token de Twilio. |
| `TWILIO_WHATSAPP_NUMBER` | scheduler | Numero verificado (default sandbox `whatsapp:+14155238886`). |
| `OPENAI_API_KEY` | chatgpt_integration | API key de OpenAI. |
| `OPENAI_MODEL` | chatgpt_integration (opcional) | Modelo a usar. Default `gpt-3.5-turbo`. |
| `PORT` | todos | Puerto Flask (default `5000`). |
| `LOG_LEVEL` | todos | Default `INFO`. |

## Por que Twilio si vamos a Meta

- **Twilio sandbox** te da un numero gratis para probar en 2 minutos.
- **Meta API** requiere verificar un numero de empresa, lo cual lleva dias.
- Los templates de Meta llegaran como variantes paralelas en Fase 3, sin
  borrar estos. Asi puedes elegir.
