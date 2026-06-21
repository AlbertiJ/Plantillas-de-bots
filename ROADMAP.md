# Roadmap operativo — `plantillas-de-bots-v1`

> Estado vivo. Cada item se actualiza a medida que se ejecuta.
> Última actualización: 2026-06-21 (sesión de cierre)

## Leyenda de estado

- ⏳ pendiente
- 🔄 en curso
- ✅ hecho
- ❌ cancelado (con razón)
- 🟡 bloqueado (con bloqueante)

---

## 🟡 Bloqueos / higiene de GitHub

| # | Item | Estado | Notas |
|---|---|---|---|
| G1 | Subir CI workflows (3 archivos) | ❌ cancelado | PAT sin scope `workflow`. Usuario lo sube manual desde web. |
| G2 | Crear tag `v1.0.1` en GitHub | ✅ hecho | Tag pusheado, apunta a `11f4074` |
| G3 | Agregar topics al repo | ✅ hecho | 8 topics: audit, bot-templates, fastapi, osint, pentesting, python, telegram-bot, watchdog |
| G4 | Actualizar homepage del repo | ✅ hecho | Apunta a `RELEASE.md` en main |
| G5 | Branch protection en `main` | ✅ hecho | No force-push, no delete, enforce admins |

## 🔵 Quick wins (funcionalidad nueva)

| # | Item | Estado | Esfuerzo | Tests |
|---|---|---|---|---|
| Q1 | `/health` endpoint sin auth (200 si OK) | ✅ ya estaba | 20 min | `tests/test_accessibility.py::TestAccessibilityPublic` |
| Q2 | Rate limit `/api/auth/login` (5/min por IP) | ✅ hecho | 1-2 h | `tests/test_ratelimit.py` (4 tests) |
| Q3 | Rate limit `/api/launcher/run` (10/min por user) | ✅ hecho | 30 min | `tests/test_ratelimit.py` (1 test integration) |
| Q4 | Logrotate automático de `activity.jsonl` | ✅ hecho | 1 h | `tests/test_logrotate.py` (6 tests) |

## 🟣 Calidad / deuda técnica

| # | Item | Estado | Esfuerzo |
|---|---|---|---|
| C1 | Pre-commit hooks (black + ruff) | ✅ hecho | 30 min |
| C2 | Logging estructurado con structlog | ✅ hecho | 2-3 h |
| C3 | Type hints completos en routers | ⏳ pendiente | 4 h |

## 🟠 Operacional (producción)

| # | Item | Estado | Esfuerzo |
|---|---|---|---|
| O1 | HTTPS con Caddy (Docker + bare-metal) | ✅ hecho | 1-2 h |
| O2 | Dockerfile + docker-compose | ✅ hecho | 1-2 h |

## ❌ No incluido en este pase

- Migración a Redis (1 día, requiere infra nueva)
- Editor visual de bots (2-3 días)
- Multi-tenant (3-5 días)
- Webhooks en vez de polling (1-2 días)
- OAuth / SSO (1 día)
- Mobile app

---

## 📋 Plantilla de ejecución (por item)

```
## [FECHA] — [ID]: [titulo]
- **Estado:** [antes → despues]
- **Archivos:** [paths]
- **Cambio:** [resumen]
- **Tests:** [resultado sandbox]
- **Verificacion:** [pytest X/Y pass]
```

---

## 📅 Changelog de esta sesión (2026-06-21 01:40-02:30 ART)

### 2026-06-21 — ROADMAP Q1-Q4 + C1 + G2-G5
- **Tests:** 86/86 pytest passing (73 anteriores + 13 nuevos)
- **Archivos nuevos (5):** `app/ratelimit.py`, `tests/test_ratelimit.py`,
  `tests/test_logrotate.py`, `tests/conftest.py`, `ROADMAP.md`
- **Archivos modificados (4):** `app/activity.py` (Q4), `app/auth.py` (Q2),
  `app/launcher.py` (Q3), `app/ratelimit.py` (N/A)
- **Archivos de infra (4):** `.pre-commit-config.yaml`,
  `.githooks/pre-commit.ps1`, `.githooks/README.md`
- **GitHub:**
  - Tag `v1.0.1` pusheado
  - Description, homepage, 8 topics actualizados
  - Branch protection activado (no force-push, no delete, enforce admins)
- **Bug encontrado y arreglado durante desarrollo:**
  - Deadlock en logrotate: `_append` mantiene `_APPEND_LOCK` y llama a
    `_rotate_now` que intentaba re-adquirir el mismo Lock. Cambiado a
    `RLock` (re-entrante).
- **Verificación final:** 86 passed, 5 skipped (Playwright E2E - browser required).
