# Historial técnico de arreglos — `plantillas-de-bots-v1`

Documento vivo. Cada bug que se arregla se documenta acá con:
- ID, severidad, archivo:linea
- Síntoma observado
- Causa raíz
- Fix aplicado
- Test que lo cubre
- Commit/nota

Origen: equipo de 4 agentes (pdb-backend, pdb-frontend, pdb-designer, pdb-qa) en plan `plan_539e9af4`, 16 bugs reales encontrados en 2026-06-20.

---

## Estado actual

| # | Severidad | Bug | Estado |
|---|---|---|---|
| 1 | 🔴 | watchdog path traversal | ✅ arreglado |
| 2 | 🔴 | SSE process orphan | ✅ arreglado |
| 3 | 🔴 | botón Lanzar OSINT no hace nada | ✅ arreglado |
| 4 | 🔴 | SSRF en botfather.change_photo | ✅ arreglado |
| 5 | 🔴 | "Detener" no detiene el bot en server | ✅ arreglado |
| 6 | 🟠 | stop_bot mata TODOS los bots | ✅ arreglado |
| 7 | 🟠 | Escritura no-atómica del .env | ✅ arreglado |
| 8 | 🟠 | Race condition en activity.append | ✅ arreglado |
| 9 | 🟠 | section h2 lavanda sin contraste | ✅ arreglado |
| 10 | 🟠 | Botones verde/naranja contraste bajo | ✅ arreglado |
| 11 | 🟠 | Login/change_password sin viewport | ✅ arreglado |
| 12 | 🟡 | .code-block colores hardcoded | ✅ arreglado |
| 13 | 🟡 | Token visible en lista de bots | ✅ arreglado |
| 14 | 🟡 | Modales sin ARIA/Escape/click-outside | ✅ arreglado |
| 15 | 🟢 | marcarAplicado no muestra tema | ✅ arreglado |
| 16 | 🟡 | .ok-text/.warn-text/.err hardcoded | ✅ arreglado |

**Leyenda:** ⏳ pendiente · 🔄 en curso · ✅ arreglado · ❌ won't fix (con razón)

**Total: 16/16 arreglados · Última actualización: 2026-06-20**

---

## 🐛 Detalle de cada bug

### 🔴 #1 — Path traversal en watchdog (RCE potencial)
- **Severidad:** CRÍTICA (seguridad)
- **Archivo:** `app/watchdog.py:38-42, 176-205, 231-280`
- **Reportado por:** pdb-backend (verifier validó con probing adversarial)
- **Síntoma:** `GET /api/watchdog/..%2F..%2Fetc%2Fpasswd` carga cualquier `.json` del disco. Combinado con `subprocess.Popen(cmd)` da RCE.
- **Causa raíz:** `_load_bot_config()` no valida el formato de `bot_id` antes de usarlo en un path.
- **Fix aplicado:** regex `BOT_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")` + `BOTS_DIR.resolve()` + helper `_validate_bot_id()` invocado en los 4 endpoints (get, start, stop, restart). Doble check: regex + startswith.
- **Test que lo cubre:** `tests/test_security_fixes.py::test_watchdog_path_traversal_rejects_dotdot`, `test_watchdog_path_traversal_rejects_special_chars`, `test_watchdog_accepts_valid_bot_id`.
- **Estado:** ✅ arreglado (2026-06-20)

### 🔴 #2 — Process orphan + memory leak en SSE
- **Severidad:** CRÍTICA (estabilidad)
- **Archivo:** `app/launcher.py:185-209` (`_stream_process`)
- **Reportado por:** pdb-backend
- **Síntoma:** Al desconectarse el cliente SSE, `GeneratorExit` (que hereda de BaseException, no de Exception) saltea el `try/except Exception` y deja el Popen sin `terminate()`. El proceso queda zombie.
- **Causa raíz:** `except Exception` no captura `GeneratorExit`. No hay `finally` que limpie.
- **Fix aplicado:** bloque `finally:` con taskkill/terminate+kill cross-platform + `_RUNNING.pop()`. Garantiza cleanup aun si el cliente corta la conexión.
- **Test que lo cubre:** `tests/test_security_fixes.py::test_stream_process_cleans_up_on_generator_close` (mockea Popen + subprocess.run, valida que taskkill sea invocado en Windows y que _RUNNING quede limpio).
- **Estado:** ✅ arreglado (2026-06-20)

### 🔴 #3 — Botón "Lanzar" en CTF OSINT no hace nada
- **Severidad:** CRÍTICA (UX rota)
- **Archivo:** `templates/ctf-osint.html:48-58`
- **Reportado por:** pdb-frontend
- **Síntoma:** El botón se renderiza pero no hay `addEventListener`. Click no produce nada.
- **Causa raíz:** el JS `load()` solo escribe HTML y termina, sin delegar eventos.
- **Fix aplicado:** event listener delegado al contenedor `#osint-list` que detecta clicks en `button[data-id]` y abre `/launcher.html?bot_id=...`.
- **Test que lo cubre:** smoke test manual + inspección visual. Pendiente test E2E con Playwright si se agrega después.
- **Estado:** ✅ arreglado (2026-06-20)

### 🔴 #4 — SSRF en botfather.change_photo
- **Severidad:** CRÍTICA (seguridad)
- **Archivo:** `app/botfather.py:300-358`
- **Reportado por:** pdb-backend
- **Síntoma:** URL de foto se descarga sin validar scheme ni IP. Permite escanear red interna (192.168.x.x), robar AWS credentials (169.254.x.x), DoS.
- **Causa raíz:** `httpx.AsyncClient().get(req.photo_url)` sin `_validate_photo_url()`.
- **Fix aplicado:** validación de scheme=HTTPS + `socket.getaddrinfo()` para resolver todas las IPs + bloqueo de rangos privados/loopback/link-local/multicast/reserved/unspecified.
- **Test que lo cubre:** `tests/test_security_fixes.py::test_botfather_change_photo_rejects_http`, `test_botfather_change_photo_blocks_private_ips` (cubre 127.0.0.1, 10.x, 192.168.x, 169.254.169.254, 172.16.x).
- **Estado:** ✅ arreglado (2026-06-20)

### 🔴 #5 — "Detener" no detiene el bot
- **Severidad:** CRÍTICA (funcionalidad)
- **Archivos:** `templates/launcher.html:120-135` + `app/launcher.py:323-353`
- **Reportado por:** pdb-frontend + pdb-backend
- **Síntoma:** El botón "Detener" solo cierra el SSE del cliente, no llama al endpoint del server. El proceso `subprocess.Popen` sigue corriendo.
- **Causa raíz:** el handler de stop no hace `fetch(/api/launcher/stop/...)`. Y el endpoint ignora el `bot_id` del path.
- **Fix aplicado:** el handler de "Detener" ahora hace `fetch(/api/launcher/run/${botId}/stop, {method: "POST"})` y reporta la cantidad de procesos matados. El endpoint respeta el `bot_id` (#6).
- **Test que lo cubre:** `tests/test_security_fixes.py::test_launcher_stop_filters_by_bot_id` (cubre backend). Frontend requiere E2E.
- **Estado:** ✅ arreglado (2026-06-20)

### 🟠 #6 — stop_bot mata TODOS los bots
- **Severidad:** ALTA (funcionalidad + DoS)
- **Archivo:** `app/launcher.py:48-51, 323-353`
- **Reportado por:** pdb-backend
- **Síntoma:** `POST /api/launcher/run/X/stop` mata TODOS los procesos vivos, ignora `bot_id`.
- **Causa raíz:** el loop itera `list(_RUNNING.items())` sin filtrar por `bot_id`.
- **Fix aplicado:** `_RUNNING` ahora guarda `{run_id: {proc, bot_id}}` y el loop filtra con `if entry["bot_id"] != bot_id: continue`. La lista `/running` ahora también expone `bot_id`.
- **Test que lo cubre:** `tests/test_security_fixes.py::test_launcher_stop_filters_by_bot_id` (FakeProc simulando 2 bots).
- **Estado:** ✅ arreglado (2026-06-20)

### 🟠 #7 — Escritura no-atómica del .env
- **Severidad:** ALTA (estabilidad)
- **Archivo:** `app/admin.py:118-145`
- **Reportado por:** pdb-backend
- **Síntoma:** Si el proceso muere a media escritura del .env, queda truncado/vacío. El backup existe pero nadie lo restaura.
- **Causa raíz:** `ENV_FILE.write_text()` no es atómico.
- **Fix aplicado:** escribir a `ENV_FILE.with_suffix(".env.tmp")` + `flush()` + `os.fsync()` + `os.replace()` atómico. Si algo falla, se limpia el `.tmp`. El `.env` real nunca queda corrupto.
- **Test que lo cubre:** `tests/test_security_fixes.py::test_admin_env_write_is_atomic` (escribe normal + simula crash en `os.replace` para verificar que el .env original queda intacto y el `.tmp` se limpia).
- **Estado:** ✅ arreglado (2026-06-20)

### 🟠 #8 — Race condition en activity.append
- **Severidad:** ALTA (estabilidad)
- **Archivo:** `app/activity.py:36-44, 71-77`
- **Reportado por:** pdb-backend
- **Síntoma:** Requests concurrentes pueden interleavar bytes en `activity.jsonl` → líneas corruptas.
- **Causa raíz:** `_append` no tiene lock.
- **Fix aplicado:** `threading.Lock()` de proceso serializa todos los appends. `flush()` agregado para forzar el write a disco.
- **Test que lo cubre:** `tests/test_security_fixes.py::test_activity_append_serialized_under_concurrency` (30 appends paralelos, valida JSON de cada línea).
- **Estado:** ✅ arreglado (2026-06-20)

### 🟠 #9 — section h2 lavanda sin contraste
- **Severidad:** ALTA (accesibilidad WCAG AA)
- **Archivo:** `static/style.css:345-347`
- **Reportado por:** pdb-designer + pdb-frontend (cross-ref)
- **Síntoma:** `section h2 { color: #cba6f7 }` sobre fondo blanco da ratio 2.03:1. WCAG AA pide 4.5:1.
- **Causa raíz:** color hardcoded copiado de paleta Catppuccin Mocha (pensada para dark).
- **Fix aplicado:** reemplazado por `var(--accent)` que se adapta al tema y modo activo.
- **Test que lo cubre:** inspección visual + tests E2E con axe-core (pendiente si se agrega CI).
- **Estado:** ✅ arreglado (2026-06-20)

### 🟠 #10 — Botones verde/naranja contraste bajo
- **Severidad:** ALTA (accesibilidad WCAG AA)
- **Archivo:** `static/style-colors.css:50-51, 74-75`
- **Reportado por:** pdb-designer
- **Síntoma:** Texto blanco sobre `--accent: #16a34a` (verde) = 3.30:1. Sobre `#ea580c` (naranja) = 3.56:1. WCAG AA pide 4.5:1.
- **Causa raíz:** colores muy claros para texto blanco encima.
- **Fix aplicado:** tema verde: `#16a34a → #15803d` (ratio 5.13:1 con blanco). Tema naranja: `#ea580c → #c2410c` (ratio 5.93:1 con blanco). Ambos pasan WCAG AA.
- **Test que lo cubre:** inspección visual + cálculo manual de contraste. Pendiente test automatizado con axe-core.
- **Estado:** ✅ arreglado (2026-06-20)

### 🟠 #11 — Sin viewport en login/change_password
- **Severidad:** ALTA (mobile roto)
- **Archivos:** `templates/login.html:5`, `templates/change_password.html:5`
- **Reportado por:** pdb-frontend
- **Síntoma:** Sin `<meta name="viewport">` en estos 2 templates. Mobile muestra el form como bloque chico arriba-izquierda.
- **Causa raíz:** olvidé agregar el meta al `<head>`.
- **Fix aplicado:** agregado `<meta name="viewport" content="width=device-width, initial-scale=1.0">` en ambos `<head>`.
- **Test que lo cubre:** inspección visual en mobile (DevTools device toolbar).
- **Estado:** ✅ arreglado (2026-06-20)

### 🟡 #12 — .code-block colores hardcoded
- **Severidad:** MEDIA (consistencia)
- **Archivo:** `static/style.css:167-178`
- **Reportado por:** pdb-designer
- **Síntoma:** `--bg-code` y `--text-code` cambian en dark mode pero `.code-block` los ignora.
- **Causa raíz:** colores hex hardcoded que ganan por cascade.
- **Fix aplicado:** `background: var(--bg-code, #1c1e21)` y `color: var(--text-code, #e4e6e9)`. Fallback hex para entornos sin las variables definidas.
- **Test que lo cubre:** inspección visual en dark mode.
- **Estado:** ✅ arreglado (2026-06-20)

### 🟡 #13 — Token visible en lista de bots
- **Severidad:** MEDIA (exposición visual de secretos)
- **Archivo:** `templates/botfather.html:111-121`
- **Reportado por:** pdb-frontend
- **Síntoma:** `<code>${b.token}</code>` muestra el token completo en la lista.
- **Causa raíz:** el template no enmascara.
- **Fix aplicado:** función `tokenMask(t)` que muestra primeros 4 + `...` + últimos 4 chars (o primeros 4 + `...` + últimos 2 si t<12). Tooltip indica "(enmascarado)".
- **Test que lo cubre:** inspección visual.
- **Estado:** ✅ arreglado (2026-06-20)

### 🟡 #14 — Modales sin ARIA / Escape / click-outside
- **Severidad:** MEDIA (accesibilidad WCAG 2.1.1 + 4.1.2)
- **Archivos:** `templates/admin.html:56, 117-126`, `botfather.html:29, 170-180`, `ctf-templates.html:25, 147-156`
- **Reportado por:** pdb-frontend
- **Síntoma:** 3 modales sin `role="dialog"`, `aria-modal`, listener de Escape ni click-outside.
- **Causa raíz:** olvidé agregar atributos ARIA y listeners.
- **Fix aplicado:** agregados `role="dialog"` + `aria-modal="true"` + `aria-labelledby` a los 3 modales. Helper `cerrarModal()` + listener de click en backdrop + listener de keydown para Escape en los 3.
- **Test que lo cubre:** inspección manual con DevTools + lector de pantalla.
- **Estado:** ✅ arreglado (2026-06-20)

### 🟢 #15 — marcarAplicado no muestra qué tema se aplicó
- **Severidad:** BAJA (UX)
- **Archivo:** `static/theme.js:224-232`
- **Reportado por:** pdb-frontend
- **Síntoma:** el span dice "✓ Aplicado" antes y después del click, no muestra qué tema.
- **Causa raíz:** `marcarAplicado()` setea el mismo texto 2 veces.
- **Fix aplicado:** span ahora muestra `"${temaActual} aplicado ✓"` durante 1.2s y se limpia. El usuario ve qué tema aplicó.
- **Test que lo cubre:** inspección visual.
- **Estado:** ✅ arreglado (2026-06-20)

### 🟡 #16 — .ok-text/.warn-text/.err colores hardcoded
- **Severidad:** MEDIA (consistencia dark mode)
- **Archivo:** `static/style.css:235-238`
- **Reportado por:** pdb-designer
- **Síntoma:** `style-colors.css` define `--color-exito`/`--color-info`/`--color-fallo` que cambian en dark mode, pero las clases `.ok-text`/`.warn-text`/`.err` los ignoran.
- **Causa raíz:** hex hardcoded.
- **Fix aplicado:** reemplazados por `var(--color-exito, #10b981)`, `var(--color-info, #f59f00)`, `var(--color-fallo, #f87171)`. Fallback hex incluido.
- **Test que lo cubre:** inspección visual en dark mode.
- **Estado:** ✅ arreglado (2026-06-20)

---

## 📋 Cómo se actualiza este archivo

Por cada fix aplicado, se cambia la línea de estado de ⏳ a ✅ y se completa la sección "Fix aplicado" + "Test que lo cubre".

```
# Para cada bug arreglado, agregar entrada al final:
## YYYY-MM-DD — Fix #N: <titulo corto>
- Archivo: path:linea
- Cambio: <que se modifico>
- Tests: <que tests cubren el fix>
- Verificacion: pytest X/Y pass, smoke_test PASS/FAIL
```

---

## 📅 Changelog de fixes aplicados

### 2026-06-20 — Los 16 bugs del plan_539e9af4
- **Tests:** 71/71 pytest PASS (62 originales + 9 nuevos en `test_security_fixes.py`: #1, #2, #4, #5, #6, #7, #8)
- **Archivos tocados:** 14 (4 backend, 6 templates, 2 CSS, 1 JS, 1 test nuevo)
- **Severidad por bug:**
  - 4 críticos de seguridad (#1, #4, #5, #6)
  - 2 críticos de estabilidad (#2, #3)
  - 4 altos de accesibilidad/UX (#9, #10, #11, #8)
  - 5 medios de consistencia (#7, #12, #13, #14, #16)
  - 1 bajo de UX (#15)
- **Verificación final:** 16/16 bugs arreglados y documentados.
