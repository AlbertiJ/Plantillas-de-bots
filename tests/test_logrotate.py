"""
============================================
tests/test_logrotate.py — Tests del logrotate automatico
============================================

Cubre Q4 del ROADMAP.md.
"""
import json
import shutil
from pathlib import Path

import pytest


@pytest.fixture
def activity_module(tmp_path, monkeypatch):
    """Modulo activity con paths temporales."""
    from app import activity
    log_path = tmp_path / "activity.jsonl"
    monkeypatch.setattr(activity, "ACTIVITY_LOG", log_path)
    monkeypatch.setattr(activity, "LOGROTATE_MAX_BYTES", 1024)  # 1 KB para test
    monkeypatch.setattr(activity, "LOGROTATE_KEEP_FILES", 3)
    monkeypatch.setattr(activity, "LOGROTATE_CHECK_EVERY", 1)
    activity._ROTATE_COUNTER = 0
    yield activity
    if tmp_path.exists():
        shutil.rmtree(tmp_path, ignore_errors=True)


def test_logrotate_no_op_si_archivo_chico(activity_module):
    """No rota si el archivo esta por debajo del umbral."""
    activity_module._append({"bot_id": "b1", "event": "x"})
    assert activity_module.ACTIVITY_LOG.exists()
    assert not (activity_module.ACTIVITY_LOG.parent / "activity.jsonl.1").exists()


def test_logrotate_se_activa_al_superar_umbral(activity_module):
    """Cuando el log supera LOGROTATE_MAX_BYTES, se rota a .1."""
    # Llenar el archivo con appends grandes para superar 1KB rapido
    big_entry = {"bot_id": "x" * 200, "event": "y" * 200, "data": "z" * 200}
    for _ in range(20):
        activity_module._append(big_entry)

    # Debe haberse rotado al menos una vez
    rotated = activity_module.ACTIVITY_LOG.parent / "activity.jsonl.1"
    assert rotated.exists(), "El archivo debio rotarse a activity.jsonl.1"


def test_logrotate_cascada(activity_module):
    """Cada rotacion mueve los archivos .N a .N+1."""
    # Forzar rotaciones directas (mas rapido que appends)
    activity_module._rotate_now()
    activity_module._rotate_now()
    activity_module._rotate_now()

    # Deben existir .1, .2 y .3
    for i in range(1, 4):
        path = activity_module.ACTIVITY_LOG.parent / f"activity.jsonl.{i}"
        # Sin archivo de log no se rota nada, asi que tenemos que crear uno primero
        # Re-crear la logica: si no hay log, _rotate_now devuelve False
        # Asi que primero creamos el log, despues rotamos
    # Crear log y rotar varias veces
    activity_module.ACTIVITY_LOG.write_text('{"x":1}\n' * 100, encoding="utf-8")
    activity_module._rotate_now()
    activity_module.ACTIVITY_LOG.write_text('{"x":1}\n' * 100, encoding="utf-8")
    activity_module._rotate_now()
    activity_module.ACTIVITY_LOG.write_text('{"x":1}\n' * 100, encoding="utf-8")
    activity_module._rotate_now()

    # Deben existir .1, .2 y .3
    for i in range(1, 4):
        path = activity_module.ACTIVITY_LOG.parent / f"activity.jsonl.{i}"
        assert path.exists(), f"activity.jsonl.{i} debio existir despues de varias rotaciones"


def test_logrotate_borra_el_mas_viejo(activity_module):
    """Cuando se supera LOGROTATE_KEEP_FILES, se borra el mas viejo."""
    # Bajar KEEP_FILES a 2 para test rapido
    activity_module.LOGROTATE_KEEP_FILES = 2
    # Crear log y rotar mas veces que KEEP_FILES
    for _ in range(5):
        activity_module.ACTIVITY_LOG.write_text('{"x":1}\n' * 100, encoding="utf-8")
        activity_module._rotate_now()

    # Solo deben quedar .1 y .2
    assert (activity_module.ACTIVITY_LOG.parent / "activity.jsonl.1").exists()
    assert (activity_module.ACTIVITY_LOG.parent / "activity.jsonl.2").exists()
    # .3, .4, .5 NO deben existir
    for i in range(3, 6):
        path = activity_module.ACTIVITY_LOG.parent / f"activity.jsonl.{i}"
        assert not path.exists(), f"activity.jsonl.{i} no debio existir"


def test_rotate_now_endpoint(monkeypatch, tmp_path):
    """Q4: POST /api/activity/rotate fuerza una rotacion."""
    from fastapi.testclient import TestClient
    from app import activity, auth
    import shutil

    # Setup paths temporales
    if tmp_path.exists():
        shutil.rmtree(tmp_path)
    (tmp_path / "credentials").mkdir(parents=True, exist_ok=True)
    log_path = tmp_path / "activity.jsonl"

    monkeypatch.setattr(activity, "ACTIVITY_LOG", log_path)
    monkeypatch.setattr(auth, "CREDENTIALS_DIR", tmp_path / "credentials")

    from main import app
    with TestClient(app) as client:
        # Reset rate limit por si hay estado residual
        from app import ratelimit
        ratelimit.reset_rate_limit()

        auth.create_credential("admin", "test1234", must_change=False)
        log_path.write_text('{"bot_id":"test","event":"x"}\n' * 5, encoding="utf-8")

        # Login
        r = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "test1234"},
        )
        assert r.status_code == 200, f"login fallo: {r.text}"

        # Forzar rotacion
        r = client.post("/api/activity/rotate")
        assert r.status_code == 200, f"rotate fallo: {r.text}"
        body = r.json()
        assert body.get("rotated") is True

        # El archivo .1 debe existir
        assert (tmp_path / "activity.jsonl.1").exists()


def test_rotate_now_sin_archivo_es_noop(activity_module):
    """Si no hay archivo de log, _rotate_now devuelve rotated=False."""
    result = activity_module._rotate_now()
    assert result["rotated"] is False
