# Release notes — plantillas-de-bots-v1

## v1.0.1 — Auditoría de seguridad y UX (2026-06-21)

16 bugs arreglados en un solo release, agrupados por severidad. Hallazgos
del equipo de 4 agentes (`pdb-backend`, `pdb-frontend`, `pdb-designer`,
`pdb-qa`) en plan `plan_539e9af4`, validados por `verifier` con probing
adversarial. Detalle por bug en [`HISTORIAL.md`](HISTORIAL.md).

---

### 🔴 Críticos de seguridad (4)

- **#1 — Path traversal en watchdog** (RCE potencial)
  `GET /api/watchdog/..%2F..%2Fetc%2Fpasswd` cargaba cualquier `.json` del
  disco. Combinado con `subprocess.Popen(cmd)` permitía ejecución remota
  de código. **Fix:** regex `^[a-zA-Z0-9_-]{1,64}$` + `Path.resolve()` +
  validación `startswith` en todos los endpoints. PR [#1].
- **#4 — SSRF en `botfather.change_photo`**
  La URL de foto se descargaba sin validar scheme ni IP. Permitía escanear
  la red interna y robar credenciales de AWS metadata (`169.254.169.254`).
  **Fix:** exigir HTTPS + resolver todas las IPs del host + bloquear
  rangos privados / loopback / link-local / multicast.
- **#5 — Botón "Detener" no detenía el bot**
  El handler de stop solo cerraba el EventSource del cliente; el
  `subprocess.Popen` seguía corriendo en el server. **Fix:** el frontend
  hace `fetch('/api/launcher/run/<id>/stop', POST)` y el endpoint mata
  el proceso en el server.
- **#6 — `stop_bot` mataba TODOS los procesos**
  `POST /api/launcher/run/X/stop` mataba TODOS los bots vivos, ignorando
  el `bot_id` del path. **Fix:** el storage `_RUNNING` ahora guarda
  `{run_id: {proc, bot_id}}` y el loop filtra por bot.

### 🔴 Críticos de estabilidad (2)

- **#2 — Process orphan en SSE** (`GeneratorExit` no se capturaba)
  Al desconectarse el cliente SSE, `GeneratorExit` (que hereda de
  `BaseException`, no de `Exception`) saltaba el `try/except` y dejaba
  el `Popen` sin `terminate()`. **Fix:** bloque `finally:` con
  taskkill/terminate cross-platform + `_RUNNING.pop()`.
- **#3 — Botón "Lanzar" en CTF OSINT no hacía nada**
  El botón se renderizaba sin `addEventListener`, el click no producía
  efecto. **Fix:** event delegation al contenedor `#osint-list` que abre
  `/launcher.html?bot_id=...`.

### 🟠 Altos (4)

- **#7 — Escritura no-atómica del `.env`**
  Si el proceso moría a media escritura, el `.env` quedaba truncado.
  **Fix:** escribir a `.env.tmp` + `flush()` + `os.fsync()` + `os.replace()`
  atómico. El `.env` real nunca queda corrupto.
- **#8 — Race condition en `activity.append`**
  Requests concurrentes interleavaban bytes en `activity.jsonl` →
  líneas corruptas. **Fix:** `threading.Lock()` de proceso + `flush()`.
- **#9 — `section h2` lavanda sin contraste WCAG**
  `color: #cba6f7` sobre fondo blanco daba ratio 2.03:1 (WCAG pide 4.5:1).
  **Fix:** usar `var(--accent)` que se adapta al tema.
- **#10 — Botones verde/naranja con contraste bajo**
  Verde `#16a34a` daba 3.30:1, naranja `#ea580c` daba 3.56:1 (sobre blanco).
  **Fix:** oscurecer a `#15803d` (5.13:1) y `#c2410c` (5.93:1).

### 🟠 Alto (1)

- **#11 — Sin viewport en login/change_password**
  El form se mostraba chico arriba-izquierda en mobile. **Fix:** agregar
  `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  en ambos `<head>`.

### 🟡 Medios (5)

- **#12 — `.code-block` con colores hardcoded**
  Dark mode ignoraba los colores del bloque. **Fix:** usar
  `var(--bg-code, #1c1e21)` y `var(--text-code, #e4e6e9)`.
- **#13 — Token visible en lista de bots**
  `<code>${b.token}</code>` mostraba el token completo. **Fix:**
  función `tokenMask()` que muestra `abcd...wxyz`.
- **#14 — Modales sin ARIA / Escape / click-outside**
  3 modales sin `role="dialog"`, `aria-modal`, ni handlers de teclado.
  **Fix:** atributos ARIA + helper `cerrarModal()` + listener de Escape
  y click en backdrop en los 3 modales.
- **#16 — `.ok-text` / `.warn-text` / `.err` con colores hardcoded**
  Dark mode ignoraba los colores. **Fix:** usar `var(--color-exito, ...)`
  con fallback hex.

### 🟢 Bajo (1)

- **#15 — `marcarAplicado` no mostraba qué tema se aplicó**
  El span decía "✓ Aplicado" antes y después del click. **Fix:** muestra
  `"${temaActual} aplicado ✓"` durante 1.2s.

---

### 📦 Instalación / actualización

```bash
git pull origin main
pip install -r requirements.txt
# venv nuevo? recrear con install.bat (Windows) o script de Python 3.12
```

### ✅ Tests

```
71/71 pytest passing
- 62 originales (regression suite)
- 9 nuevos en test_security_fixes.py
```

Cobertura nueva en `test_security_fixes.py`:

- `test_watchdog_path_traversal_rejects_dotdot` (FIX #1)
- `test_watchdog_path_traversal_rejects_special_chars` (FIX #1)
- `test_watchdog_accepts_valid_bot_id` (FIX #1, happy path)
- `test_botfather_change_photo_rejects_http` (FIX #4)
- `test_botfather_change_photo_blocks_private_ips` (FIX #4, 5 IPs)
- `test_activity_append_serialized_under_concurrency` (FIX #8, 30 appends)
- `test_launcher_stop_filters_by_bot_id` (FIX #6)
- `test_stream_process_cleans_up_on_generator_close` (FIX #2)
- `test_admin_env_write_is_atomic` (FIX #7, incluye simulación de crash)

### 🛠️ Cambios para developers

- Nuevo archivo `build_zip.py` para generar el ZIP distributable.
- Nuevo `.gitignore` (excluye `.venv`, `__pycache__`, secrets).
- `HISTORIAL.md` con el detalle completo bug por bug.
- `RELEASE.md` (este archivo).

### 🔮 Roadmap (no incluido en este release)

- Tests E2E con Playwright para los bugs UI.
- axe-core en CI para regresiones de accesibilidad.
- Migración de `_RUNNING` a Redis para sobrevivir reinicios.
- Rate limiting en `/api/auth/login` y `/api/launcher/run`.
- 2FA con TOTP.
- HTTPS con Caddy reverse proxy para producción.
- Dockerfile + docker-compose.

### 📞 Soporte

- Issues: https://github.com/AlbertiJ/plantillas-de-bots-v1/issues
- Autor: Juan Alberti <juan.alberti@gba.gob.ar>
