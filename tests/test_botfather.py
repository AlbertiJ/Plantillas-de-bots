"""
============================================
tests/test_botfather.py
============================================

Verifica que:
  - /api/botfather/bots lista los JSONs de data/bots/ (con tokens enmascarados)
  - /api/botfather/template devuelve la plantilla
  - /api/botfather/bots/{id}/current llama a la API de Telegram con el token
    correcto (mockeamos httpx)
  - /api/botfather/bots/change-name valida longitud (1-64)
  - /api/botfather/bots/change-description valida longitud (<=512)
  - /api/botfather/bots/change-commands valida estructura
  - La API rechaza sin auth
"""
import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client_with_bots(monkeypatch):
    """Cliente con data/bots/ temporal que tiene 2 bots."""
    tmp = Path(tempfile.mkdtemp())
    bots_dir = tmp / "bots"
    bots_dir.mkdir()

    (bots_dir / "bot1.json").write_text(json.dumps({
        "id": "bot1",
        "name": "Bot Uno",
        "token": "111:AAA",
        "command": ["python", "uno.py"],
        "config_visual": {
            "name": "Bot Uno",
            "description": "Descripcion uno",
            "short_description": "Corta uno",
            "commands": [{"command": "start", "description": "Inicia"}],
        }
    }), encoding="utf-8")

    (bots_dir / "bot2.json").write_text(json.dumps({
        "id": "bot2",
        "name": "Bot Dos",
        "token": "222:BBB",
        "command": ["python", "dos.py"],
    }), encoding="utf-8")

    # Un archivo inválido que debe ignorarse
    (bots_dir / "garbage.json").write_text("{ no es json", encoding="utf-8")

    from app import botfather as bf
    monkeypatch.setattr(bf, "BOT_PROFILES_DIR", bots_dir)

    import importlib
    import main as main_mod
    importlib.reload(main_mod)
    monkeypatch.setattr(main_mod, "_ensure_admin_credentials", lambda: None)

    client = TestClient(main_mod.app)
    yield client, bots_dir

    shutil.rmtree(tmp, ignore_errors=True)


def _login(client):
    from app import auth
    auth.create_credential("admin", "test1234", must_change=False)
    client.post("/api/auth/login", json={"username": "admin", "password": "test1234"})


# ============================================================
# Tests
# ============================================================
def test_list_bots_enmascara_token(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    r = client.get("/api/botfather/bots")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2  # garbage.json no cuenta

    bot1 = next(b for b in body["bots"] if b["id"] == "bot1")
    assert bot1["name"] == "Bot Uno"
    # El token no debe aparecer completo (sólo los últimos 4 chars)
    assert "111" not in bot1["token"]   # el numero completo NO debe estar
    assert bot1["token"].startswith("*")


def test_template(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    r = client.get("/api/botfather/template")
    assert r.status_code == 200
    template = r.json()["template"]
    assert "token" in template
    assert "config_visual" in template
    assert "notes" in r.json()
    assert len(r.json()["notes"]) > 0


def test_change_name_valida_longitud(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    # Vacío -> 400
    r = client.post("/api/botfather/bots/change-name", json={"bot_id": "bot1", "name": ""})
    assert r.status_code == 400

    # Muy largo -> 400
    r = client.post("/api/botfather/bots/change-name", json={"bot_id": "bot1", "name": "x" * 65})
    assert r.status_code == 400


def test_change_description_valida_longitud(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    r = client.post("/api/botfather/bots/change-description",
                    json={"bot_id": "bot1", "description": "x" * 513})
    assert r.status_code == 400


def test_change_commands_valida_estructura(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    # Falta command o description
    r = client.post("/api/botfather/bots/change-commands",
                    json={"bot_id": "bot1", "commands": [{"command": "start"}]})
    assert r.status_code == 400

    # Comando > 32 chars
    r = client.post("/api/botfather/bots/change-commands",
                    json={"bot_id": "bot1", "commands": [{"command": "x" * 33, "description": "ok"}]})
    assert r.status_code == 400


def test_change_name_llama_telegram_con_token_correcto(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    # Mockeamos httpx para no pegar contra la API real
    fake_response = AsyncMock()
    fake_response.json = lambda: {"ok": True, "result": True}
    fake_response.raise_for_status = lambda: None

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.post = AsyncMock(return_value=fake_response)

        r = client.post("/api/botfather/bots/change-name",
                        json={"bot_id": "bot1", "name": "Nuevo nombre"})
        assert r.status_code == 200

        # Verificar que se llamó con el token correcto de bot1
        call_args = instance.post.call_args
        url = call_args[0][0]
        assert "bot111:AAA/setMyName" in url

        # Verificar el body
        body = call_args[1]["json"]
        assert body["name"] == "Nuevo nombre"


def test_change_name_bot_inexistente(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    r = client.post("/api/botfather/bots/change-name",
                    json={"bot_id": "no-existe", "name": "x"})
    assert r.status_code == 404


def test_sin_auth_rechaza(client_with_bots):
    client, _ = client_with_bots
    r = client.get("/api/botfather/bots")
    assert r.status_code == 401

    r = client.get("/api/botfather/template")
    assert r.status_code == 401


def test_apply_visual_config_aplica_todo(client_with_bots):
    client, _ = client_with_bots
    _login(client)

    fake_response = AsyncMock()
    fake_response.json = lambda: {"ok": True, "result": True}
    fake_response.raise_for_status = lambda: None

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.post = AsyncMock(return_value=fake_response)

        r = client.post("/api/botfather/bots/bot1/apply-config-visual")
        assert r.status_code == 200
        body = r.json()
        # bot1 tiene name, description, short_description y commands
        assert "name" in body["applied"]
        assert "description" in body["applied"]
        assert "short_description" in body["applied"]
        assert "commands" in body["applied"]
