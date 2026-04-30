# 🤖 Plantillas de bots

Colección de plantillas listas para usar de **bots de Telegram y WhatsApp** escritas en **Python**, con un **panel web administrador** para gestionarlos. Pensado para correr **100% en local**, ideal para aprendizaje, prototipado y uso interno.

---

## ✨ Qué incluye

### Plantillas de bots (Python)
- **Telegram** — 10 bots básicos + 5 agentes IA + 10 CTF/OSINT.
- **WhatsApp** — 10 bots básicos + 5 agentes IA + 5 CTF/OSINT.
- **Watchdog 24/7** — reinicio automático con notificaciones opcionales por Telegram.

Cada plantilla viene con código Python comentado bloque por bloque y marcas `# MODIFICAR:` indicando exactamente qué personalizar.

### Panel web administrador (local)
- Login con credenciales generadas automáticamente al primer arranque.
- Contraseña inicial aleatoria mostrada **en el panel** — cambiala después del primer login.
- Gestión de tokens: Telegram, WhatsApp, OpenAI, Anthropic, Gemini.
- Modo oscuro/claro + atenuador de brillo.
- Diseño responsive (móvil/tablet/desktop).
- Botón flotante **ES/EN** siempre visible.

---

## 📦 Estructura del proyecto

```
plantillas-de-bots/
├── artifacts/
│   ├── bot-templates/     ← Panel web (React + Vite)
│   └── api-server/        ← API local (Express + Node.js)
├── bots/
│   ├── shared/            ← Utilidades comunes (env, logger, disclaimer)
│   ├── telegram/          ← 10 plantillas básicas + 5 IA
│   ├── whatsapp/          ← 10 plantillas básicas + 5 IA
│   └── ctf-osint/         ← 10 plantillas CTF/OSINT (uso educativo)
├── watchdog_bot.py        ← Watchdog 24/7 con reinicio automático
├── bots/requirements.txt  ← Dependencias Python
├── setup.sh / setup.bat   ← Instalación automática
├── .env                   ← (Generado, NUNCA subir a Git)
└── README.md
```

---

## 🚀 Instalación local

### Requisitos previos
- **Node.js 20+** y **pnpm 9+** (para el panel web y API)
- **Python 3.11+** y **pip** (para los bots)
- Git

### Opción A — Script automático

**Linux / macOS:**
```bash
git clone https://github.com/AlbertiJ/Plantillas-de-bots plantillas-de-bots
cd plantillas-de-bots
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
git clone https://github.com/AlbertiJ/Plantillas-de-bots plantillas-de-bots
cd plantillas-de-bots
setup.bat
```

### Opción B — Manual paso a paso

**1. Clonar el repositorio:**
```bash
git clone https://github.com/AlbertiJ/Plantillas-de-bots plantillas-de-bots
cd plantillas-de-bots
```

**2. Instalar dependencias del panel web y la API:**
```bash
pnpm install
```

**3. Instalar dependencias de los bots Python:**
```bash
pip install -r bots/requirements.txt
```

**4. Iniciar el servidor API y el panel web:**

Terminal 1 (API):
```bash
pnpm --filter @workspace/api-server run dev
```

Terminal 2 (Panel web):
```bash
pnpm --filter @workspace/bot-templates run dev
```

**5. Abrir el panel** en `http://localhost:5173` (o el puerto que muestre la terminal).

**6. Primer login:**
Al iniciar por primera vez, la pantalla de login mostrará automáticamente el usuario y la contraseña generados. Copialos e ingresá. **Cambiá la contraseña desde el Panel Admin** (`/admin`) luego del primer acceso.

**7. Configurar los tokens** desde la sección "Tokens de bots" en el Panel Admin. Los valores se guardan en `.env` y los bots los leen automáticamente.

---

## 🤖 Ejecutar bots individualmente

Podés correr cualquier plantilla directamente desde la consola. Asegurate de tener el `.env` configurado primero (ver sección de Credenciales).

### Bots de Telegram

```bash
# Bot básico de eco (el más simple para empezar)
python bots/telegram/echo_bot.py

# Bot de comandos
python bots/telegram/commands_bot.py

# Teclado inline (botones interactivos)
python bots/telegram/inline_keyboard_bot.py

# Descarga de archivos
python bots/telegram/files_bot.py

# Encuestas
python bots/telegram/poll_bot.py

# Agente con OpenAI
python bots/telegram/agent_openai_basic.py

# Agente con Anthropic + herramientas
python bots/telegram/agent_anthropic_tools.py

# Agente con búsqueda web
python bots/telegram/agent_websearch.py

# Agente con visión (imágenes)
python bots/telegram/agent_vision.py

# Agente RAG (documentos)
python bots/telegram/agent_rag_documents.py
```

### Bots de WhatsApp (requieren ngrok o cloudflared para webhooks)

```bash
# Webhook básico
python bots/whatsapp/webhook_basic.py

# Integración ChatGPT
python bots/whatsapp/chatgpt_integration.py

# Router de comandos
python bots/whatsapp/command_router.py

# Mensajes multimedia
python bots/whatsapp/media_messages.py

# Base de datos SQLite
python bots/whatsapp/sqlite_database.py

# Multi-usuario en grupo
python bots/whatsapp/group_multiuser.py

# Mensajes programados (cron)
python bots/whatsapp/scheduler_apscheduler.py

# Detección automática de idioma
python bots/whatsapp/auto_language_detect.py

# Agente OpenAI persistente
python bots/whatsapp/agent_openai_persistent.py

# Tracker de pedidos
python bots/whatsapp/order_tracker.py
```

### Bots CTF/OSINT (⚠️ solo entornos autorizados)

```bash
# TG — IP GeoIP + WHOIS
python bots/ctf-osint/tg_01_ip_geo_whois.py

# TG — DNS Recon
python bots/ctf-osint/tg_02_dns_recon.py

# TG — Hash Suite
python bots/ctf-osint/tg_03_hash_suite.py

# TG — Encoding Swiss Knife (Base64, HEX, ROT13, JWT, Morse)
python bots/ctf-osint/tg_04_encoding_knife.py

# TG — SQLi Payload Builder
python bots/ctf-osint/tg_05_sqli_builder.py

# WA — IP GeoIP
python bots/ctf-osint/wa_01_ip_geo.py

# WA — HTTP Headers + Tech Fingerprinting
python bots/ctf-osint/wa_02_headers_tech.py

# WA — Hash Suite
python bots/ctf-osint/wa_03_hash_suite.py

# WA — Encoding Toolkit
python bots/ctf-osint/wa_04_encoding.py

# WA — CTF Toolkit all-in-one
python bots/ctf-osint/wa_05_ctf_toolkit.py
```

### Watchdog 24/7

```bash
# Configurar qué bot manejar (en .env):
# BOT_SCRIPT=bots/telegram/echo_bot.py
# RESTART_DELAY=5
# MAX_RESTARTS_PER_HOUR=10

python watchdog_bot.py
```

---

## 🔐 Manejo de credenciales

**REGLA DE ORO: NUNCA escribas tokens, contraseñas o API keys directamente en el código.**

- Todos los tokens van en `.env` (en la raíz del proyecto).
- El `.env` está en `.gitignore` — nunca se sube a Git.
- Las credenciales del panel admin se guardan en `data/credentials/` (separadas del código).
- Gestioná los tokens desde el Panel Admin (`/admin`) — se sincronizan al `.env` automáticamente.

**Ejemplo de `.env`:**
```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_OWNER_ID=tu_id_aqui
WHATSAPP_API_KEY=tu_api_key_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_numero_aqui
OPENAI_API_KEY=tu_key_aqui
ANTHROPIC_API_KEY=tu_key_aqui
```

---

## 🔑 Primer login — Seguridad del panel

Al arrancar el servidor API por **primera vez**, se genera automáticamente:
- Un usuario `admin` con una **contraseña aleatoria** de 16 caracteres.
- La contraseña aparece **en la pantalla de login del panel** para que puedas copiarla.
- **No se vuelve a mostrar** después del primer acceso.
- Ingresá, andá a `/admin` y **cambiala por una contraseña tuya**.

Si olvidás la contraseña:
```bash
# Borrar las credenciales y reiniciar para generar una nueva clave
rm -rf data/credentials/
# Reiniciar el servidor API
```

---

## ⏰ Modo 24×7 (corriendo en local)

Usá el watchdog incluido:

```bash
# En .env:
# BOT_SCRIPT=bots/telegram/echo_bot.py
# RESTART_DELAY=5
# MAX_RESTARTS_PER_HOUR=10
# WATCHDOG_NOTIFY_TOKEN=tu_token_bot  (opcional — para recibir alertas)
# WATCHDOG_NOTIFY_CHAT=tu_chat_id     (opcional)

python watchdog_bot.py
```

Para inicio automático con el sistema operativo, consultá `docs/24x7-local.md` (próximamente).

---

## ⚖️ Aviso legal y ético — IMPORTANTE

Las plantillas de **CTF y OSINT** incluyen capacidades de análisis de IPs, DNS, codificaciones y técnicas de CTF.

**Estas herramientas son SOLO para:**
- ✅ Sistemas que vos mismo administrás.
- ✅ Laboratorios CTF autorizados (HackTheBox, TryHackMe, PortSwigger, etc.).
- ✅ Programas de Bug Bounty con autorización explícita.
- ✅ Entornos educativos controlados.

**Está prohibido y es delito usarlas para:**
- ❌ Atacar sistemas de terceros sin autorización escrita.
- ❌ Acceder a información sin autorización.
- ❌ Cualquier actividad ilegal.

---

## 🗺️ Roadmap

- [x] **Fase 0** — Setup base, README, vinculación de repo.
- [x] **Fase 1** — Panel admin con login, modo oscuro/claro + atenuador, responsive, ES/EN, tokens.
- [x] **Fase 2** — Auditoría y documentación de plantillas existentes (14 Telegram + 10 WhatsApp en `.py`).
- [x] **Fase 3** — 5 agentes IA Telegram + 5 agentes IA WhatsApp (OpenAI, Anthropic, RAG, Vision, WebSearch).
- [x] **Fase 4** — 5 plantillas Telegram CTF/OSINT + 5 WhatsApp CTF/OSINT (con disclaimer ético).
- [ ] **Fase 5** — Menú CTF/OSINT en panel admin con selector de herramientas.
- [x] **Fase 6** — Modo local 24×7 con watchdog y notificaciones Telegram.
- [ ] **Fase 7** — Empaquetado descargable (`install.sh` / `install.bat`) y generador de `.env`.

---

## 🛠️ Tecnologías

**Panel web:**
- TypeScript 5.9, React 19, Vite, wouter, TanStack Query
- TailwindCSS, shadcn/ui (Radix), lucide-react

**API local:**
- Express 5, Node.js 20+
- Zod, bcryptjs, cookie-parser, pino

**Bots:**
- Python 3.11+
- `python-telegram-bot`, `flask`, `twilio`, `requests`, `python-dotenv`
- `openai`, `anthropic` para plantillas con IA
- `dnspython`, `python-whois` para CTF/OSINT

**Tooling:**
- pnpm workspaces, Node 20+

---

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| **Puerto ocupado** | Cambiá `PORT` en `.env` o cerrá la app que lo usa. |
| **No aparece la contraseña inicial** | Revisá los logs del servidor API en la terminal — también se imprime ahí. |
| **Bot no responde** | Verificá que `TELEGRAM_BOT_TOKEN` esté bien en `.env`. |
| **WhatsApp no recibe** | El webhook necesita URL pública — usá ngrok o cloudflared. |
| **Olvidé la contraseña del panel** | Borrá `data/credentials/` y reiniciá el servidor API. |
| **Error pip install** | Asegurate de usar Python 3.11+: `python --version`. |

---

## 🙏 Créditos

- **Juan Alberti** — Dueño del proyecto.
- **Replit (Rocio)** — IA asistente, desarrollo de plantillas y panel web.
- **Oscar Pablo Gonzales** — Colaborador, Fases 1-3 (panel admin, auditoría, agentes IA).

---

## 📜 Licencia

Uso personal y educativo. Licencia formal por definir.
