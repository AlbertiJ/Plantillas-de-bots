"""
smoke_test.py — Smoke test end-to-end del server plantillas-de-bots.

Usa FastAPI TestClient (no arranca uvicorn). Verifica:
- GET / redirige a /login
- POST /api/auth/reset con confirm=True genera clave
- Login con la clave devuelve must_change=True
- /change-password carga correctamente (no 404)
- GET /api/admin/tokens devuelve 6 keys
- GET /api/ctf-templates/ devuelve 23 templates
- GET /api/libraries/ devuelve 21 libs
- GET /api/ctf-osint/ devuelve 6 bots
- GET /api/botfather/template no rompe

NO modifica nada del server. Solo reporta fallos.
"""
import sys
import traceback
from pathlib import Path

# Asegurar que el path incluye el root del proyecto
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from main import app


PASSED = 0
FAILED = 0
RESULTS = []


def record(name, ok, detail=""):
    global PASSED, FAILED
    status = "PASS" if ok else "FAIL"
    if ok:
        PASSED += 1
    else:
        FAILED += 1
    RESULTS.append((status, name, detail))
    print(f"[{status}] {name} :: {detail}")


def section(title):
    print(f"\n{'=' * 60}\n  {title}\n{'=' * 60}")


def safe_call(name, fn):
    """Wrapper que captura cualquier excepción y la reporta."""
    try:
        result = fn()
        return result
    except Exception as e:
        tb = traceback.format_exc()
        record(name, False, f"Excepción: {type(e).__name__}: {e}\n{tb}")
        return None


def main():
    section("1) GET / debe redirigir a /login (sin sesión)")
    with TestClient(app) as client:
        def _t1():
            r = client.get("/", follow_redirects=False)
            assert r.status_code in (302, 307), f"Esperaba redirect, recibí {r.status_code}"
            loc = r.headers.get("location", "")
            assert "login" in loc.lower(), f"Esperaba redirect a /login, recibí '{loc}'"
            return f"status={r.status_code} location={loc}"
        record("GET / → /login", safe_call("GET / → /login", _t1) is not None,
               safe_call("GET / → /login", _t1) or "")

    section("2) POST /api/auth/reset con confirm=True genera clave nueva")
    new_password = None
    with TestClient(app) as client:
        def _t2():
            r = client.post("/api/auth/reset", json={"confirm": True})
            assert r.status_code == 200, f"Esperaba 200, recibí {r.status_code}: {r.text}"
            data = r.json()
            assert data.get("ok") is True, f"Falta ok=True en response: {data}"
            assert "new_password" in data, f"Falta new_password en response: {data}"
            assert data.get("must_change") is True, f"must_change debería ser True: {data}"
            return data["new_password"]
        new_password = safe_call("POST /api/auth/reset confirm=True", _t2)
        if new_password:
            record("POST /api/auth/reset confirm=True", True,
                   f"new_password generado (len={len(new_password)})")

    section("3) Login con la clave nueva → must_change=True")
    session_cookie = None
    with TestClient(app) as client:
        def _t3():
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200, f"Login falló: {r.status_code} {r.text}"
            data = r.json()
            assert data.get("ok") is True, f"Falta ok=True: {data}"
            assert data.get("must_change") is True, f"Esperaba must_change=True, recibí {data.get('must_change')}"
            # capturar cookie de sesión
            sc = client.cookies.get("pdb_session_token")
            return f"ok=True, must_change=True, cookie={'<presente>' if sc else '<FALTA>'}"
        ok = safe_call("Login admin + clave nueva", _t3)
        if ok:
            record("Login admin + clave nueva", True, ok)

    section("4) /change-password debe cargar (no 404)")
    with TestClient(app) as client:
        def _t4_setup():
            # Re-login para tener sesión en este client
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200, f"Re-login falló: {r.status_code}"

        def _t4():
            r = client.get("/change-password", follow_redirects=False)
            # debe ser 200 (con sesión) o redirect a /login si la cookie no viajó
            assert r.status_code == 200, (
                f"Esperaba 200, recibí {r.status_code} "
                f"(location={r.headers.get('location', '')})"
            )
            body = r.text.lower()
            assert "change" in body or "password" in body or "cambiar" in body or "clave" in body, (
                f"Respuesta no parece la página de cambio de clave. "
                f"Primeros 200 chars: {r.text[:200]!r}"
            )
            return f"status=200, body_len={len(r.text)}"
        safe_call("Re-login setup", _t4_setup)
        record("/change-password carga (no 404)", safe_call("/change-password", _t4) is not None,
               safe_call("/change-password", _t4) or "")

    section("5) GET /api/admin/tokens devuelve 6 keys")
    with TestClient(app) as client:
        def _t5_setup():
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200

        def _t5():
            r = client.get("/api/admin/tokens")
            assert r.status_code == 200, f"Esperaba 200, recibí {r.status_code}: {r.text}"
            data = r.json()
            assert isinstance(data, list), f"Esperaba list, recibí {type(data).__name__}"
            assert len(data) == 6, f"Esperaba 6 keys, recibí {len(data)}: {[t.get('key') for t in data]}"
            keys = sorted(t["key"] for t in data)
            return f"keys={keys}"
        safe_call("Login admin (admin)", _t5_setup)
        record("GET /api/admin/tokens", safe_call("GET /api/admin/tokens", _t5) is not None,
               safe_call("GET /api/admin/tokens", _t5) or "")

    section("6) GET /api/ctf-templates/ devuelve 23 templates")
    with TestClient(app) as client:
        def _t6_setup():
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200

        def _t6():
            r = client.get("/api/ctf-templates/")
            assert r.status_code == 200, f"Esperaba 200, recibí {r.status_code}: {r.text}"
            data = r.json()
            assert "templates" in data, f"Falta 'templates' en response: {list(data.keys())}"
            tpl = data["templates"]
            assert len(tpl) == 23, f"Esperaba 23 templates, recibí {len(tpl)}"
            return f"total={data.get('total')}, version={data.get('version')}"
        safe_call("Login admin (ctf)", _t6_setup)
        record("GET /api/ctf-templates/", safe_call("GET /api/ctf-templates/", _t6) is not None,
               safe_call("GET /api/ctf-templates/", _t6) or "")

    section("7) GET /api/libraries/ devuelve 21 libs")
    with TestClient(app) as client:
        def _t7_setup():
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200

        def _t7():
            r = client.get("/api/libraries/")
            assert r.status_code == 200, f"Esperaba 200, recibí {r.status_code}: {r.text}"
            data = r.json()
            assert "libraries" in data, f"Falta 'libraries' en response: {list(data.keys())}"
            libs = data["libraries"]
            assert len(libs) == 21, f"Esperaba 21 libs, recibí {len(libs)}"
            return f"total={data.get('total')}, version={data.get('version')}"
        safe_call("Login admin (libraries)", _t7_setup)
        record("GET /api/libraries/", safe_call("GET /api/libraries/", _t7) is not None,
               safe_call("GET /api/libraries/", _t7) or "")

    section("8) GET /api/ctf-osint/ devuelve 6 bots")
    with TestClient(app) as client:
        def _t8_setup():
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200

        def _t8():
            r = client.get("/api/ctf-osint/")
            assert r.status_code == 200, f"Esperaba 200, recibí {r.status_code}: {r.text}"
            data = r.json()
            assert "bots" in data, f"Falta 'bots' en response: {list(data.keys())}"
            bots = data["bots"]
            assert len(bots) == 6, f"Esperaba 6 bots, recibí {len(bots)}"
            return f"total={data.get('total')}, version={data.get('version')}"
        safe_call("Login admin (osint)", _t8_setup)
        record("GET /api/ctf-osint/", safe_call("GET /api/ctf-osint/", _t8) is not None,
               safe_call("GET /api/ctf-osint/", _t8) or "")

    section("9) GET /api/botfather/template no rompe")
    with TestClient(app) as client:
        def _t9_setup():
            r = client.post(
                "/api/auth/login",
                json={"username": "admin", "password": new_password},
            )
            assert r.status_code == 200

        def _t9():
            r = client.get("/api/botfather/template")
            assert r.status_code == 200, f"Esperaba 200, recibí {r.status_code}: {r.text}"
            data = r.json()
            assert "template" in data, f"Falta 'template' en response: {list(data.keys())}"
            tpl = data["template"]
            assert "id" in tpl and "name" in tpl, f"Template incompleto: keys={list(tpl.keys())}"
            return f"template_id={tpl.get('id')}, has_notes={len(data.get('notes', []))}"
        safe_call("Login admin (botfather)", _t9_setup)
        record("GET /api/botfather/template", safe_call("GET /api/botfather/template", _t9) is not None,
               safe_call("GET /api/botfather/template", _t9) or "")

    # --------------------------------------------------------
    # Resumen
    # --------------------------------------------------------
    section(f"RESUMEN: {PASSED} PASS, {FAILED} FAIL")
    print()
    for status, name, detail in RESULTS:
        print(f"  [{status}] {name}")
        if status == "FAIL":
            print(f"    -> {detail[:500]}")

    return 0 if FAILED == 0 else 1


if __name__ == "__main__":
    sys.exit(main())