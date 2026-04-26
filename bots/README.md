# 🤖 Bots Python — Plantillas de bots

Esta carpeta contiene los **bots de Telegram, WhatsApp y herramientas CTF/OSINT** escritos en Python.

## Estructura

```
bots/
├── telegram/        Bots de Telegram (basicos + agentes IA)
├── whatsapp/        Bots de WhatsApp (API oficial Meta)
├── ctf-osint/       Bots para CTF y OSINT (USO AUTORIZADO/EDUCATIVO)
├── shared/          Utilidades comunes (env, logger, http, csv, watchdog)
└── requirements.txt Dependencias Python
```

## Instalacion

Desde la raiz del proyecto:

```bash
# 1. Instala dependencias Python
pip install -r bots/requirements.txt

# 2. Configura tus tokens en .env (raiz del proyecto)
#    o usa el panel admin web para hacerlo desde la UI

# 3. Lanza un bot
python bots/telegram/echo_bot.py
```

## Variables de entorno requeridas

Crea un archivo `.env` en la raiz del proyecto con (segun el bot que uses):

```env
# Telegram
TELEGRAM_BOT_TOKEN=tu_token_de_botfather
TELEGRAM_OWNER_ID=tu_id_numerico

# WhatsApp (API oficial Meta)
WHATSAPP_API_KEY=tu_access_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
WHATSAPP_VERIFY_TOKEN=token_inventado_por_ti

# IA (opcional, solo para plantillas de agente IA)
OPENAI_API_KEY=tu_key
ANTHROPIC_API_KEY=tu_key
```

> 🔐 **NUNCA** subas `.env` ni `.credentials.json` a Git. Ya estan en `.gitignore`.

## Convenciones de codigo

- **Comentarios bloque por bloque**: cada seccion del codigo Python explica que hace.
- **Marcas `# MODIFICAR:`**: indican que linea o bloque puedes personalizar, con 1-2 ideas.
- **Disclaimer en CTF/OSINT**: cabecera obligatoria con aviso legal en cada plantilla de esa categoria.
- **Variables de entorno**: siempre via `python-dotenv`, nunca hardcoded.

## Modo 24×7 local

Para mantener un bot corriendo siempre en tu PC, usa el watchdog:

```bash
python scripts/watchdog.py --bot bots/telegram/echo_bot.py
```

El watchdog reinicia el bot si se cae. Para autoinicio con la PC, ver `docs/24x7-local.md` (proximamente).

## Aviso legal — CTF y OSINT

Las plantillas en `ctf-osint/` incluyen tecnicas de analisis de URLs, web scraping, deteccion de formularios y pruebas didacticas de inyeccion SQL. **Solo para usar en**:

- Sistemas que tu administras
- Laboratorios CTF autorizados (HackTheBox, TryHackMe, PortSwigger Academy)
- Programas de Bug Bounty con autorizacion explicita
- Entornos educativos controlados

Usar estas herramientas contra terceros sin permiso es **delito** en casi todos los paises. Cada plantilla CTF/OSINT lleva un disclaimer en su cabecera. Al usar estas plantillas declaras que entiendes y aceptas estas condiciones.
