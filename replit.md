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

- **telegram/**: bots basicos + 5 con agente IA (a crear)
- **whatsapp/**: bots oficiales (Meta Business API) + 5 con agente IA (a crear)
- **ctf-osint/**: 5+5 plantillas para Telegram/WhatsApp con analisis de URLs, scraping, deteccion de formularios, GET/POST, exportacion CSV. **Solo uso autorizado/educativo** (ver disclaimer en cada archivo).
- **shared/**: utilidades comunes (env, logger, http, csv, watchdog).

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
- [ ] Fase 2: Auditar plantillas existentes
- [ ] Fase 3: 5+5 plantillas Telegram/WhatsApp con IA
- [ ] Fase 4: 5+5 plantillas CTF/OSINT (con disclaimer)
- [ ] Fase 5: Menu CTF/OSINT en panel
- [ ] Fase 6: Modo 24x7 local con watchdog
- [ ] Fase 7: Empaquetado descargable
