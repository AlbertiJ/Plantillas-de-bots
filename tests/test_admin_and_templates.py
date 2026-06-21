"""
============================================
tests/test_admin_and_templates.py
============================================

Verifica que:
  - /api/admin/tokens lista, enmascara y actualiza tokens del .env
  - /api/ctf-templates/ lista, filtra y renderiza comandos
  - El bug de seguridad más típico: un user no autenticado NO puede
    tocar tokens ni ver templates
"""
import json
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client_with_tmp_env(monkeypatch):
    """Cliente FastAPI con .env y templates.json en dirs temporales."""
    tmp = Path(tempfile.mkdtemp())
    env_file = tmp / ".env"
    env_file.write_text(
        "TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11\n"
        "SHERLOCK_API_KEY=\n"
        "NUCLEI_API_KEY=secret-nuclei-key\n"
        "ENV=development\n",
        encoding="utf-8",
    )

    # Reimportar admin con el path parcheado
    from app import admin as admin_mod
    monkeypatch.setattr(admin_mod, "ENV_FILE", env_file)
    monkeypatch.setattr(admin_mod, "ENV_EXAMPLE", env_file)

    # Reimportar ctf_templates con path parcheado
    templates_file = tmp / "ctf_templates.json"
    templates_file.write_text(json.dumps({
        "version": "1.0.0",
        "templates": [
            {
                "id": "nmap-test",
                "name": "Nmap test",
                "category": "scanning",
                "tool": "nmap",
                "description": "Escaneo de prueba",
                "command": ["nmap", "-p", "{port}", "{target}"],
                "args": [
                    {"name": "port", "required": True, "placeholder": "80"},
                    {"name": "target", "required": True, "placeholder": "127.0.0.1"},
                ],
                "tags": ["test"],
            }
        ],
        "categories": [{"id": "scanning", "name": "Escaneo", "icon": "X"}],
    }), encoding="utf-8")
    from app import ctf_templates as tmpl_mod
    monkeypatch.setattr(tmpl_mod, "TEMPLATES_FILE", templates_file)

    # Reimportar main
    import importlib
    import main as main_mod
    importlib.reload(main_mod)
    monkeypatch.setattr(main_mod, "_ensure_admin_credentials", lambda: None)

    client = TestClient(main_mod.app)
    yield client, env_file, templates_file

    shutil.rmtree(tmp, ignore_errors=True)


def _login(client, pw="test1234"):
    """Helper: login y devuelve cookies."""
    from app import auth
    auth.create_credential("admin", pw, must_change=False)
    client.post("/api/auth/login", json={"username": "admin", "password": pw})
    return client


# ============================================================
# Admin
# ============================================================
def test_admin_list_tokens_enmascara_sensibles(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.get("/api/admin/tokens")
    assert r.status_code == 200
    tokens = {t["key"]: t for t in r.json()}

    # Telegram enmascarado (sensible)
    assert tokens["TELEGRAM_BOT_TOKEN"]["is_sensitive"] is True
    assert tokens["TELEGRAM_BOT_TOKEN"]["is_set"] is True
    assert tokens["TELEGRAM_BOT_TOKEN"]["masked_value"].startswith("*")
    # el value real NO debe filtrarse
    assert "ABC-DEF1234ghIkl" not in tokens["TELEGRAM_BOT_TOKEN"]["masked_value"]

    # Nuclei enmascarado
    assert tokens["NUCLEI_API_KEY"]["masked_value"].startswith("*")
    assert "secret-nuclei" not in tokens["NUCLEI_API_KEY"]["masked_value"]


def test_admin_update_token_persiste_en_env(client_with_tmp_env):
    client, env_file, _ = client_with_tmp_env
    _login(client)

    r = client.put("/api/admin/tokens", json={
        "updates": {"SHERLOCK_API_KEY": "nueva-clave-sherlock"}
    })
    assert r.status_code == 200

    # Verificar que quedó en el archivo
    content = env_file.read_text()
    assert "SHERLOCK_API_KEY=nueva-clave-sherlock" in content


def test_admin_update_rechaza_keys_no_editables(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.put("/api/admin/tokens", json={"updates": {"PATH": "/hack"}})
    assert r.status_code == 400
    assert "no editable" in r.json()["detail"]


def test_admin_update_borra_con_string_vacio(client_with_tmp_env):
    client, env_file, _ = client_with_tmp_env
    _login(client)

    r = client.put("/api/admin/tokens", json={"updates": {"NUCLEI_API_KEY": ""}})
    assert r.status_code == 200
    assert "NUCLEI_API_KEY" not in env_file.read_text() or "NUCLEI_API_KEY=" in env_file.read_text()


def test_admin_sin_auth_rechaza(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    r = client.get("/api/admin/tokens")
    assert r.status_code == 401


# ============================================================
# CTF Templates
# ============================================================
def test_templates_list_todos(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.get("/api/ctf-templates/")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["templates"][0]["id"] == "nmap-test"


def test_templates_filtrar_por_categoria(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.get("/api/ctf-templates/?category=scanning")
    assert r.status_code == 200
    assert r.json()["total"] == 1

    r = client.get("/api/ctf-templates/?category=osint")
    assert r.json()["total"] == 0


def test_templates_filtrar_por_search(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.get("/api/ctf-templates/?search=nmap")
    assert r.json()["total"] == 1

    r = client.get("/api/ctf-templates/?search=zzz")
    assert r.json()["total"] == 0


def test_templates_get_by_id(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.get("/api/ctf-templates/nmap-test")
    assert r.status_code == 200
    assert r.json()["tool"] == "nmap"

    r = client.get("/api/ctf-templates/no-existe")
    assert r.status_code == 404


def test_templates_render_reemplaza_placeholders(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.post(
        "/api/ctf-templates/nmap-test/render",
        json={"port": "22,80,443", "target": "10.0.0.1"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["command"] == ["nmap", "-p", "22,80,443", "10.0.0.1"]
    assert "nmap -p 22,80,443 10.0.0.1" in body["command_str"]


def test_templates_render_falla_si_falta_required(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.post(
        "/api/ctf-templates/nmap-test/render",
        json={"port": "80"},  # falta target (required)
    )
    assert r.status_code == 400
    assert "target" in r.json()["detail"]


def test_templates_sin_auth_rechaza(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    r = client.get("/api/ctf-templates/")
    assert r.status_code == 401


def test_templates_categories_con_conteo(client_with_tmp_env):
    client, _, _ = client_with_tmp_env
    _login(client)

    r = client.get("/api/ctf-templates/categories")
    assert r.status_code == 200
    cats = {c["id"]: c for c in r.json()["categories"]}
    assert cats["scanning"]["count"] == 1
