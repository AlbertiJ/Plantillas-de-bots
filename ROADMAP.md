# Roadmap de REVIVAL — `plantillas-de-bots-v1`

> **Diagnóstico (julio 2026):** código sólido, pero 0 stars / 0 forks / 0 watchers en GitHub.
> El proyecto está **técnicamente vivo pero socialmente muerto**.
> La prioridad ahora NO es agregar features, es **que alguien lo encuentre y lo pruebe**.

## Honest status: por qué está abandonado

| Síntoma | Causa raíz |
|---|---|
| 0 stars | Nadie lo conoce. Sin show & tell, sin posts externos. |
| 0 forks | README no vende. No hay demo público. |
| 0 issues abiertas (y casi cerradas) | Nadie lo está usando suficiente para encontrar bugs. |
| Sin LICENSE | Bloquea uso corporativo/legal. |
| `is_template: true` | Heredado del proyecto original. Indica "forkeame" en vez de "usame". |
| Sin CODE_OF_CONDUCT, CONTRIBUTING | Los pocos curiosos no saben cómo ayudar. |
| Sin discussions | No hay espacio para preguntas, showcase, feedback. |
| README sin capturas | "Show, don't tell". Sin demo visual la gente no se imagina qué es. |

**Conclusión:** no falta código. Falta marketing + comunidad + pulido de imagen.

---

## Fases (cronológicas, no paralelas)

```
[0] Higiene (1 día)           ─────► listo para recibir contribuidores
   ↓
[1] README que venda (1 día)  ─────► gente que llega al repo se queda
   ↓
[2] Demo online (3 días)      ─────► "try before you install"
   ↓
[3] Lanzamiento público (1 semana) ─────► posts, videos, showcases
   ↓
[4] Docs completas (2 semanas) ─────► ReadTheDocs + tutoriales
   ↓
[5] Features de crecimiento (ongoing) ─────► editor visual, marketplace
```

---

## Fase 0 — Higiene (1 día) 🧹

> Hacer que un developer random pueda mirar este repo y decir "esto es serio".

| # | Item | Esfuerzo | Estado |
|---|---|---|---|
| H1 | Agregar `LICENSE` (MIT) | 5 min | ⏳ |
| H2 | Quitar `is_template` via API | 1 min | ⏳ |
| H3 | `CODE_OF_CONDUCT.md` (Contributor Covenant) | 5 min | ⏳ |
| H4 | `CONTRIBUTING.md` (cómo abrir PR, cómo correr tests) | 30 min | ⏳ |
| H5 | `SECURITY.md` (cómo reportar vulnerabilidades) | 5 min | ⏳ |
| H6 | Issue templates: bug_report, feature_request | 15 min | ⏳ |
| H7 | PR template | 5 min | ⏳ |
| H8 | Discussion categories (Q&A, Show and tell, Ideas) | 5 min | ⏳ |
| H9 | Renombrar repo: `plantillas-de-bots` (sin `-v1`) | opcional | ⏳ |

**Bloqueante para Fase 1.**

---

## Fase 1 — README que venda (1 día) 📖

> El README decide en 30 segundos si alguien se queda o se va.

| # | Item | Estado |
|---|---|---|
| R1 | Hero section con problema/solución (3 líneas) | ⏳ |
| R2 | 1-2 screenshots reales (panel admin, launcher, watchdog) | ⏳ |
| R3 | GIF de 15 segundos mostrando el flujo completo | ⏳ |
| R4 | Quick start con 3 comandos (`git clone`, `pip install`, `uvicorn`) | ⏳ |
| R5 | Features list con emojis (más scannable) | ⏳ |
| R6 | Badges: CI, tests, code quality, license, python | ⏳ |
| R7 | Casos de uso: "Para quién es esto" (3-4 bullets) | ⏳ |
| R8 | Link a CHAT_AGENTES.md y ROADMAP.md | ⏳ |
| R9 | Tabla de comparación vs alternativas (script manual, n8n, etc.) | ⏳ |
| R10 | Screenshots en `docs/img/` para no saturar la raíz | ⏳ |

**Bloqueante para Fase 3** (no podés postear sin un buen README).

---

## Fase 2 — Demo online (3 días) 🌐

> "Try without installing" baja la barrera de adopción al cero.

| # | Item | Estado |
|---|---|---|
| D1 | Elegir hosting (Railway, Fly.io, DigitalOcean, Hetzner) | ⏳ |
| D2 | Deploy automático desde `main` (CI → Docker registry → server) | ⏳ |
| D3 | Dominio público (ej: `demo.plantillas-de-bots.dev`) | ⏳ |
| D4 | HTTPS automático con Caddy | ✅ ya tenemos config |
| D5 | Credenciales demo: `guest`/`guest123` con permisos read-only | ⏳ |
| D6 | Banner "DEMO — datos se borran cada 24h" | ⏳ |
| D7 | Uptime monitor (UptimeRobot free tier) | ⏳ |

**Bloqueante para Fase 3** (sin URL, no hay a dónde mandar gente).

---

## Fase 3 — Lanzamiento público (1 semana) 📣

> Hacer ruido. Una sola vez está bien, después mantenimiento.

| # | Item | Estado |
|---|---|---|
| L1 | Post en dev.to: "Construí un panel admin para mis Telegram bots en Python" | ⏳ |
| L2 | Post en tu LinkedIn (recordá: tu perfil es tu carta de presentación) | ⏳ |
| L3 | Show HN en Hacker News | ⏳ |
| L4 | r/selfhosted y r/Python en Reddit (con demo) | ⏳ |
| L5 | r/cybersecurity y r/netsec (con ángulo pentesting) | ⏳ |
| L6 | Lista en awesome-selfhosted (PR) | ⏳ |
| L7 | Lista en awesome-pentest (PR) | ⏳ |
| L8 | Tweet en X con el GIF demo | ⏳ |
| L9 | Video 5 min en YouTube (screen record + narración) | ⏳ |
| L10 | Post en foro de Telegram bot developers | ⏳ |

**Hitos medibles:**
- Semana 1: 10-50 stars
- Semana 2: 50-200 stars, 1-3 forks
- Mes 1: 200-500 stars, 3-10 issues de usuarios reales

---

## Fase 4 — Docs completas (2 semanas) 📚

> Sin docs, los stars se van. La gente abandona cuando no entiende cómo usar algo.

| # | Item | Estado |
|---|---|---|
| K1 | ReadTheDocs o MkDocs | ⏳ |
| K2 | Tutorial "Crear tu primer bot en 10 minutos" | ⏳ |
| K3 | Tutorial "Deploy en DigitalOcean" | ⏳ |
| K4 | Tutorial "Configurar watchdog y recovery" | ⏳ |
| K5 | Referencia completa de API (OpenAPI ya está en /docs) | ⏳ |
| K6 | Recetas (recipes/): "Cómo agregar OAuth", "Cómo integrar Discord" | ⏳ |
| K7 | FAQ | ⏳ |
| K8 | Changelog público (mantener CHANGELOG.md al día) | ⏳ |
| K9 | Roadmap público (este archivo, renderizado) | ✅ ya existe |

---

## Fase 5 — Features de crecimiento (ongoing) 🚀

> Recién acá empezamos a expandir funcionalidad. Estas vienen DE users, no de nosotros.

| # | Feature | Triggers por | Estado |
|---|---|---|---|
| F1 | Editor visual de bots (no más JSON manual) | Pedida por 3+ users | ⏳ |
| F2 | Marketplace de templates comunitarios | 50+ users activos | ⏳ |
| F3 | Adapter Discord (hoy solo Telegram) | Pedida por Discord bots dev | ⏳ |
| F4 | Webhooks (en vez de polling) | Cuando escalemos | ⏳ |
| F5 | Multi-tenant (varios workspaces) | Cuando aparezca un cliente corp | ⏳ |
| F6 | SSO (Google, GitHub) | Pedida por enterprise | ⏳ |
| F7 | Mobile app | Pedida por users móviles | ⏳ |

**Regla:** nada de acá se arranca sin al menos 3 users pidiéndolo. Feature driven por demanda, no por imaginación.

---

## Tracking

- Cada fase con deliverable concreto se commitea con mensaje conventional (`docs:`, `chore:`, `feat:`)
- Issues de GitHub se cierran con referencia al item del roadmap
- Cada user que llega se loguea como "visitante del repositorio" en una issue de tracking (mensual)

---

## Anti-patterns a evitar

❌ **"Feature creep"** — no agregar features que nadie pidió
❌ **"Marketing sin demo"** — no postear sin URL accesible
❌ **"README TLDR"** — nadie lee, poné lo importante arriba
❌ **"Síndrome del impostor"** — el código está bien, no esperes a que sea "perfecto"
❌ **"Solo en GitHub"** — si solo está en GitHub, no existe para 99% de la gente

---

## Presuuesto de tiempo estimado

| Fase | Horas | Cuándo |
|---|---|---|
| Fase 0 | 4 h | Este finde |
| Fase 1 | 6 h | Este finde + lunes |
| Fase 2 | 12 h | Próxima semana |
| Fase 3 | 8 h | Cuando demo esté online |
| Fase 4 | 20 h | Siguiente semana |
| Fase 5 | ongoing | Cuando users pidan |

**Total "revival" = ~50 horas. Después, mantener ritmo.**

---

## Lo que ya HICIMOS (no hay que rehacer)

✅ 16 bugs de seguridad arreglados
✅ 168 tests pasando, mypy 0 errores
✅ Dockerfile + docker-compose + Caddy (producción-ready)
✅ structlog (logging estructurado)
✅ Rate limiting
✅ Logrotate
✅ Branch protection + topics
✅ Tag v1.0.1
✅ ZIP distributable

**El código está. Falta la gente.**
