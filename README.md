# Plantillas de Bots en Python / Python Bot Templates

Guía interactiva con plantillas listas para usar para crear bots de **Telegram** y **WhatsApp** con Python.

## ¿Qué incluye?

- 5 plantillas de Telegram (eco, comandos, teclado inline, encuestas, archivos)
- 8 plantillas de WhatsApp (webhook, comandos, multimedia, scheduler, ChatGPT, SQLite, grupos, idioma auto)
- Guía de instalación paso a paso
- Buenas prácticas y logging
- Guía de despliegue 24/7 (Railway, VPS, Docker)
- Gestión segura de credenciales
- Página de errores comunes y soluciones
- Bilingüe español / inglés

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

---

## Instalación y ejecución local

### Opción A — Script automático

**Mac / Linux:**
```bash
bash setup.sh
```

**Windows:**
```bat
setup.bat
```

### Opción B — Manual

```bash
# 1. Clonar el repositorio
git clone https://github.com/AlbertiJ/replit.git
cd replit

# 2. Instalar dependencias
pnpm install

# 3. Iniciar la aplicación
pnpm --filter @workspace/bot-templates run dev
```

Luego abrir el navegador en: **http://localhost:5173** (o el puerto que indique la terminal)

---

## Estructura del proyecto

```
artifacts/
  bot-templates/        ← Aplicación web principal (React + Vite)
    src/
      pages/            ← Páginas: home, telegram, whatsapp, setup, tips, deploy, credentials, errors
      components/       ← Layout, CodeBlock y componentes UI
      context/          ← Contexto de idioma (ES/EN)
```

---

## Tecnologías

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Wouter (routing)
- next-themes (modo oscuro/claro)
- Resaltador de sintaxis Python personalizado (sin dependencias externas)

---

## Licencia

MIT — Usá, modificá y distribuí libremente.
