"""
============================================
tests/test_docker.py — Validacion de Docker assets
============================================

Verifica que los archivos de Docker esten bien formados y consistentes:
- Dockerfile existe, multi-stage, usuario no-root
- .dockerignore excluye .venv, secrets, tests
- docker-compose.yml es valido YAML, expone los servicios correctos
- Caddyfile tiene las directivas minimas de seguridad

Estos tests NO ejecutan Docker (no tenemos daemon en el sandbox),
solo validan la estructura y consistencia de los archivos.
"""
import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent


# ============================================================
# Dockerfile
# ============================================================
class TestDockerfile:
    """Validaciones estructurales del Dockerfile."""

    @pytest.fixture
    def dockerfile(self):
        path = ROOT / "Dockerfile"
        if not path.exists():
            pytest.skip("Dockerfile no existe")
        return path.read_text(encoding="utf-8")

    def test_usa_python_3_12(self, dockerfile):
        """AGENT-T: imagen base pineada a 3.12 (igual que el proyecto)."""
        assert "python:3.12" in dockerfile, "Dockerfile debe usar python:3.12"

    def test_multi_stage_build(self, dockerfile):
        """AGENT-T: multi-stage para evitar gcc/headers en runtime."""
        assert "AS builder" in dockerfile, "Debe tener un build stage"
        assert "AS runtime" in dockerfile, "Debe tener un runtime stage"
        assert "--from=builder" in dockerfile, "Runtime debe copiar deps desde builder"

    def test_usuario_no_root(self, dockerfile):
        """AGENT-T: security baseline — el container NO corre como root."""
        assert "USER " in dockerfile, "Debe especificar un USER no-root"
        # Verificar que el UID no es 0
        match = re.search(r"USER\s+\w+(?:\s*:\s*\w+)?", dockerfile)
        assert match
        # El useradd con -u 1000 garantiza no-root
        assert "useradd" in dockerfile and "1000" in dockerfile, \
            "Debe crear usuario con UID especifico (no-root)"

    def test_healthcheck_define(self, dockerfile):
        """AGENT-T: docker puede detectar cuando el container se cuelga."""
        assert "HEALTHCHECK" in dockerfile, \
            "Debe tener directiva HEALTHCHECK para que docker sepa cuando falla"

    def test_expone_puerto_8000(self, dockerfile):
        """AGENT-T: la app escucha en 8000 (consistente con uvicorn)."""
        assert "EXPOSE 8000" in dockerfile, \
            "Debe exponer puerto 8000 (uvicorn default)"

    def test_cmd_uvicorn(self, dockerfile):
        """AGENT-T: comando por defecto arranca la app."""
        assert "uvicorn" in dockerfile, "CMD debe ser uvicorn"
        assert "main:app" in dockerfile, "Debe apuntar a main:app"

    def test_python_unbuffered(self, dockerfile):
        """AGENT-T: stdout/stderr no se bufferean (logs en tiempo real)."""
        assert "PYTHONUNBUFFERED=1" in dockerfile, \
            "PYTHONUNBUFFERED=1 es requerido para ver logs en docker logs"


# ============================================================
# .dockerignore
# ============================================================
class TestDockerignore:
    """Validaciones del .dockerignore."""

    @pytest.fixture
    def dockerignore(self):
        path = ROOT / ".dockerignore"
        if not path.exists():
            pytest.skip(".dockerignore no existe")
        return path.read_text(encoding="utf-8")

    def test_excluye_venv(self, dockerignore):
        """AGENT-T: .venv/.venv no van a la imagen (se re-instala)."""
        for pat in [".venv", "venv", "env"]:
            assert pat in dockerignore, f"Debe excluir {pat}"

    def test_excluye_secrets(self, dockerignore):
        """AGENT-T: .env real nunca va a la imagen."""
        # El patron .env debe estar (cuidado: .env.example puede ir)
        lines = [l.strip() for l in dockerignore.splitlines() if l.strip() and not l.startswith("#")]
        # .env exacto debe estar excluido
        assert ".env" in lines, "Debe excluir .env (sin :example)"

    def test_excluye_tests(self, dockerignore):
        """AGENT-T: la imagen de prod no necesita tests."""
        assert "tests/" in dockerignore, "Debe excluir directorio tests/"

    def test_excluye_github(self, dockerignore):
        """AGENT-T: workflows de CI no van a la imagen."""
        assert ".github" in dockerignore, "Debe excluir .github/"

    def test_excluye_git(self, dockerignore):
        """AGENT-T: .git no va a la imagen (no se clona dentro)."""
        assert ".git" in dockerignore, "Debe excluir .git/"

    def test_excluye_pycache(self, dockerignore):
        """AGENT-T: __pycache__ no se copia (se regenera)."""
        assert "__pycache__" in dockerignore, "Debe excluir __pycache__"


# ============================================================
# docker-compose.yml
# ============================================================
class TestDockerCompose:
    """Validaciones del docker-compose.yml."""

    @pytest.fixture
    def compose(self):
        path = ROOT / "docker-compose.yml"
        if not path.exists():
            pytest.skip("docker-compose.yml no existe")
        return yaml.safe_load(path.read_text(encoding="utf-8"))

    def test_es_yaml_valido(self, compose):
        """AGENT-T: docker-compose parsea como YAML."""
        assert compose is not None
        assert "services" in compose

    def test_tiene_servicio_app(self, compose):
        """AGENT-T: la app es uno de los servicios."""
        assert "app" in compose["services"], "Debe tener servicio 'app'"

    def test_tiene_servicio_caddy(self, compose):
        """AGENT-T: Caddy como reverse proxy para HTTPS."""
        assert "caddy" in compose["services"], "Debe tener servicio 'caddy'"

    def test_app_usa_Dockerfile_local(self, compose):
        """AGENT-T: el servicio app buildea desde el Dockerfile del repo."""
        app = compose["services"]["app"]
        assert "build" in app, "app debe tener seccion 'build'"
        assert app["build"].get("dockerfile") == "Dockerfile"

    def test_app_no_expone_puerto_directamente(self, compose):
        """AGENT-T: el puerto de la app es interno, lo expone caddy."""
        app = compose["services"]["app"]
        # Solo expose, NO ports
        assert "expose" in app, "app debe usar 'expose' (no 'ports')"
        assert "ports" not in app, \
            "app NO debe mapear puertos directos (eso lo hace caddy)"

    def test_caddy_si_expone_puertos(self, compose):
        """AGENT-T: caddy expone 80/443 al host."""
        caddy = compose["services"]["caddy"]
        assert "ports" in caddy
        ports = " ".join(caddy["ports"])
        assert "80" in ports
        assert "443" in ports

    def test_app_usa_volumen_persistente(self, compose):
        """AGENT-T: data/ es volumen para persistir entre reinicios."""
        app = compose["services"]["app"]
        assert "volumes" in app
        volumes = " ".join(str(v) for v in app["volumes"])
        assert "data" in volumes.lower(), "Debe montar data/ como volumen"

    def test_app_tiene_resource_limits(self, compose):
        """AGENT-T: el container no puede consumir el host entero."""
        app = compose["services"]["app"]
        assert "deploy" in app
        assert "resources" in app["deploy"]
        assert "limits" in app["deploy"]["resources"]
        assert "memory" in app["deploy"]["resources"]["limits"]

    def test_app_tiene_healthcheck(self, compose):
        """AGENT-T: docker-compose sabe cuando app esta lista."""
        app = compose["services"]["app"]
        assert "healthcheck" in app

    def test_red_interna_para_app_y_caddy(self, compose):
        """AGENT-T: app solo es accesible desde caddy (no desde internet directo)."""
        assert "networks" in compose
        assert "pdb-net" in compose["networks"]
        for svc in ("app", "caddy"):
            assert svc in compose["services"]
            assert "pdb-net" in compose["services"][svc].get("networks", [])

    def test_volumenes_named_declarados(self, compose):
        """AGENT-T: los volumenes existen en la seccion top-level."""
        assert "volumes" in compose
        for vol in ("pdb-data", "caddy-data", "caddy-config"):
            assert vol in compose["volumes"]


# ============================================================
# Caddyfile
# ============================================================
class TestCaddyfile:
    """Validaciones del Caddyfile."""

    @pytest.fixture
    def caddyfile(self):
        path = ROOT / "Caddyfile"
        if not path.exists():
            pytest.skip("Caddyfile no existe")
        return path.read_text(encoding="utf-8")

    def test_define_https_block(self, caddyfile):
        """AGENT-T: Caddy sirve HTTPS con cert auto de Let's Encrypt."""
        assert "https://" in caddyfile, "Debe tener bloque https://"
        assert "yourdomain.com" in caddyfile, "Debe tener dominio de ejemplo"

    def test_reverse_proxy_a_app(self, caddyfile):
        """AGENT-T: caddy redirige el trafico a la app."""
        assert "reverse_proxy" in caddyfile
        assert "app:8000" in caddyfile, "Debe apuntar a app:8000"

    def test_healthcheck_en_caddy(self, caddyfile):
        """AGENT-T: caddy sabe cuando la app esta lista."""
        assert "health_uri" in caddyfile
        assert "/api/status/health" in caddyfile

    def test_headers_de_seguridad(self, caddyfile):
        """AGENT-T: el sitio debe tener headers OWASP recomendados."""
        for header in [
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "X-Frame-Options",
        ]:
            assert header in caddyfile, f"Debe incluir header {header}"

    def test_rate_limit_adicional(self, caddyfile):
        """AGENT-T: caddy agrega rate limit a nivel de red (defensa en profundidad)."""
        assert "rate_limit" in caddyfile
