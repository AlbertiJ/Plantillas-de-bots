# Roadmap operativo — `plantillas-de-bots-v1`

> Estado vivo. Cada item se actualiza a medida que se ejecuta.
> Última actualización: 2026-06-21

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
| G1 | Subir CI workflows (3 archivos) | ❌ cancelado | PAT sin scope `workflow`. Hacer manual desde web. |
| G2 | Crear tag `v1.0.1` en GitHub | ⏳ | Manual via API o web |
| G3 | Agregar topics al repo | ⏳ | SEO |
| G4 | Actualizar homepage del repo | ⏳ | Apunta a Replit viejo |
| G5 | Branch protection en `main` | ⏳ | Evitar force-push accidentales |

## 🔵 Quick wins (funcionalidad nueva)

| # | Item | Estado | Esfuerzo | Tests |
|---|---|---|---|---|
| Q1 | `/health` endpoint sin auth (200 si OK) | ⏳ | 20 min | sandbox |
| Q2 | Rate limit `/api/auth/login` (5/min por IP) | ⏳ | 1-2 h | sandbox |
| Q3 | Rate limit `/api/launcher/run` (10/min por user) | ⏳ | 30 min | sandbox |
| Q4 | Logrotate automático de `activity.jsonl` | ⏳ | 1 h | sandbox |

## 🟣 Calidad / deuda técnica

| # | Item | Estado | Esfuerzo |
|---|---|---|---|
| C1 | Pre-commit hooks (black + ruff) | ⏳ | 30 min |
| C2 | Logging estructurado con structlog | ⏳ | 2-3 h |
| C3 | Type hints completos en routers | ⏳ | 4 h |

## 🟠 Operacional (producción)

| # | Item | Estado | Esfuerzo |
|---|---|---|---|
| O1 | HTTPS con Caddy (config) | ⏳ | 1-2 h |
| O2 | Dockerfile + docker-compose | ⏳ | 1-2 h |

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
