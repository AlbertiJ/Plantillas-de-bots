# 🤖 Plantillas de bots

Colección de plantillas listas para usar de **bots de Telegram y WhatsApp** escritas en **Python**, con un **panel web administrador** para gestionarlos. Pensado para correr **100% en local**, ideal para aprendizaje, prototipado y uso interno.

---

## ✨ Qué incluye

### Plantillas de bots (Python)
- **Telegram** — 10 bots básicos + 5 agentes IA + 5 CTF/OSINT.
- **WhatsApp** — 10 bots básicos + 5 agentes IA + 5 CTF/OSINT.
- **Watchdog 24/7** — reinicio automático con notificaciones opcionales por Telegram.

Cada plantilla tiene código comentado bloque a bloque con marcas `# MODIFICAR:` indicando exactamente qué personalizar.

### Panel web administrador (local)
- Login con contraseña aleatoria generada al primer arranque — **visible en pantalla y terminal**.
- Forzado a cambiar la contraseña inicial en el primer acceso.
- Gestión de tokens: Telegram, WhatsApp, OpenAI, Anthropic, Gemini.
- Modo oscuro/claro + atenuador de brillo.
- Diseño responsive (móvil/tablet/desktop).
- Botón flotante **ES/EN** siempre visible.

---

## 📦 Estructura del proyecto

```
plantillas-de-bots/
├── artifacts/
│   ├── bot-templates/     ← Panel web (React + Vite) — puerto 5173
│   └── api-server/        ← API local (Express + Node.js) — puerto 3001
├── bots/
│   ├── shared/            ← Utilidades comunes (env, logger, disclaimer)
│   ├── telegram/          ← Plantillas Telegram
│   ├── whatsapp/          ← Plantillas WhatsApp
│   └── ctf-osint/         ← Plantillas CTF/OSINT (uso educativo autorizado)
├── watchdog_bot.py        ← Watchdog 24/7
├── bots/requirements.txt  ← Dependencias Python
├── setup.sh               ← Instalación y primer arranque (Mac/Linux)
├── setup.bat              ← Instalación y primer arranque (Windows)
├── start.sh               ← Reinicio rápido sin reinstalar (Mac/Linux)
├── start.bat              ← Reinicio rápido sin reinstalar (Windows)
├── .env                   ← Archivo de variables de entorno (NUNCA subir a Git)
└── README.md
```

---

## 🚀 Instalación (primera vez)

### Requisitos previos
- **Node.js 20+** y **pnpm 9+** (para el panel web)
- **Python 3.11+** y **pip** (para los bots)
- Git

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/AlbertiJ/Plantillas-de-bots plantillas-de-bots
cd plantillas-de-bots
```

### Paso 2 — Ejecutar el setup (solo una vez)

**Linux / macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

El setup instala todas las dependencias, inicia los servicios y muestra la contraseña inicial en la terminal.

### Paso 3 — Primer login

1. Abrí `http://localhost:5173` en tu navegador.
2. La pantalla de login muestra automáticamente las credenciales iniciales.
3. Ingresá y **cambiá la contraseña** desde el Panel Admin (`/admin`).
4. Después del cambio se redirige automáticamente al panel de plantillas.

---


## 🧪 Verificar la instalación

Si el setup falla, los bots no aparecen o algo no funciona, ejecutá el script de verificación **antes o después del setup**:

```bash
python3 check_install.py
```

No requiere instalar nada extra — usa solo la librería estándar de Python.
Al finalizar imprime un resumen en consola y guarda `check_report.txt` en la raíz del proyecto.

### Qué verifica (7 secciones)

| # | Sección | Qué chequea |
|---|---|---|
| 1 | **Entorno** | Python ≥ 3.10, pip, Node.js ≥ 16, pnpm, git |
| 2 | **Estructura del repo** | Carpetas, `setup.sh`, `start.sh`, `package.json` |
| 3 | **Archivos de bots** | Los 35 archivos `.py` del catálogo (detecta los que faltan) |
| 4 | **Paquetes Python** | Todos los de `bots/requirements.txt` — requeridos y opcionales |
| 5 | **Archivo .env** | Si existe y si cada variable tiene un valor real (no placeholder) |
| 6 | **Panel admin** | `node_modules` instalados y si la API está respondiendo |
| 7 | **Conectividad** | Acceso a internet, Telegram API y OpenAI |

Para cada error encontrado muestra el **comando exacto para resolverlo**.

### Errores comunes y solución rápida

| Error | Solución |
|---|---|
| `Permission denied` al correr `setup.sh` | Ya corregido — actualizá con `git pull origin main` |
| `No such file or directory` (archivo .py) | `git pull origin main` para descargar los bots faltantes |
| `ModuleNotFoundError: No module named 'telegram'` | `pip install -r bots/requirements.txt` |
| Token inválido / `Unauthorized` | Editá `.env` y completá `TELEGRAM_BOT_TOKEN` con tu token real |
| `pnpm` no encontrado | `npm install -g pnpm` |
| Python no encontrado | `sudo apt install python3 python3-pip` (Ubuntu/Debian) |
| `node_modules` no instalados | `pnpm install` |

### Cómo configurar el archivo .env

Si aún no tenés el archivo `.env`:

```bash
cp .env.example .env    # copiá la plantilla incluida en el repo
nano .env               # completá tus tokens/credenciales
```

El archivo `.env.example` incluye todas las variables documentadas con instrucciones para obtener cada credencial.

---
## 🔁 Reiniciar sin reinstalar

Después del setup inicial, para volver a iniciar los servicios usá:

**Linux / macOS:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

> ⚠️ `setup.sh` / `setup.bat` están pensados para la **primera instalación**. Volver a ejecutarlos no rompe nada, pero reinstala todas las dependencias innecesariamente.

---

## 🤖 Ejecutar bots individualmente

Cada bot puede correrse de forma independiente desde la consola. Primero configurá el `.env` (ver sección de Credenciales).

### Bots de Telegram

```bash
python bots/telegram/echo_bot.py
python bots/telegram/commands_bot.py
python bots/telegram/inline_keyboard_bot.py
python bots/telegram/files_bot.py
python bots/telegram/poll_bot.py
python bots/telegram/agent_openai_basic.py
python bots/telegram/agent_anthropic_tools.py
python bots/telegram/agent_websearch.py
python bots/telegram/agent_vision.py
python bots/telegram/agent_rag_documents.py
```

### Bots de WhatsApp (requieren ngrok para webhooks)

```bash
python bots/whatsapp/webhook_basic.py
python bots/whatsapp/chatgpt_integration.py
python bots/whatsapp/command_router.py
python bots/whatsapp/media_messages.py
python bots/whatsapp/sqlite_database.py
python bots/whatsapp/group_multiuser.py
python bots/whatsapp/scheduler_apscheduler.py
python bots/whatsapp/auto_language_detect.py
python bots/whatsapp/agent_openai_persistent.py
python bots/whatsapp/order_tracker.py
```

### Bots CTF/OSINT (⚠️ solo entornos autorizados)

```bash
python bots/ctf-osint/tg_01_ip_geo_whois.py
python bots/ctf-osint/tg_02_dns_recon.py
python bots/ctf-osint/tg_03_hash_suite.py
python bots/ctf-osint/tg_04_encoding_knife.py
python bots/ctf-osint/tg_05_sqli_builder.py
python bots/ctf-osint/wa_01_ip_geo.py
python bots/ctf-osint/wa_02_headers_tech.py
python bots/ctf-osint/wa_03_hash_suite.py
python bots/ctf-osint/wa_04_encoding.py
python bots/ctf-osint/wa_05_ctf_toolkit.py
```

### Watchdog 24/7

```bash
# Primero configurar en .env:
# BOT_SCRIPT=bots/telegram/echo_bot.py
python watchdog_bot.py
```

---

## 🔐 Manejo de credenciales

**REGLA DE ORO: NUNCA escribas tokens, claves o API keys directamente en el código.**

### Archivo `.env`

> `.env` es un **archivo de texto plano** (no una carpeta) ubicado en la **raíz del proyecto**.
> Se llama exactamente `.env` (con punto al inicio, sin extensión visible).

El archivo se crea manualmente o desde el Panel Admin. Ejemplo de cómo tiene que quedar su contenido:

```
# Archivo: .env
# Ubicación: plantillas-de-bots/.env

TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_OWNER_ID=987654321

WHATSAPP_API_KEY=EAAXXXXXXXXXXXXXXXXXX
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=mi_token_secreto
WHATSAPP_ACCESS_TOKEN=EAAXXXXXXXXXXXXXXXXXX

OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXX
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> Los valores de ejemplo son ficticios. Reemplazalos con tus claves reales.
> El `.env` está en `.gitignore` — **nunca se sube a Git**.

La forma recomendada de configurar los tokens es desde el **Panel Admin** (`/admin > Tokens de bots`). Los valores se guardan en `data/tokens.json` y se sincronizan al `.env` automáticamente.

---

## 🔑 Primer login — Seguridad del panel

Al arrancar el servidor API por **primera vez**:
- Se genera automáticamente un usuario `admin` con una contraseña aleatoria de 16 caracteres.
- La contraseña aparece **en la terminal** (abajo de la dirección Network) y **en la pantalla de login del panel**.
- El panel te redirige automáticamente a `/admin` y exige cambiar la contraseña antes de continuar.
- Una vez cambiada, la contraseña inicial desaparece para siempre.

Si olvidás la contraseña:
```bash
# Borrar las credenciales y reiniciar para generar una nueva
rm -rf data/credentials/
./start.sh
```

---

## ⏰ Modo 24×7 (corriendo en local)

```bash
# Configurar en .env:
# BOT_SCRIPT=bots/telegram/echo_bot.py
# RESTART_DELAY=5
# MAX_RESTARTS_PER_HOUR=10
# WATCHDOG_NOTIFY_TOKEN=tu_token_bot  (opcional)
# WATCHDOG_NOTIFY_CHAT=tu_chat_id     (opcional)

python watchdog_bot.py
```

---

## ⚖️ Aviso legal y ético — IMPORTANTE

Las plantillas de **CTF y OSINT** incluyen capacidades de análisis de IPs, DNS, codificaciones y técnicas de CTF.

**Solo para:**
- ✅ Sistemas que vos mismo administrás.
- ✅ CTF autorizados (HackTheBox, TryHackMe, PortSwigger, etc.).
- ✅ Bug Bounty con autorización explícita.
- ✅ Entornos educativos controlados.

**Prohibido:**
- ❌ Atacar sistemas de terceros sin autorización escrita.
- ❌ Acceder a información sin permiso.
- ❌ Cualquier uso ilegal.

---

## 🗺️ Roadmap

- [x] **Fase 0** — Setup base, README, vinculación de repo.
- [x] **Fase 1** — Panel admin con login, oscuro/claro, responsive, ES/EN, tokens.
- [x] **Fase 2** — Auditoría de plantillas existentes (14 Telegram + 10 WhatsApp en `.py`).
- [x] **Fase 3** — 5 agentes IA Telegram + 5 agentes IA WhatsApp.
- [x] **Fase 4** — 5 plantillas CTF/OSINT Telegram + 5 WhatsApp (con disclaimer ético).
- [x] **Fase 5** — Lanzador de Bots: selector con checkboxes, salida en tiempo real (SSE), stdin, exportar CSV/HTML. Página Actividad con historial y estadísticas de uso.
- [x] **Fase 6** — Modo local 24×7 con watchdog y notificaciones Telegram.

---

## 🛠️ Tecnologías

**Panel web:** TypeScript 5.9, React 19, Vite, wouter, TanStack Query, TailwindCSS, shadcn/ui, lucide-react

**API local:** Express 5, Node.js 20+, Zod, bcryptjs, cookie-parser, pino

**Bots:** Python 3.11+, python-telegram-bot, flask, twilio, requests, python-dotenv, openai, anthropic, dnspython, python-whois

---

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| **Puerto 5173 ocupado** | Cerrá otra app o cambiá `WEB_PORT` en `start.sh`. |
| **No aparece la contraseña inicial** | Revisá la terminal donde corre la API — también se imprime ahí. |
| **Bot no responde** | Verificá `TELEGRAM_BOT_TOKEN` en `.env`. |
| **WhatsApp no recibe mensajes** | El webhook necesita URL pública — usá ngrok o cloudflared. |
| **Olvidé la contraseña del panel** | Borrá `data/credentials/` y volvé a ejecutar `./start.sh`. |
| **Error en pip install** | Verificá que usás Python 3.11+: `python --version`. |
| **La API no arranca** | Revisá: `cat /tmp/plantillas-api.log` |

---

## 🙏 Créditos

- **Juan Alberti** — Dueño del proyecto.
- **Replit (Rocio)** — IA asistente, desarrollo de plantillas y panel web.

---

## 📜 Licencia

Uso personal y educativo. Licencia formal por definir.
