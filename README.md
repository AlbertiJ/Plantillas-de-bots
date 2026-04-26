# 🤖 Plantillas de bots

Colección de plantillas listas para usar de **bots de Telegram y WhatsApp** escritas en **Python**, con un **panel web administrador** para gestionarlos. Pensado para correr **100% en local**, ideal para aprendizaje, prototipado y uso interno.

> **Antes**: este proyecto se llamaba `bot-templates-python` y se orientaba a la nube. **Ahora** se llama **Plantillas de bots** y todo funciona en tu propia máquina, sin depender de servicios externos pagos.

---

## ✨ Qué incluye

### Plantillas de bots (Python)
- **Telegram**: bots básicos, manejadores de comandos, y agentes con IA.
- **WhatsApp**: integraciones vía la API oficial de Meta.
- **CTF / OSINT** *(uso educativo y autorizado)*: bots para análisis de URLs, web scraping, detección de formularios y métodos GET/POST, exportación a CSV. **Lee el aviso legal abajo.**

Cada plantilla viene con código Python comentado bloque por bloque y marcas `# MODIFICAR:` indicando qué se puede personalizar.

### Panel web administrador (local)
- Login con credenciales en archivo separado del código (`.credentials.json`).
- Gestión de claves: cambiar, generar aleatoria, bloquear.
- Modo oscuro/claro + atenuador de brillo.
- Diseño responsive (móvil/tablet/desktop).
- Botón flotante **ES/EN** siempre visible.
- Configuración de tokens (Telegram owner ID, WhatsApp API) desde el panel.
- Menú dedicado para componer plantillas CTF/OSINT a medida (con checkboxes).

---

## 📦 Estructura del proyecto

```
plantillas-de-bots/
├── artifacts/
│   ├── bot-templates/     ← Panel web (React + Vite)
│   ├── api-server/        ← API local (Express)
│   └── mockup-sandbox/    ← Sandbox de diseño
├── bots/                  ← Bots Python (Telegram, WhatsApp, CTF, OSINT)
├── lib/                   ← Librerías compartidas
├── scripts/               ← Scripts de instalación y setup
├── .credentials.json      ← (Generado, NUNCA subir a Git)
├── .env                   ← (Generado, NUNCA subir a Git)
└── README.md
```

---

## 🚀 Instalación local

### Requisitos previos
- **Node.js 24+** y **pnpm 9+** (para el panel web)
- **Python 3.11+** y **pip** (para los bots)
- Git

### Opción A — Script automático

**Linux / macOS:**
```bash
git clone <url-del-repo> plantillas-de-bots
cd plantillas-de-bots
./setup.sh
```

**Windows:**
```cmd
git clone <url-del-repo> plantillas-de-bots
cd plantillas-de-bots
setup.bat
```

### Opción B — Manual paso a paso

1. **Clona el repositorio:**
   ```bash
   git clone <url-del-repo> plantillas-de-bots
   cd plantillas-de-bots
   ```

2. **Instala dependencias del panel web:**
   ```bash
   pnpm install
   ```

3. **Instala dependencias de los bots Python:**
   ```bash
   cd bots
   pip install -r requirements.txt
   cd ..
   ```

4. **Inicia el panel web:**
   ```bash
   pnpm --filter @workspace/bot-templates run dev
   ```
   El panel estará en `http://localhost:5173`.

5. **Configura tus tokens** desde el panel admin (no edites código a mano).

6. **Lanza el bot que quieras:**
   ```bash
   python bots/telegram/echo_bot.py
   ```

---

## 🔐 Manejo de credenciales

**REGLA DE ORO**: nunca pongas tokens, contraseñas o API keys directamente en el código.

- Los tokens se guardan en `.env` (en la raíz del proyecto).
- Las credenciales del panel admin se guardan en `.credentials.json` (archivo separado, con ID único).
- Ambos archivos están en `.gitignore` y **nunca** se suben a Git.

Variables de entorno típicas:
```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_OWNER_ID=tu_id_aqui
WHATSAPP_API_KEY=tu_api_key_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_numero_aqui
OPENAI_API_KEY=tu_key_aqui   # opcional, para bots con IA
```

---

## ⏰ Modo 24×7 (corriendo en local)

Para mantener un bot encendido todo el día en tu propia PC:

- **Watchdog incluido** (`scripts/watchdog.py`): reinicia el bot si se cae.
- **Inicio automático** con el sistema:
  - Linux: servicio `systemd`
  - macOS: `launchd`
  - Windows: Task Scheduler
- **Salida a internet** (para webhooks): usa **ngrok** o **cloudflared** (ambos con plan gratuito).

Documentación detallada en `docs/24x7-local.md` (próximamente).

---

## ⚖️ Aviso legal y ético — IMPORTANTE

Las plantillas de **CTF y OSINT** incluyen capacidades de análisis de URLs, web scraping, detección de formularios y pruebas didácticas de inyección SQL.

**Estas herramientas son SOLO para:**
- ✅ Sistemas que tú mismo administras.
- ✅ Laboratorios CTF autorizados (HackTheBox, TryHackMe, PortSwigger Web Security Academy, etc.).
- ✅ Programas de Bug Bounty con autorización explícita.
- ✅ Pruebas en entornos educativos controlados.

**Está prohibido y es delito en casi todos los países usarlas para:**
- ❌ Atacar sitios o sistemas de terceros sin autorización por escrito.
- ❌ Acceder a información a la que no tienes derecho.
- ❌ Cualquier actividad ilegal.

Cada plantilla CTF/OSINT incluye un disclaimer en su cabecera. **Al usar este proyecto declaras que entiendes y aceptas estas condiciones.** Los autores no se responsabilizan por usos indebidos.

---

## 🗺️ Roadmap

- [x] **Fase 0**: Setup base, README, vinculación de repo.
- [ ] **Fase 1**: Panel admin con login, modo oscuro/claro + atenuador, responsive, ES/EN.
- [ ] **Fase 2**: Auditar las plantillas existentes y documentar paso a paso.
- [ ] **Fase 3**: 5 plantillas Telegram + 5 WhatsApp con agente IA.
- [ ] **Fase 4**: 5 plantillas Telegram + 5 WhatsApp para CTF/OSINT (con disclaimer).
- [ ] **Fase 5**: Menú CTF/OSINT en panel admin con selector de herramientas.
- [ ] **Fase 6**: Modo local 24×7 con watchdog y autoinicio.
- [ ] **Fase 7**: Empaquetado descargable (`install.sh` / `install.bat`) y generador de `.env`.

---

## 🛠️ Tecnologías

**Panel web:**
- TypeScript 5.9, React 19, Vite, wouter, TanStack Query
- TailwindCSS, shadcn/ui (Radix), framer-motion, lucide-react

**API local:**
- Express 5, PostgreSQL + Drizzle ORM (opcional, para historial)
- Zod, Orval (codegen desde OpenAPI)

**Bots:**
- Python 3.11+
- `python-telegram-bot`, `requests`, `beautifulsoup4`, `python-dotenv`
- `openai` o `anthropic` para plantillas con IA

**Tooling:**
- pnpm workspaces, Node 24

---

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| **Puerto ocupado** | Cambia `PORT` en `.env` o cierra la app que lo usa. |
| **Error `python-telegram-bot` no instalado** | Asegúrate de hacer `pip install -r bots/requirements.txt`. |
| **El bot no responde** | Verifica que `TELEGRAM_BOT_TOKEN` esté bien en `.env` y que el bot esté activo en BotFather. |
| **WhatsApp no envía** | La API oficial requiere número verificado en Meta Business y plantillas aprobadas. |
| **Cambios en el panel no se ven** | Reinicia el servidor con Ctrl+C y `pnpm run dev` de nuevo. |

---

## 📜 Licencia

Por definir. Mientras tanto: uso personal y educativo.

---

## 🙏 Créditos

- Proyecto original creado por **AlbertiJ** con Replit AI.
- Mejoras y reorientación a uso local en curso.
