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
├── test_local.py          ← Script de verificación de la instalación
├── .env                   ← Archivo de variables de entorno (NUNCA subir a Git)
└── README.md
```

---

## 🚀 Instalación y uso — flujo completo

### Requisitos previos
- **Node.js 20+** y **pnpm 9+** (para el panel web)
- **Python 3.10+** y **pip** (para los bots)
- Git

---

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/AlbertiJ/Plantillas-de-bots plantillas-de-bots
cd plantillas-de-bots
```

---

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

El setup:
1. Verifica Node.js, pnpm y Python.
2. Instala todas las dependencias (npm + pip).
3. Inicia el servidor API (puerto 3001) y el panel web (puerto 5173).
4. Muestra la **contraseña inicial** en la terminal.

> Cuando termines de verificar que todo arranca, presioná **Ctrl+C** para detener los servicios. El setup ya cumplió su función — las dependencias quedan instaladas.

---

### Paso 3 — Verificar la instalación

Con los servicios detenidos (o en otra terminal), ejecutá:

```bash
python3 test_local.py
```

No requiere instalar nada extra — usa solo la librería estándar de Python.

Verifica **7 áreas** y al finalizar imprime un resumen + guarda `check_report.txt`:

| # | Sección | Qué chequea |
|---|---|---|
| 1 | **Entorno** | Python ≥ 3.10, pip, Node.js ≥ 16, pnpm, git |
| 2 | **Estructura del repo** | Carpetas, `setup.sh`, `start.sh`, `package.json` |
| 3 | **Archivos de bots** | Los 35 archivos `.py` del catálogo |
| 4 | **Paquetes Python** | Requeridos y opcionales de `bots/requirements.txt` |
| 5 | **Archivo .env** | Si existe y si las variables tienen valor real |
| 6 | **Panel admin** | `node_modules` instalados, API respondiendo |
| 7 | **Conectividad** | Acceso a internet, Telegram API, OpenAI |

Para cada error encontrado muestra el **comando exacto para resolverlo**.

---

### Paso 4 — Primer login

1. Iniciá los servicios (ver Paso 5 abajo).
2. Abrí **http://localhost:5173** en tu navegador.
3. La pantalla de login muestra las credenciales iniciales.
4. Ingresá y **cambiá la contraseña** desde el Panel Admin (`/admin`).
5. Después del cambio se redirige automáticamente al panel de plantillas.

---

### Paso 5 — Uso diario: iniciar sin reinstalar

A partir de la segunda vez, usá `start.sh` en lugar de `setup.sh`:

**Linux / macOS:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

`start.sh` omite toda la instalación, mata procesos anteriores si siguen corriendo, y levanta el panel en segundos. Presioná **Ctrl+C** para detener.

---

### Resumen del flujo

```
Primera vez:
  git clone → cd → chmod +x setup.sh → ./setup.sh → Ctrl+C → python3 test_local.py

De ahí en más:
  ./start.sh (para levantar el servidor)
  Ctrl+C     (para detenerlo)

Si algo falla:
  python3 test_local.py → seguir las instrucciones que imprime
```

---

## 🔑 Seguridad del panel

Al arrancar por **primera vez**:
- Se genera automáticamente un usuario `admin` con contraseña aleatoria de 16 caracteres.
- La contraseña aparece **en la terminal** y en **la pantalla de login del panel**.
- El panel exige cambiarla antes de continuar — una vez cambiada desaparece para siempre.

Si olvidás la contraseña:
```bash
rm -rf data/credentials/
./start.sh
```

---

## 🔧 Configurar tokens

La forma recomendada es desde el **Panel Admin** (`/admin > Tokens de bots`). Los valores se guardan en `data/tokens.json` y se sincronizan al `.env` automáticamente.

---

## ⏰ Modo 24×7 (watchdog)

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

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| **setup.sh: Permission denied** | `chmod +x setup.sh && ./setup.sh` |
| **La API no arranca** | El setup muestra el error en pantalla. Revisá: `cat ./logs/api.log` |
| **Puerto 5173 u 3001 ocupado** | `sudo lsof -i :5173` → `kill <PID>` |
| **No aparece la contraseña inicial** | Mirá el final de la terminal donde corre `./start.sh` |
| **Bot no responde** | Verificá `TELEGRAM_BOT_TOKEN` en `.env` |
| **WhatsApp no recibe mensajes** | El webhook necesita URL pública — usá ngrok o cloudflared |
| **Olvidé la contraseña del panel** | `rm -rf data/credentials/ && ./start.sh` |
| **ModuleNotFoundError** | `pip install -r bots/requirements.txt` |
| **Algo falla y no sé qué** | `python3 test_local.py` — te dice exactamente qué está roto |

---

## ⚖️ Aviso legal y ético — IMPORTANTE

Las plantillas de **CTF y OSINT** incluyen capacidades de análisis de IPs, DNS y técnicas de CTF.

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

## 🙏 Créditos

- **Juan Alberti** — Dueño del proyecto.
- **Replit (Rocio)** — IA asistente, desarrollo de plantillas y panel web.

---

## 📜 Licencia

Uso personal y educativo. Licencia formal por definir.
