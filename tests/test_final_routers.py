"""
============================================
tests/test_final_routers.py
============================================

Verifica los 6 routers finales:
  - activity:  lectura/escritura de JSONL
  - builder:   CRUD de bots en data/bots/
  - ctf_osint: listado de bots OSINT preconfigurados
  - libraries: catalogo de librerias
  - watchdog:  start/stop de procesos supervisados
  - status:    metricas del sistema
"""
import json
import shutil
import tempfile
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client_with_tmp_data(monkeypatch):
    """Cliente con data/ y credentials/ temporales."""
    tmp = Path(tempfile.mkdtemp())
    data_dir = tmp / "data"
    creds_dir = data_dir / "credentials"
    bots_dir = data_dir / "bots"
    creds_dir.mkdir(parents=True)
    bots_dir.mkdir(parents=True)

    # Parchar paths en los modulos
    from app import activity as act_mod
    monkeypatch.setattr(act_mod, "ACTIVITY_LOG", data_dir / "activity.jsonl")
    monkeypatch.setattr(act_mod, "BASE_DIR", tmp)

    from app import builder as bld_mod
    monkeypatch.setattr(bld_mod, "BOTS_DIR", bots_dir)
    monkeypatch.setattr(bld_mod, "BASE_DIR", tmp)

    from app import ctf_osint as osint_mod
    osint_file = data_dir / "osint_bots.json"
    osint_file.write_text(json.dumps({
        "version": "1.0",
        "bots": [
            {"id": "test-osint", "name": "Test OSINT", "tool": "curl",
             "description": "Test", "command": ["curl", "{url}"],
             "args": [{"name": "url", "required": True}],
             "tags": ["test"], "category": "test"},
        ],
    }))
    monkeypatch.setattr(osint_mod, "BOTS_FILE", osint_file)
    monkeypatch.setattr(osint_mod, "BASE_DIR", tmp)

    from app import libraries as lib_mod
    libs_file = data_dir / "libraries.json"
    libs_file.write_text(json.dumps({
        "version": "1.0",
        "libraries": [
            {"name": "requests", "description": "HTTP", "install": "pip install requests", "tags": ["http"]},
            {"name": "scapy", "description": "Redes", "install": "pip install scapy", "tags": ["redes"]},
        ],
    }))
    monkeypatch.setattr(lib_mod, "LIBS_FILE", libs_file)
    monkeypatch.setattr(lib_mod, "BASE_DIR", tmp)

    from app import watchdog as wd_mod
    monkeypatch.setattr(wd_mod, "BOTS_DIR", bots_dir)
    monkeypatch.setattr(wd_mod, "BASE_DIR", tmp)

    from app import status as st_mod
    monkeypatch.setattr(st_mod, "ACTIVITY_LOG", data_dir / "activity.jsonl")
    monkeypatch.setattr(st_mod, "BASE_DIR", tmp)

    # Reload main
    import importlib
    import main as main_mod
    importlib.reload(main_mod)
    monkeypatch.setattr(main_mod, "_ensure_admin_credentials", lambda: None)

    client = TestClient(main_mod.app)
    yield client, data_dir, bots_dir

    # Cleanup: parar cualquier watchdog que quedo vivo
    from app import watchdog as wd_cleanup
    for w in list(wd_cleanup._MANAGER.values()):
        try:
            w.stop()
        except Exception:
            pass

    shutil.rmtree(tmp, ignore_errors=True)


def _login(client, pw="test1234"):
    from app import auth
    auth.create_credential("admin", pw, must_change=False)
    client.post("/api/auth/login", json={"username": "admin", "password": pw})


# ============================================================
# ACTIVITY
# ============================================================
def test_activity_list_vacia(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/activity/")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0
    assert body["items"] == []


def test_activity_append_y_listar(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/activity/append", json={
        "bot_id": "bot1", "event": "start", "run_id": "r1"
    })
    client.post("/api/activity/append", json={
        "bot_id": "bot1", "event": "done", "exit_code": 0, "duration_s": 1.2, "run_id": "r1"
    })
    r = client.get("/api/activity/")
    body = r.json()
    assert body["total"] == 2
    assert body["items"][0]["event"] == "start"
    assert body["items"][1]["event"] == "done"
    assert body["items"][1]["exit_code"] == 0


def test_activity_filtra_por_bot_y_event(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    for ev in ["start", "done", "error"]:
        client.post("/api/activity/append", json={
            "bot_id": "botA" if ev != "error" else "botB", "event": ev
        })

    r = client.get("/api/activity/?bot_id=botA")
    assert r.json()["total"] == 2

    r = client.get("/api/activity/?event=error")
    assert r.json()["total"] == 1


def test_activity_stats(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/activity/append", json={"bot_id": "x", "event": "start"})
    client.post("/api/activity/append", json={"bot_id": "y", "event": "start"})
    client.post("/api/activity/append", json={"bot_id": "x", "event": "done", "exit_code": 0})

    r = client.get("/api/activity/stats")
    body = r.json()
    assert body["total"] == 3
    assert body["unique_bots"] == 2
    assert body["events_by_type"]["start"] == 2


def test_activity_clear(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/activity/append", json={"bot_id": "x", "event": "start"})
    r = client.post("/api/activity/clear", json={"confirm": True})
    assert r.status_code == 200
    r = client.get("/api/activity/")
    assert r.json()["total"] == 0


def test_activity_clear_sin_confirm_rechaza(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.post("/api/activity/clear", json={"confirm": False})
    assert r.status_code == 400


def test_activity_sin_auth(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    r = client.get("/api/activity/")
    assert r.status_code == 401


# ============================================================
# BUILDER
# ============================================================
def test_builder_list_vacio(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/builder/")
    assert r.status_code == 200
    assert r.json() == {"bots": [], "total": 0}


def test_builder_crear_bot(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.post("/api/builder/", json={
        "id": "mi-bot",
        "name": "Mi Bot",
        "command": ["python", "scripts/mi_bot.py"],
    })
    assert r.status_code == 200
    assert r.json()["bot"]["id"] == "mi-bot"
    # El bot se persiste en disco
    assert (client_with_tmp_data[2] / "mi-bot.json").exists()


def test_builder_id_invalido_rechaza(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.post("/api/builder/", json={
        "id": "mi bot con espacios",
        "name": "X",
        "command": ["echo"],
    })
    # 422 = Pydantic rechaza el patrón, 400 = mi validador lo rechaza
    assert r.status_code in (400, 422)


def test_builder_token_invalido_rechaza(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.post("/api/builder/", json={
        "id": "bot-token-mal",
        "name": "X",
        "command": ["echo"],
        "token": "invalid-token-no-tiene-dos-puntos",
    })
    assert r.status_code == 400


def test_builder_crear_duplicado_409(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    bot = {"id": "dup", "name": "D", "command": ["echo"]}
    client.post("/api/builder/", json=bot)
    r = client.post("/api/builder/", json=bot)
    assert r.status_code == 409


def test_builder_get(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/builder/", json={"id": "g", "name": "G", "command": ["echo"]})
    r = client.get("/api/builder/g")
    assert r.status_code == 200
    assert r.json()["name"] == "G"


def test_builder_get_enmascara_token(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/builder/", json={
        "id": "t", "name": "T", "command": ["echo"],
        "token": "1234567890:ABCDEFG_token_secreto",
    })
    r = client.get("/api/builder/t")
    body = r.json()
    assert "ABCDEFG_token_secreto" not in body["token"]
    assert body["token"].startswith("*")


def test_builder_get_raw_devuelve_token_completo(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/builder/", json={
        "id": "raw", "name": "R", "command": ["echo"],
        "token": "1234567890:ABCDEFG_token_secreto",
    })
    r = client.get("/api/builder/raw/raw")
    body = r.json()
    assert body["token"] == "1234567890:ABCDEFG_token_secreto"


def test_builder_update(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/builder/", json={"id": "u", "name": "Original", "command": ["echo"]})
    r = client.put("/api/builder/u", json={"name": "Modificado"})
    assert r.status_code == 200
    assert r.json()["bot"]["name"] == "Modificado"


def test_builder_delete(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/builder/", json={"id": "del", "name": "D", "command": ["echo"]})
    r = client.delete("/api/builder/del")
    assert r.status_code == 200
    r = client.get("/api/builder/del")
    assert r.status_code == 404


def test_builder_duplicate(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    client.post("/api/builder/", json={"id": "orig", "name": "O", "command": ["echo"]})
    r = client.post("/api/builder/orig/duplicate?new_id=copia")
    assert r.status_code == 200
    assert r.json()["bot"]["id"] == "copia"
    assert "(copia)" in r.json()["bot"]["name"]


# ============================================================
# CTF OSINT
# ============================================================
def test_osint_list(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/ctf-osint/")
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["bots"][0]["id"] == "test-osint"


def test_osint_filtros(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/ctf-osint/?category=test")
    assert r.json()["total"] == 1
    r = client.get("/api/ctf-osint/?category=osint")
    assert r.json()["total"] == 0


def test_osint_get(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/ctf-osint/test-osint")
    assert r.status_code == 200
    assert r.json()["tool"] == "curl"


def test_osint_render(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.post("/api/ctf-osint/test-osint/render", json={"url": "https://example.com"})
    assert r.status_code == 200
    assert r.json()["command"] == ["curl", "https://example.com"]


def test_osint_render_falta_required(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.post("/api/ctf-osint/test-osint/render", json={})
    assert r.status_code == 400


def test_osint_categories(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/ctf-osint/categories")
    assert r.status_code == 200
    cats = {c["id"]: c["count"] for c in r.json()["categories"]}
    assert cats.get("test") == 1


# ============================================================
# LIBRARIES
# ============================================================
def test_libraries_list(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/libraries/")
    assert r.status_code == 200
    assert r.json()["total"] == 2


def test_libraries_search(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/libraries/?search=scapy")
    assert r.json()["total"] == 1
    assert r.json()["libraries"][0]["name"] == "scapy"


def test_libraries_tags(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/libraries/tags")
    assert r.status_code == 200
    tags = {t["name"]: t["count"] for t in r.json()["tags"]}
    assert tags["http"] == 1
    assert tags["redes"] == 1


def test_libraries_get_by_name(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/libraries/requests")
    assert r.status_code == 200
    r = client.get("/api/libraries/no-existe")
    assert r.status_code == 404


# ============================================================
# WATCHDOG
# ============================================================
def test_watchdog_list_vacio(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/watchdog/")
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_watchdog_start_y_stop(client_with_tmp_data):
    """Lanza un bot trivial (ping -n 30) y lo supervisa."""
    from app import watchdog as wd_mod
    wd_mod._MANAGER.clear()  # limpiar estado de tests anteriores

    client, _, bots_dir = client_with_tmp_data
    _login(client)
    if sys.platform == "win32":
        cmd = ["ping", "-n", "30", "127.0.0.1"]
    else:
        cmd = ["sleep", "30"]

    (bots_dir / "pinger.json").write_text(json.dumps({
        "id": "pinger",
        "name": "Pinger",
        "command": cmd,
        "watchdog": {"enabled": True, "restart_on_crash": False, "max_restarts": 3, "check_interval_s": 2},
    }))

    r = client.post("/api/watchdog/start", json={"bot_id": "pinger"})
    assert r.status_code == 200
    body = r.json()["watchdog"]
    assert body["alive"] is True
    assert body["pid"] is not None

    r = client.get("/api/watchdog/")
    assert r.json()["total"] == 1

    r = client.post("/api/watchdog/stop", json={"bot_id": "pinger"})
    assert r.status_code == 200

    r = client.get("/api/watchdog/")
    assert r.json()["total"] == 0


def test_watchdog_start_sin_habilitar_400(client_with_tmp_data):
    from app import watchdog as wd_mod
    wd_mod._MANAGER.clear()
    client, _, bots_dir = client_with_tmp_data
    _login(client)
    (bots_dir / "sinwd.json").write_text(json.dumps({
        "id": "sinwd", "name": "Sin WD", "command": ["echo"],
        "watchdog": {"enabled": False},
    }))
    r = client.post("/api/watchdog/start", json={"bot_id": "sinwd"})
    assert r.status_code == 400


def test_watchdog_stop_all(client_with_tmp_data):
    from app import watchdog as wd_mod
    wd_mod._MANAGER.clear()
    client, _, bots_dir = client_with_tmp_data
    _login(client)
    if sys.platform == "win32":
        cmd = ["ping", "-n", "30", "127.0.0.1"]
    else:
        cmd = ["sleep", "30"]

    for i in range(2):
        bid = f"bot{i}"
        (bots_dir / f"{bid}.json").write_text(json.dumps({
            "id": bid, "name": bid, "command": cmd,
            "watchdog": {"enabled": True, "restart_on_crash": False, "check_interval_s": 2},
        }))
        client.post("/api/watchdog/start", json={"bot_id": bid})

    assert client.get("/api/watchdog/").json()["total"] == 2

    r = client.post("/api/watchdog/stop-all", json={})
    # El body es dummy, el endpoint no usa WatchdogAction
    assert r.status_code == 200
    assert len(r.json()["stopped"]) == 2


# ============================================================
# STATUS
# ============================================================
def test_status_metricas(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/status/")
    assert r.status_code == 200
    body = r.json()
    assert "uptime_s" in body
    assert "bots_running" in body
    assert "system" in body
    assert body["system"]["platform"] in ("Windows", "Linux", "Darwin")


def test_status_health_sin_auth(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    r = client.get("/api/status/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_status_last_activity(client_with_tmp_data):
    client, data_dir, _ = client_with_tmp_data
    _login(client)
    # escribir una linea
    (data_dir / "activity.jsonl").write_text(
        json.dumps({"ts": "2026-06-15T20:00:00+00:00", "bot_id": "x", "event": "done"}) + "\n"
    )
    r = client.get("/api/status/")
    assert r.json()["last_activity"] == "2026-06-15T20:00:00+00:00"


def test_status_processes(client_with_tmp_data):
    client, _, _ = client_with_tmp_data
    _login(client)
    r = client.get("/api/status/processes")
    assert r.status_code == 200
    assert "processes" in r.json()
    # Al menos pytest esta corriendo
    assert r.json()["total"] > 0


# Fix el import arriba
import sys  # noqa: E402
