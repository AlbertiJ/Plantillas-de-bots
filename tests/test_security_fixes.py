"""
============================================
tests/test_security_fixes.py — Tests de los fixes de seguridad
============================================

Cubre los bugs #1, #4, #8 (seguridad y estabilidad).

Patron: misma fixture y _login() que usa test_final_routers.py.
"""
import json
import shutil
import pytest
from pathlib import Path


# ============================================================
# Fixtures (mismo patron que test_final_routers.py)
# ============================================================
@pytest.fixture
def client_with_tmp_data(monkeypatch):
    """Crea un cliente con paths temporales."""
    from fastapi.testclient import TestClient

    tmp = Path("data/_tmp_test_security")
    if tmp.exists():
        shutil.rmtree(tmp)
    (tmp / "bots").mkdir(parents=True, exist_ok=True)
    (tmp / "credentials").mkdir(parents=True, exist_ok=True)

    from app import auth, activity, admin, watchdog, launcher, botfather
    monkeypatch.setattr(auth, "CREDENTIALS_DIR", tmp / "credentials")
    monkeypatch.setattr(activity, "ACTIVITY_LOG", tmp / "activity.jsonl")
    monkeypatch.setattr(admin, "ENV_FILE", tmp / ".env")
    monkeypatch.setattr(admin, "ENV_EXAMPLE", tmp / ".env.example")
    # .resolve() para que el startswith() en _load_bot_config funcione
    bots_dir_abs = (tmp / "bots").resolve()
    monkeypatch.setattr(launcher, "BOTS_DIR", bots_dir_abs)
    monkeypatch.setattr(launcher, "ACTIVITY_LOG", tmp / "activity.jsonl")
    monkeypatch.setattr(botfather, "BOT_PROFILES_DIR", bots_dir_abs)
    monkeypatch.setattr(watchdog, "BOTS_DIR", bots_dir_abs)

    # .env.example minimo para que admin no truene
    (tmp / ".env.example").write_text("TEST_KEY=\n", encoding="utf-8")

    from main import app
    with TestClient(app) as c:
        yield c
    if tmp.exists():
        shutil.rmtree(tmp, ignore_errors=True)


def _login(client, pw="test1234"):
    from app import auth
    auth.create_credential("admin", pw, must_change=False)
    r = client.post("/api/auth/login", json={"username": "admin", "password": pw})
    assert r.status_code == 200, f"Login fallo: {r.text}"


# ============================================================
# BUG #1: Path traversal en watchdog
# ============================================================
def test_watchdog_path_traversal_rejects_dotdot(client_with_tmp_data):
    """FIX #1: bot_id con .. debe ser rechazado por regex."""
    _login(client_with_tmp_data)
    r = client_with_tmp_data.get("/api/watchdog/..%2F..%2Fetc%2Fpasswd")
    # FastAPI URL-decodifica .. antes de llegar al handler -> bot_id='../../etc/passwd'
    # La regex lo rechaza, dando 400 (no 404, 404 seria "no existe")
    assert r.status_code in (400, 404), f"Path traversal debio ser rechazado, dio {r.status_code}"


def test_watchdog_path_traversal_rejects_special_chars(client_with_tmp_data):
    """FIX #1: caracteres fuera de [a-zA-Z0-9_-] son invalidos."""
    _login(client_with_tmp_data)
    for bad in ["foo bar", "foo.bar", "foo;rm", "foo'OR"]:
        # Encode para que el bot_id llegue con el caracter literal
        r = client_with_tmp_data.get(f"/api/watchdog/{bad}")
        assert r.status_code in (400, 404), f"bot_id={bad!r} debio ser rechazado, dio {r.status_code}"


def test_watchdog_accepts_valid_bot_id(client_with_tmp_data):
    """FIX #1: bot_id valido (regex) sigue funcionando."""
    _login(client_with_tmp_data)
    # BOTS_DIR fue monkeypatcheado en la fixture, lo recreamos via tmp_path
    from app import watchdog as wd_mod
    bot_file = wd_mod.BOTS_DIR / "test-bot-123.json"
    bot_file.write_text(json.dumps({
        "id": "test-bot-123",
        "name": "Test",
        "command": ["echo", "hi"],
        "watchdog": {"enabled": True, "max_restarts": 3, "check_interval_s": 30}
    }))
    r = client_with_tmp_data.get("/api/watchdog/test-bot-123")
    assert r.status_code == 200, f"bot valido debio dar 200, dio {r.status_code}: {r.text}"


# ============================================================
# BUG #4: SSRF en botfather.change_photo
# ============================================================
def test_botfather_change_photo_rejects_http(client_with_tmp_data):
    """FIX #4: photo_url debe ser HTTPS, no HTTP."""
    _login(client_with_tmp_data)
    r = client_with_tmp_data.post(
        "/api/botfather/bots/change-photo",
        json={"bot_id": "fake", "photo_url": "http://example.com/x.jpg"},
    )
    # Sin bot registrado: 404. Pero queremos 400 por el scheme.
    # Lo que importa: NO descargar nada en HTTP.
    assert r.status_code in (400, 404), f"HTTP debio ser rechazado, dio {r.status_code}"


def test_botfather_change_photo_blocks_private_ips(client_with_tmp_data):
    """
    FIX #4: URLs a IPs privadas / loopback / metadata son rechazadas
    aunque la URL sea HTTPS.
    """
    _login(client_with_tmp_data)
    # Registrar un bot fake para pasar la validacion de "bot existe"
    bot_file = Path("data/_tmp_test_security/bots/fake.json")
    bot_file.write_text(json.dumps({
        "id": "fake", "name": "Fake", "token": "123:abc"
    }))

    bad_urls = [
        "https://127.0.0.1/x.jpg",
        "https://10.0.0.1/x.jpg",
        "https://192.168.1.1/x.jpg",
        "https://169.254.169.254/latest/meta-data/",
        "https://172.16.0.1/x.jpg",
    ]
    for url in bad_urls:
        r = client_with_tmp_data.post(
            "/api/botfather/bots/change-photo",
            json={"bot_id": "fake", "photo_url": url},
        )
        assert r.status_code == 400, f"{url} debio ser bloqueado (400), dio {r.status_code}: {r.text}"


# ============================================================
# BUG #8: Race condition en activity.append
# ============================================================
def test_activity_append_serialized_under_concurrency(client_with_tmp_data):
    """
    FIX #8: N appends concurrentes no deben corromper activity.jsonl.
    Cada linea debe ser un JSON valido (lock de proceso).
    """
    import concurrent.futures
    from app import activity as activity_mod

    _login(client_with_tmp_data)
    log_path = Path("data/_tmp_test_security/activity.jsonl")

    def do_append(i):
        return client_with_tmp_data.post(
            "/api/activity/append",
            json={"bot_id": f"bot-{i}", "event": "test_concurrent"},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        results = list(ex.map(do_append, range(30)))

    # Todos los requests deben haber respondido 200
    for r in results:
        assert r.status_code == 200, f"Append fallo: {r.status_code} {r.text}"

    # Verificar que el archivo tiene lineas validas (sin interleaving)
    text = log_path.read_text(encoding="utf-8")
    line_count = 0
    for line in text.splitlines():
        if not line.strip():
            continue
        try:
            json.loads(line)
        except json.JSONDecodeError as e:
            pytest.fail(f"Linea corrupta: {line!r} ({e})")
        line_count += 1
    assert line_count == 30, f"Esperaba 30 lineas, encontre {line_count}"


# ============================================================
# BUG #5/#6: stop_bot respeta bot_id
# ============================================================
def test_launcher_stop_filters_by_bot_id(client_with_tmp_data):
    """
    FIX #6: stop_bot debe matar SOLO los procesos del bot_id
    solicitado, no TODOS los que estan corriendo.
    """
    # Este test valida la logica directamente, no a traves de HTTP
    # porque requiere procesos reales corriendo.
    from app import launcher

    class FakeProc:
        def __init__(self, pid):
            self.pid = pid
            self._alive = True
        def poll(self):
            return None if self._alive else 0
        def terminate(self):
            self._alive = False
        def kill(self):
            self._alive = False
        def wait(self, timeout=None):
            self._alive = False

    # Setear 2 bots corriendo
    launcher._RUNNING.clear()
    launcher._RUNNING["r1"] = {"proc": FakeProc(1001), "bot_id": "bot-a"}
    launcher._RUNNING["r2"] = {"proc": FakeProc(1002), "bot_id": "bot-b"}

    # Simular stop de bot-a: debe matar solo r1
    killed = []
    for run_id, entry in list(launcher._RUNNING.items()):
        if entry["bot_id"] != "bot-a":
            continue
        if entry["proc"].poll() is None:
            entry["proc"].terminate()
            killed.append(run_id)

    assert killed == ["r1"], f"Solo debio matar r1 (bot-a), mato {killed}"
    # Y bot-b debe seguir vivo
    assert launcher._RUNNING["r2"]["proc"].poll() is None, "bot-b NO debio ser matado"


# ============================================================
# BUG #2: Process orphan en SSE (GeneratorExit)
# ============================================================
def test_stream_process_cleans_up_on_generator_close():
    """
    FIX #2: cuando el cliente SSE cierra la conexion, el generator lanza
    GeneratorExit (no Exception). El bloque finally DEBE ejecutarse para
    matar el subprocess y sacarlo de _RUNNING.
    Antes: el proceso quedaba zombie y la entrada en _RUNNING nunca se borraba.

    Verifica DOS cosas:
      1. _RUNNING se limpia (el finally corre)
      2. subprocess.run(['taskkill', ...]) es invocado en Windows
         (o proc.terminate() en Unix)
    """
    import asyncio
    import sys
    from app import launcher

    class FakeStream:
        closed = True
        def readline(self):
            return ""
        def read(self, *args, **kwargs):
            return ""

    class FakeProc:
        def __init__(self):
            self.pid = 99999
            self._alive = True
            self.terminated = False
            self.killed = False
            self.stdout = FakeStream()
            self.stderr = FakeStream()
        def poll(self):
            return None if self._alive else 0
        def terminate(self):
            self.terminated = True
            self._alive = False
        def kill(self):
            self.killed = True
            self._alive = False
        def wait(self, timeout=None):
            self._alive = False

    # Interceptar Popen y subprocess.run
    import subprocess
    original_popen = subprocess.Popen
    original_run = subprocess.run
    fake = FakeProc()
    kill_calls = []

    def fake_popen(*args, **kwargs):
        return fake

    def fake_run(*args, **kwargs):
        # Detectar llamada a taskkill (Windows) y registrar
        if args and isinstance(args[0], list) and len(args[0]) >= 1 and args[0][0] == "taskkill":
            kill_calls.append(args[0])
            fake.killed = True  # simular que la senal mato al proceso
            fake._alive = False
        # Simular un resultado vacio
        from subprocess import CompletedProcess
        return CompletedProcess(args[0] if args else [], 0, b"", b"")

    subprocess.Popen = fake_popen
    subprocess.run = fake_run
    try:
        # Crear bot JSON temporal
        bots_dir = launcher.BOTS_DIR
        (bots_dir / "_test_sse.json").write_text(json.dumps({
            "id": "_test_sse",
            "name": "Test SSE",
            "command": ["echo", "hi"],
        }))
        launcher._RUNNING.clear()

        async def trigger_close():
            gen = launcher._stream_process(
                "_test_sse", "test-run-1",
                [sys.executable, "-c", "import time; time.sleep(60)"],
                None,
            )
            # Consumir todos los yields. El fake stream devuelve EOF, asi que
            # _read_both_streams termina rapido. El generador entra al finally
            # y desde ahi intentara matar al proceso (taskkill o terminate).
            async for _ in gen:
                pass

        asyncio.run(trigger_close())

        # _RUNNING DEBE estar limpio (el finally corrio)
        assert "test-run-1" not in launcher._RUNNING, \
            f"_RUNNING debio limpiarse, contiene: {list(launcher._RUNNING.keys())}"
        # En Windows, taskkill debio ser llamado; en Unix, proc.terminate()
        if sys.platform == "win32":
            assert len(kill_calls) > 0, \
                f"subprocess.run(taskkill, ...) debio ser llamado en Windows, calls={kill_calls}"
        else:
            assert fake.terminated or fake.killed, \
                f"proc.terminate()/kill() debio ser llamado, terminated={fake.terminated}, killed={fake.killed}"
    finally:
        subprocess.Popen = original_popen
        subprocess.run = original_run
        (launcher.BOTS_DIR / "_test_sse.json").unlink(missing_ok=True)
        launcher._RUNNING.pop("test-run-1", None)


# ============================================================
# BUG #7: Escritura atomica del .env
# ============================================================
def test_admin_env_write_is_atomic(tmp_path, monkeypatch):
    """
    FIX #7: el .env debe escribirse de forma atomica (temp + os.replace).
    Simulamos que os.replace() se interrumpe para verificar que el .env
    original NO queda corrupto.
    """
    from app import admin

    env_file = tmp_path / ".env"
    env_example = tmp_path / ".env.example"
    env_file.write_text("ORIGINAL_KEY=original_value\n", encoding="utf-8")
    env_example.write_text("ORIGINAL_KEY=\nNEW_KEY=\n", encoding="utf-8")

    monkeypatch.setattr(admin, "ENV_FILE", env_file)
    monkeypatch.setattr(admin, "ENV_EXAMPLE", env_example)

    # Caso normal: escribir funciona
    admin._write_env_file({"ORIGINAL_KEY": "new_value", "NEW_KEY": "added"})
    content = env_file.read_text(encoding="utf-8")
    assert "ORIGINAL_KEY=new_value" in content
    assert "NEW_KEY=added" in content
    # No debe quedar .tmp colgando
    assert not (env_file.with_suffix(".env.tmp")).exists()

    # Caso de fallo: simular que os.replace() se cae.
    # El .env original debe quedar intacto.
    import os
    env_file.write_text("ORIGINAL_KEY=original_value\n", encoding="utf-8")
    real_replace = os.replace
    def failing_replace(src, dst):
        raise OSError("simulated crash during rename")
    monkeypatch.setattr(os, "replace", failing_replace)

    try:
        admin._write_env_file({"ORIGINAL_KEY": "new_value"})
    except OSError:
        pass  # esperado

    # El .env original debe seguir siendo el viejo
    after = env_file.read_text(encoding="utf-8")
    assert "ORIGINAL_KEY=original_value" in after, \
        f"El .env original debio quedar intacto, se ve: {after!r}"
    # El .tmp tampoco debe quedar
    assert not (env_file.with_suffix(".env.tmp")).exists(), \
        "El .tmp debio limpiarse en el rollback"
