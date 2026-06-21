"""
============================================
tests/test_e2e_playwright.py — Tests E2E con Playwright
============================================

Cubre los bugs UI criticos:
  - #3  Boton Lanzar en CTF OSINT
  - #5  Boton Detener en Launcher
  - #13 Token enmascarado en lista de bots
  - #15 marcarAplicado muestra el tema aplicado

Requiere: pip install playwright pytest-playwright
          python -m playwright install chromium

Si Playwright no esta instalado, los tests se saltean para no romper
la suite basica. Estos tests requieren un server corriendo, asi que
se saltan localmente y se ejecutan en CI (workflow .github/workflows/e2e.yml).
"""
import socket
import subprocess
import sys
import time

import pytest


def _try_import_playwright():
    try:
        from playwright.sync_api import sync_playwright, expect
        return sync_playwright, expect
    except ImportError:
        return None, None


sync_playwright_fn, expect_fn = _try_import_playwright()
SKIP_REASON = "playwright no instalado"


def _port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def _wait_for_server(port: int, timeout_s: float = 30.0) -> bool:
    start = time.time()
    while time.time() - start < timeout_s:
        if _port_in_use(port):
            return True
        time.sleep(0.3)
    return False


@pytest.fixture(scope="module")
def server():
    """Levanta el server en un puerto libre y lo baja al final del modulo."""
    port = 18084
    if _port_in_use(port):
        pytest.skip(f"puerto {port} ya en uso")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if not _wait_for_server(port):
        proc.terminate()
        pytest.fail("server no arranco a tiempo")
    yield f"http://127.0.0.1:{port}"
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


# ============================================================
# FIX #3: Boton "Lanzar" en CTF OSINT
# ============================================================
@pytest.mark.skipif(sync_playwright_fn is None, reason=SKIP_REASON)
class TestLanzarOSINT:
    """
    FIX #3: el boton 'Lanzar' en /ctf-osint debe abrir el launcher
    del bot correspondiente. Antes no hacia nada (no habia listener).
    """

    def test_boton_lanzar_redirige_al_launcher(self, server):
        from app import auth
        auth.create_credential("admin", "test1234", must_change=False)

        with sync_playwright_fn() as p:
            browser = p.chromium.launch()
            context = browser.new_context()
            page = context.new_page()

            # Login via API para obtener cookies
            r = context.request.post(
                f"{server}/api/auth/login",
                data={"username": "admin", "password": "test1234"},
            )
            assert r.ok, f"Login fallo: {r.status()}"

            # Ir a la pagina CTF OSINT
            page.goto(f"{server}/ctf-osint")
            page.wait_for_load_state("networkidle")

            # Si hay bots en data/osint_bots.json, validar que el boton funciona
            botones = page.locator("button[data-id]")
            count = botones.count()
            if count == 0:
                pytest.skip("no hay bots en data/osint_bots.json para testear")

            # Capturar el popup que se abre al click
            with page.context.expect_page() as new_page_info:
                botones.first.click()
            new_page = new_page_info.value
            new_page.wait_for_load_state("domcontentloaded")

            # Verificar que redirigio al launcher
            assert "/launcher" in new_page.url, \
                f"FIX #3: boton debio abrir /launcher.html, abrio {new_page.url}"
            assert "?bot_id=" in new_page.url, \
                f"FIX #3: URL debio tener ?bot_id=, tiene {new_page.url}"

            browser.close()


# ============================================================
# FIX #5: Boton "Detener" en Launcher llama al server
# ============================================================
@pytest.mark.skipif(sync_playwright_fn is None, reason=SKIP_REASON)
class TestDetenerLauncher:
    """
    FIX #5: el boton 'Detener' debe matar el proceso en el server,
    no solo cerrar el SSE del cliente.
    """

    def test_boton_detener_llama_endpoint(self, server):
        from app import auth, launcher
        auth.create_credential("admin", "test1234", must_change=False)

        with sync_playwright_fn() as p:
            browser = p.chromium.launch()
            context = browser.new_context()
            page = context.new_page()

            r = context.request.post(
                f"{server}/api/auth/login",
                data={"username": "admin", "password": "test1234"},
            )
            assert r.ok

            # Ir a launcher
            page.goto(f"{server}/launcher")
            page.wait_for_load_state("networkidle")

            # Si no hay bots registrados, skip
            select = page.locator("#bot-select, select[name='bot_id']")
            if select.count() == 0:
                pytest.skip("launcher no tiene selector de bots")

            # Interceptar el POST a /api/launcher/run/.../stop
            stop_called = []
            def handle_route(route, request):
                if "/stop" in request.url and request.method == "POST":
                    stop_called.append(request.url)
                route.continue_()
            page.route("**/api/launcher/**", handle_route)

            # Buscar boton Detener y clickearlo
            detener = page.locator("#runner-stop, button:has-text('Detener')")
            if detener.count() == 0:
                pytest.skip("no hay boton Detener visible")
            detener.first.click()

            # Esperar que el fetch se haya hecho
            page.wait_for_timeout(1000)
            assert len(stop_called) > 0, \
                f"FIX #5: boton Detener debio hacer POST a /stop, llamadas: {stop_called}"

            browser.close()


# ============================================================
# FIX #13: Token enmascarado en lista de bots
# ============================================================
@pytest.mark.skipif(sync_playwright_fn is None, reason=SKIP_REASON)
class TestTokenMasked:
    """
    FIX #13: el token en la lista de bots no debe aparecer completo.
    Solo se muestran los primeros 4 y ultimos 4 chars.
    """

    def test_token_no_aparece_completo_en_lista(self, server):
        from app import auth
        import json
        from pathlib import Path

        # Crear un bot fake con token conocido
        auth.create_credential("admin", "test1234", must_change=False)
        token_completo = "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ_full_secret"
        bot_file = Path("data/bots/_test_token_mask.json")
        bot_file.write_text(json.dumps({
            "id": "_test_token_mask",
            "name": "Test Mask",
            "token": token_completo,
        }))

        try:
            with sync_playwright_fn() as p:
                browser = p.chromium.launch()
                context = browser.new_context()
                page = context.new_page()

                r = context.request.post(
                    f"{server}/api/auth/login",
                    data={"username": "admin", "password": "test1234"},
                )
                assert r.ok

                page.goto(f"{server}/botfather")
                page.wait_for_load_state("networkidle")

                content = page.content()
                # El token completo NO debe aparecer en el HTML
                assert token_completo not in content, \
                    f"FIX #13: token completo no debio aparecer en la lista"
                # Pero si una version enmascarada (primeros 4 + ... + ultimos 4)
                assert "1234" in content, "FIX #13: primeros 4 chars deben aparecer"
                assert "_full_secret" not in content, \
                    "FIX #13: ultimos 4 chars pueden aparecer, pero no el final completo"

                browser.close()
        finally:
            bot_file.unlink(missing_ok=True)


# ============================================================
# FIX #15: marcarAplicado muestra el nombre del tema
# ============================================================
@pytest.mark.skipif(sync_playwright_fn is None, reason=SKIP_REASON)
class TestMarcarAplicado:
    """
    FIX #15: el span #themeAplicado debe mostrar el nombre del tema
    aplicado, no un texto estatico.
    """

    def test_marcar_aplicado_muestra_nombre_tema(self, server):
        from app import auth
        auth.create_credential("admin", "test1234", must_change=False)

        with sync_playwright_fn() as p:
            browser = p.chromium.launch()
            context = browser.new_context()
            page = context.new_page()

            r = context.request.post(
                f"{server}/api/auth/login",
                data={"username": "admin", "password": "test1234"},
            )
            assert r.ok

            # Ir a una pagina con el panel de temas
            page.goto(f"{server}/")
            page.wait_for_load_state("networkidle")

            # Buscar el boton de tema
            theme_buttons = page.locator("button[data-tema]")
            if theme_buttons.count() == 0:
                pytest.skip("no hay selector de temas en la pagina")

            # Click en un tema
            theme_buttons.first.click()
            page.wait_for_timeout(500)

            # Verificar que el span ahora dice algo con el nombre del tema
            span = page.locator("#themeAplicado")
            if span.count() == 0:
                pytest.skip("no hay span #themeAplicado")

            text = span.text_content() or ""
            assert "aplicado" in text.lower() and len(text) > 15, \
                f"FIX #15: span debio mostrar nombre del tema, dice: {text!r}"

            browser.close()
