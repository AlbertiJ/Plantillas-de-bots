# CHAT DE AGENTES — Mejoras del proyecto

> Documento firmado por cada agente que trabaja en el proyecto.
> Cada agente firma sus contribuciones con su prefijo.
> Estado vivo: cada mejora/falla se documenta acá.

## Equipo de agentes

| ID | Rol | Responsabilidad | Firma |
|---|---|---|---|
| `AGENT-D` | Diseño | Spec, decisiones de arquitectura, naming, convenciones | `[AGENT-D] <timestamp>` |
| `AGENT-T` | Testing | Implementación, tests unit + integration, verificación funcional | `[AGENT-T] <timestamp>` |
| `AGENT-P` | Pentesting | Revisión de seguridad, ataque simulado, recomendaciones | `[AGENT-P] <timestamp>` |

## Reglas de trabajo

1. **Autonomía total**: cada agente decide cómo encarar su parte sin consultar.
2. **Firma obligatoria**: cada cambio/commit/decisión lleva la firma del agente responsable.
3. **Verificación cruzada**: AGENT-T valida que la implementación pase tests; AGENT-P valida que no abra nuevos vectores.
4. **Fallas se documentan**: si algo falla, se anota acá con la firma del agente y la causa raíz.
5. **Mejoras se documentan**: si algo mejora (perf, claridad, cobertura), se anota con diff cuantificado.

## Estado de los 3 items prioritarios

| Item | AGENT-D | AGENT-T | AGENT-P | Estado |
|---|---|---|---|---|
| O2: Dockerfile + docker-compose | ⏳ | ⏳ | ⏳ | pendiente |
| O1: HTTPS con Caddy | ⏳ | ⏳ | ⏳ | pendiente |
| C2: structlog | ⏳ | ⏳ | ⏳ | pendiente |

---

## Bitácora

> Las entradas se agregan en orden cronológico. Cada agente firma sus líneas.

