"""
============================================
tests/test_auth_reset.py — Regresión del bug del reset
============================================

Bug original: el endpoint /api/auth/reset no borraba
data/credentials/ y solo flageaba must_change=True, así que
si el usuario olvidaba la clave, no podía volver a entrar.

Este test verifica que el fix borra TODO y regenera una clave nueva.
"""
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client_with_tmp_credentials(monkeypatch):
    """Crea un cliente FastAPI con un CREDENTIALS_DIR temporal."""
    tmp = Path(tempfile.mkdtemp())
    cred_dir = tmp / "credentials"
    cred_dir.mkdir()

    # Crear credencial inicial fake
    (cred_dir / "cred-admin.json").write_text(
        '{"username":"admin","password_hash":"$2b$12$fake","must_change":false}',
        encoding="utf-8",
    )

    # Reimportar auth con el path parcheado
    from app import auth
    monkeypatch.setattr(auth, "CREDENTIALS_DIR", cred_dir)

    # Reimportar main con el path parcheado
    import importlib
    import main as main_mod
    monkeypatch.setattr(main_mod, "CREDENTIALS_DIR", cred_dir)
    importlib.reload(main_mod)

    # Evitar que el lifespan cree una credencial nueva antes del test
    monkeypatch.setattr(main_mod, "_ensure_admin_credentials", lambda: None)

    client = TestClient(main_mod.app)
    yield client, cred_dir

    shutil.rmtree(tmp, ignore_errors=True)


def test_reset_borra_y_regenera(client_with_tmp_credentials):
    client, cred_dir = client_with_tmp_credentials

    # 1. Verificar que existe la credencial vieja
    assert (cred_dir / "cred-admin.json").exists()

    # 2. Llamar al reset
    resp = client.post("/api/auth/reset", json={"confirm": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["must_change"] is True
    assert "new_password" in body
    assert len(body["new_password"]) >= 16  # token_urlsafe(16) ≈ 22 chars

    # 3. Verificar que la credencial vieja YA NO EXISTE
    #    (el bug era exactamente esto: la vieja seguía ahí y la nueva no se podía usar)
    # Después del reset, el archivo cred-admin.json existe pero con la NUEVA password
    assert (cred_dir / "cred-admin.json").exists()
    import json
    new_cred = json.loads((cred_dir / "cred-admin.json").read_text())
    assert new_cred["password_hash"] != "$2b$12$fake"
    assert new_cred["must_change"] is True


def test_reset_sin_confirm_rechaza(client_with_tmp_credentials):
    client, _ = client_with_tmp_credentials
    resp = client.post("/api/auth/reset", json={"confirm": False})
    assert resp.status_code == 400
    assert "confirm" in resp.json()["detail"].lower()


def test_login_con_clave_temporal_falla_si_no_se_cambia(client_with_tmp_credentials):
    """
    El flujo debe ser:
    1. Reset → nueva clave aleatoria
    2. Login con esa clave → ok, must_change=True
    3. Intentar entrar a /admin sin cambiar → forzar redirect a /change
    """
    client, _ = client_with_tmp_credentials

    reset = client.post("/api/auth/reset", json={"confirm": True})
    new_pw = reset.json()["new_password"]

    login = client.post("/api/auth/login", json={"username": "admin", "password": new_pw})
    assert login.status_code == 200
    assert login.json()["must_change"] is True


def test_change_password_actualiza_y_desbloquea(client_with_tmp_credentials):
    client, _ = client_with_tmp_credentials
    reset = client.post("/api/auth/reset", json={"confirm": True})
    old_pw = reset.json()["new_password"]

    client.post("/api/auth/login", json={"username": "admin", "password": old_pw})
    change = client.post(
        "/api/auth/change",
        json={"old_password": old_pw, "new_password": "nueva-clave-12345"},
    )
    assert change.status_code == 200
    assert change.json()["must_change"] is False

    # Relogin con la nueva
    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200
    relogin = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "nueva-clave-12345"},
    )
    assert relogin.status_code == 200
    assert relogin.json()["must_change"] is False
