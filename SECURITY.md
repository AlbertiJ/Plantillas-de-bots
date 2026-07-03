# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**No abras un issue público para reportar vulnerabilidades.**

Email a [juan.alberti@gba.gob.ar](mailto:juan.alberti@gba.gob.ar) con:

- Descripción del problema
- Pasos para reproducir
- Impacto potencial
- (Opcional) Sugerencia de fix

Responderé en menos de 48 horas. Si es una vulnerabilidad confirmada,
voy a:

1. Crear un patch
2. Avisarte cuando esté listo el fix
3. Coordinar la fecha de disclosure público

## Hallazgos recientes (auditoría 2026-06)

16 vulnerabilidades fueron arregladas en v1.0.1. Ver
[HISTORIAL.md](HISTORIAL.md) para el detalle bug por bug.

Las críticas fueron:

| Bug | Severidad | Descripción |
|---|---|---|
| #1 | CRÍTICO | Path traversal en watchdog (RCE potencial) |
| #4 | CRÍTICO | SSRF en botfather.change_photo |
| #5 | CRÍTICO | Botón "Detener" no detenía el bot |
| #6 | CRÍTICO | stop_bot mataba TODOS los bots |

Agradecemos la divulgación responsable.
