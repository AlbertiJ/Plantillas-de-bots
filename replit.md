# Plantillas de bots

## Vision general

Proyecto **Plantillas de bots**: coleccion de plantillas de bots de Telegram y WhatsApp en Python, mas un panel web administrador. Pensado para correr **100% en local** (la version anterior estaba orientada a la nube).

## Estructura del repo

```
plantillas-de-bots/
├── artifacts/
│   ├── bot-templates/     ← Panel web admin (React + Vite)
│   ├── api-server/        ← API local (Express)
│   └── mockup-sandbox/    ← Sandbox de diseno
├── bots/                  ← Bots Python (Telegram, WhatsApp, CTF, OSINT)
│   ├── telegram/          ← Bots de Telegram
│   ├── whatsapp/          ← Bots de WhatsApp
│   ├── ctf-osint/         ← Bots para CTF y OSINT (con disclaimer)
│   ├── shared/            ← Utilidades comunes (env, logger, http, csv)
│   └── requirements.txt   ← Dependencias Python
├── lib/                   ← Librerias TypeScript compartidas
├── scripts/               ← Scripts de instalacion y setup
├── .credentials.json      ← (Generado por panel admin, NO subir a Git)
├── .env                   ← (Generado, NO subir a Git)
└── README.md
```

## Artifacts (panel web)

### bot-templates (React + Vite, en `/`)
Panel administrador y vitrina de plantillas.
- **Modo oscuro** por defecto + toggle a claro + **atenuador de brillo** (slider)
- **Bilingue ES/EN** via `LanguageProvider` + boton flotante (margen derecho, siempre visible)
- **Responsive** (movil/tablet/desktop con breakpoints CSS)
- **Login** con credenciales en `.credentials.json` (archivo separado, ID unico)
- **Paginas**: Home, Telegram, WhatsApp, CTF/OSINT, Setup, Tips, Deploy local 24/7, Credentials, Admin
- **Resaltado de sintaxis Python**: tokenizer custom en `code-block.tsx`
- **Archivos clave**: `src/context/language.tsx`, `src/components/layout.tsx`, `src/App.tsx`
- Cada plantilla incluye comentarios `# MODIFICAR:` con ideas de personalizacion

### api-server (Express, local)
API local que sirve al panel: gestion de credenciales, configuracion de tokens, lanzar/parar bots, ver estado, exportar CSV.

### mockup-sandbox
Sandbox de diseno para iterar componentes UI de forma aislada.

## Bots Python (`bots/`)

- **telegram/** (10 plantillas): basicas (`echo_bot`, `commands_bot`, `inline_keyboard_bot`, `poll_bot`, `files_bot`) + agentes IA (`agent_openai_basic`, `agent_anthropic_tools`, `agent_websearch`, `agent_rag_documents`, `agent_vision`).
- **whatsapp/** (14 plantillas, Twilio + Flask): basicas (`webhook_basic`, `command_router`, `media_messages`, `scheduler_apscheduler`, `chatgpt_integration`, `sqlite_database`, `group_multiuser`, `auto_language_detect`, `order_tracker`) + agentes IA (`agent_openai_persistent`, `agent_anthropic_tools`, `agent_websearch`, `agent_rag_documents`, `agent_vision`). Variantes con API oficial de Meta opcionales en Fase 3.5.
- **ctf-osint/**: 5+5 plantillas para Telegram/WhatsApp con analisis de URLs, scraping, deteccion de formularios, GET/POST, exportacion CSV. **Solo uso autorizado/educativo** (ver disclaimer en cada archivo). Llega en Fase 4.
- **shared/**: `env.py` (require_env/get_env), `logger.py` (get_logger), `disclaimer.py` (CTF/OSINT).

Todas las plantillas usan `from bots.shared.env import require_env` y `from bots.shared.logger import get_logger`. Cada `# MODIFICAR:` indica un punto pensado para personalizar.

## Stack

### Panel web
- pnpm workspaces, Node 24, TypeScript 5.9
- React 19, Vite, wouter, TanStack Query
- TailwindCSS, shadcn/ui (Radix), framer-motion, lucide-react

### API
- Express 5, PostgreSQL + Drizzle ORM (opcional), Zod, Orval

### Bots
- Python 3.11+
- `python-telegram-bot`, `requests`, `beautifulsoup4`, `python-dotenv`
- `openai` o `anthropic` para plantillas con IA

## Comandos clave

### Panel web
- `pnpm install` — instala dependencias
- `pnpm --filter @workspace/bot-templates run dev` — panel admin en `http://localhost:5173`
- `pnpm --filter @workspace/api-server run dev` — API local
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — build completo

### Bots Python
- `pip install -r bots/requirements.txt` — instala dependencias
- `python bots/telegram/echo_bot.py` — ejemplo
- `python scripts/watchdog.py` — modo 24x7 local con reinicio automatico

## Credenciales

**Regla de oro**: NUNCA hardcodear tokens. Todo va en:
- `.env` (raiz del proyecto) — tokens de bots y APIs
- `.credentials.json` — credenciales del panel admin (generado por la app)

Ambos en `.gitignore`. El panel permite editarlos desde la UI.

## Roadmap (resumen)

Ver `README.md` para el roadmap completo. Estado actual:
- [x] Fase 0: Setup base, README, replit.md, estructura de carpetas
- [x] Fase 1: Panel admin con login, dark/light + brillo, ES/EN, responsive
  - Backend: `/api/auth/*`, `/api/tokens` con bcrypt + cookies de sesion
  - Credenciales por archivo en `data/credentials/cred-<uuid>.json` (rotacion al cambiar clave)
  - Tokens en `data/tokens.json` con sync automatico al `.env`
  - Frontend: AuthProvider, BrightnessProvider, controles flotantes, /login, /admin
  - Bootstrap: usuario `admin` con clave aleatoria al primer arranque (visible en log)
- [x] Fase 2: Auditar plantillas existentes
  - 5 plantillas Telegram + 9 plantillas WhatsApp extraidas a archivos `.py` reales en `bots/`
  - Normalizadas para usar `bots.shared.env` y `bots.shared.logger`
  - Hallazgo: las de WhatsApp usan Twilio; doc apuntaba a Meta. Twilio se mantiene (sandbox instantaneo) y Fase 3 anade equivalentes Meta en paralelo
  - `bots/shared/logger.py` nuevo (logger comun configurado por `LOG_LEVEL`)
  - `requirements.txt` actualizado (twilio, apscheduler agregados)
  - Per-folder `README.md` en `bots/telegram/` y `bots/whatsapp/`
- [x] Fase 3: 5+5 plantillas Telegram/WhatsApp con IA
  - Telegram: `agent_openai_basic` (memoria persistente JSON), `agent_anthropic_tools` (calculadora + hora), `agent_websearch` (DuckDuckGo + OpenAI con citas), `agent_rag_documents` (TF-IDF puro Python sobre data/rag_docs/), `agent_vision` (gpt-4o-mini multimodal)
  - WhatsApp: `agent_openai_persistent` (memoria SQLite), `agent_anthropic_tools`, `agent_websearch`, `agent_rag_documents`, `agent_vision` (descarga media de Twilio con auth basica)
  - Sin nuevas dependencias (openai, anthropic, requests, bs4 ya estaban)
  - Banner de inicio del API server: ahora muestra URL + IP LAN + credenciales iniciales de admin si se acaban de generar
- [ ] Fase 4: 5+5 plantillas CTF/OSINT (con disclaimer)
- [ ] Fase 5: Menu CTF/OSINT en panel
- [ ] Fase 6: Modo 24x7 local con watchdog
- [ ] Fase 7: Empaquetado descargable
