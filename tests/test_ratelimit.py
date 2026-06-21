"""
============================================
tests/test_ratelimit.py — Tests del rate limiter
============================================

Cubre Q2 y Q3 del ROADMAP.md: rate limit en login y launcher.

Sandbox: cada test resetea el state global del rate limiter.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def reset_state():
    """Limpia el state del rate limiter entre tests."""
    from app import ratelimit
    ratelimit.reset_rate_limit()
    yield
    ratelimit.reset_rate_limit()


@pytest.fixture
def client_with_tmp_data(monkeypatch, tmp_path):
    """Cliente con paths temporales."""
    import json
    import shutil
    from fastapi.testclient import TestClient
    from app import auth, activity, admin, watchdog, launcher, botfather

    if tmp_path.exists():
        shutil.rmtree(tmp_path)
    (tmp_path / "bots").mkdir(parents=True, exist_ok=True)
    (tmp_path / "credentials").mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(auth, "CREDENTIALS_DIR", tmp_path / "credentials")
    monkeypatch.setattr(activity, "ACTIVITY_LOG", tmp_path / "activity.jsonl")
    monkeypatch.setattr(admin, "ENV_FILE", tmp_path / ".env")
    monkeypatch.setattr(admin, "ENV_EXAMPLE", tmp_path / ".env.example")
    bots_dir_abs = (tmp_path / "bots").resolve()
    monkeypatch.setattr(launcher, "BOTS_DIR", bots_dir_abs)
    monkeypatch.setattr(launcher, "ACTIVITY_LOG", tmp_path / "activity.jsonl")
    monkeypatch.setattr(botfather, "BOT_PROFILES_DIR", bots_dir_abs)
    monkeypatch.setattr(watchdog, "BOTS_DIR", bots_dir_abs)
    (tmp_path / ".env.example").write_text("TEST_KEY=\n", encoding="utf-8")

    from main import app
    with TestClient(app) as c:
        yield c
    if tmp_path.exists():
        shutil.rmtree(tmp_path, ignore_errors=True)


# ============================================================
# Unit tests del modulo
# ============================================================
def test_check_rate_limit_primeros_n_pasan():
    """Los primeros N requests pasan, el (N+1) es rechazado."""
    from app import ratelimit
    for i in range(5):
        ratelimit.check_rate_limit("test:key", max_requests=5, window_s=60)
    # El sexto debe fallar
    with pytest.raises(ratelimit.RateLimitExceeded) as exc_info:
        ratelimit.check_rate_limit("test:key", max_requests=5, window_s=60)
    assert exc_info.value.max_requests == 5
    assert exc_info.value.retry_after_s > 0


def test_check_rate_limit_ventana_deslizante():
    """Requests viejos se olvidan despues de la ventana."""
    from app import ratelimit
    # Llenar el bucket con timestamps del pasado
    ratelimit.check_rate_limit("test:key2", max_requests=3, window_s=10, now=100.0)
    ratelimit.check_rate_limit("test:key2", max_requests=3, window_s=10, now=105.0)
    # El tercero en t=109 todavia entra (ventana es 10s)
    ratelimit.check_rate_limit("test:key2", max_requests=3, window_s=10, now=109.0)
    # En t=110 el primero (100.0) ya esta fuera de la ventana
    ratelimit.check_rate_limit("test:key2", max_requests=3, window_s=10, now=110.5)


def test_check_rate_limit_claves_independientes():
    """Keys distintas no se afectan entre si."""
    from app import ratelimit
    for i in range(3):
        ratelimit.check_rate_limit("user:1", max_requests=3, window_s=60)
    # user:1 esta lleno
    with pytest.raises(ratelimit.RateLimitExceeded):
        ratelimit.check_rate_limit("user:1", max_requests=3, window_s=60)
    # pero user:2 sigue libre
    ratelimit.check_rate_limit("user:2", max_requests=3, window_s=60)


def test_reset_rate_limit():
    """reset_rate_limit limpia el state."""
    from app import ratelimit
    for i in range(3):
        ratelimit.check_rate_limit("test:reset", max_requests=3, window_s=60)
    with pytest.raises(ratelimit.RateLimitExceeded):
        ratelimit.check_rate_limit("test:reset", max_requests=3, window_s=60)
    ratelimit.reset_rate_limit("test:reset")
    # Ahora pasa de nuevo
    ratelimit.check_rate_limit("test:reset", max_requests=3, window_s=60)


# ============================================================
# Integration tests: endpoint /api/auth/login
# ============================================================
def test_login_rate_limit_5_por_minuto(client_with_tmp_data):
    """Q2: el login rechaza con 429 despues de 5 intentos por minuto."""
    from app import auth
    auth.create_credential("admin", "test1234", must_change=False)

    # Los primeros 5 intentos pasan (con 401 por clave incorrecta, eso es OK)
    for i in range(5):
        r = client_with_tmp_data.post(
            "/api/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert r.status_code == 401, f"intento {i+1} debio dar 401, dio {r.status_code}"

    # El sexto intento debe ser 429
    r = client_with_tmp_data.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert r.status_code == 429, f"sexto intento debio dar 429, dio {r.status_code}"
    assert "Retry-After" in r.headers
    assert "Rate limit" in r.text or "rate" in r.text.lower()


def test_login_exitoso_tambien_cuenta(client_with_tmp_data):
    """Los login exitosos tambien cuentan para el rate limit."""
    from app import auth
    auth.create_credential("admin", "test1234", must_change=False)

    for i in range(5):
        r = client_with_tmp_data.post(
            "/api/auth/login",
            json={"username": "admin", "password": "test1234"},
        )
        assert r.status_code == 200

    # Sexto intento (con clave correcta) debe ser 429
    r = client_with_tmp_data.post(
        "/api/auth/login",
        json={"username": "admin", "password": "test1234"},
    )
    assert r.status_code == 429


# ============================================================
# Integration tests: endpoint /api/launcher/run
# ============================================================
def test_launcher_rate_limit_10_por_minuto(client_with_tmp_data, tmp_path):
    """Q3: el launcher rechaza con 429 despues de 10 corridas por minuto."""
    from app import auth, launcher
    import json

    auth.create_credential("admin", "test1234", must_change=False)
    # Crear bot JSON valido en el path monkeypatcheado de BOTS_DIR.
    # Usamos python en vez de echo porque echo no existe como binario en Windows.
    import sys
    bot_file = launcher.BOTS_DIR / "test-bot.json"
    bot_file.write_text(json.dumps({
        "id": "test-bot",
        "name": "Test Bot",
        "command": [sys.executable, "-c", "print('hi')"],
    }))

    # Login
    r = client_with_tmp_data.post(
        "/api/auth/login",
        json={"username": "admin", "password": "test1234"},
    )
    assert r.status_code == 200, f"login fallo: {r.text}"

    # El rate limit se chequea ANTES de abrir el stream, asi que 10
    # requests de /run/ deben devolver 200 (stream) y el 11 debe ser 429.
    for i in range(10):
        with client_with_tmp_data.stream("GET", "/api/launcher/run/test-bot") as r:
            # Solo nos importa el status, no el body
            assert r.status_code == 200, f"run {i+1} debio dar 200, dio {r.status_code}"
            # Cerrar rapido para no acumular subprocess
            r.close()

    # Onceavo intento debe ser 429
    r = client_with_tmp_data.get("/api/launcher/run/test-bot")
    assert r.status_code == 429, f"run 11 debio dar 429, dio {r.status_code}"
