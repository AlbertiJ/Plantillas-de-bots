"""
============================================
tests/test_caddy_bare.py — Validacion de Caddy bare-metal
============================================

Verifica que los scripts de instalacion + config de Caddy bare-metal
esten bien formados y sean consistentes con el approach Docker.
"""
import re
import stat
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent


class TestCaddyfileBare:
    """El Caddyfile bare-metal debe ser similar al de Docker pero apuntar a localhost."""

    @pytest.fixture
    def caddyfile_bare(self):
        path = ROOT / "Caddyfile.bare"
        if not path.exists():
            pytest.skip("Caddyfile.bare no existe")
        return path.read_text(encoding="utf-8")

    def test_usa_127_0_0_1_como_backend(self, caddyfile_bare):
        """AGENT-T: bare-metal apunta a 127.0.0.1:8000, NO a hostname de Docker."""
        import re
        assert "127.0.0.1:8000" in caddyfile_bare
        # El backend de reverse_proxy debe ser 127.0.0.1, no 'app'
        match = re.search(r"reverse_proxy\s+(\S+)", caddyfile_bare)
        assert match
        backend = match.group(1)
        assert "127.0.0.1" in backend, f"El backend debe ser 127.0.0.1, no '{backend}'"

    def test_headers_de_seguridad(self, caddyfile_bare):
        for h in ["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options"]:
            assert h in caddyfile_bare, f"Debe incluir {h}"

    def test_healthcheck_apuntando_a_health(self, caddyfile_bare):
        assert "health_uri" in caddyfile_bare
        assert "/api/status/health" in caddyfile_bare

    def test_tiene_redirect_http_a_https(self, caddyfile_bare):
        assert "http://yourdomain.com" in caddyfile_bare
        assert "redir" in caddyfile_bare


class TestInstallScripts:
    """Los scripts de instalacion deben existir y tener permisos correctos."""

    @pytest.mark.parametrize("script", [
        "install_caddy.sh",
        "verify_https.sh",
    ])
    def test_sh_existe(self, script):
        path = ROOT / script
        assert path.exists(), f"{script} debe existir"

    @pytest.mark.parametrize("script", [
        "install_caddy.sh",
        "verify_https.sh",
    ])
    def test_sh_es_ejecutable(self, script):
        path = ROOT / script
        if not path.exists():
            pytest.skip(f"{script} no existe")
        # En Windows el bit +x no aplica, en Linux si. Saltamos en Windows.
        import sys
        if sys.platform == "win32":
            pytest.skip("Windows no usa bit ejecutable POSIX")
        mode = path.stat().st_mode
        assert mode & stat.S_IXUSR, f"{script} debe ser ejecutable (chmod +x)"

    @pytest.mark.parametrize("script", [
        "install_caddy.ps1",
        "verify_https.ps1",
    ])
    def test_ps1_existe(self, script):
        path = ROOT / script
        assert path.exists(), f"{script} debe existir"

    def test_install_caddy_sh_usa_sudo(self):
        """AGENT-T: el script de install detecta si no es root."""
        path = ROOT / "install_caddy.sh"
        if not path.exists():
            pytest.skip()
        content = path.read_text(encoding="utf-8")
        assert "EUID" in content or "id" in content, \
            "Debe verificar que se ejecuta como root"
        assert "apt-get" in content, "Debe usar apt-get (Debian/Ubuntu)"
        assert "^[a-zA-Z0-9.-]+$" in content, \
            "Debe sanitizar el dominio contra inyeccion"

    def test_install_caddy_sh_reemplaza_dominio(self):
        """AGENT-T: el script toma el dominio como parametro y lo usa en el Caddyfile."""
        path = ROOT / "install_caddy.sh"
        if not path.exists():
            pytest.skip()
        content = path.read_text(encoding="utf-8")
        assert "yourdomain.com" in content, "Debe tener dominio de ejemplo"
        assert "sed" in content, "Debe usar sed para reemplazar el dominio"
        assert "caddy validate" in content, "Debe validar la config antes de aplicar"

    def test_install_caddy_ps1_parametro_domain(self):
        """AGENT-T: el script de Windows toma -Domain."""
        path = ROOT / "install_caddy.ps1"
        if not path.exists():
            pytest.skip()
        content = path.read_text(encoding="utf-8")
        assert "Domain" in content
        assert "Mandatory" in content or "Parameter" in content, \
            "Domain debe ser parametro obligatorio"
        assert "Administrator" in content, \
            "Debe verificar que corre como Administrador"
        assert "^[a-zA-Z0-9.-]+$" in content, \
            "Debe sanitizar el dominio contra inyeccion"

    def test_install_caddy_ps1_registra_servicio(self):
        """AGENT-T: el servicio se registra para auto-arranque."""
        path = ROOT / "install_caddy.ps1"
        if not path.exists():
            pytest.skip()
        content = path.read_text(encoding="utf-8")
        assert "sc.exe create" in content, "Debe registrar el servicio con sc.exe"


class TestSystemdUnit:
    """El systemd unit debe tener hardening basico."""

    @pytest.fixture
    def unit(self):
        path = ROOT / "pdb.service"
        if not path.exists():
            pytest.skip("pdb.service no existe")
        return path.read_text(encoding="utf-8")

    def test_user_no_root(self, unit):
        """AGENT-T: el servicio NO corre como root."""
        assert re.search(r"^\s*User=\w+", unit, re.MULTILINE)
        # Verificar que NO dice User=root
        user_match = re.search(r"^\s*User=(\S+)", unit, re.MULTILINE)
        assert user_match
        assert user_match.group(1) != "root", "User no debe ser root"

    def test_restart_always(self, unit):
        """AGENT-T: si la app se cae, systemd la reinicia."""
        assert re.search(r"^\s*Restart=always", unit, re.MULTILINE)

    def test_hardening_basico(self, unit):
        """AGENT-T: defense in depth (NoNewPrivileges, ProtectSystem)."""
        for directive in ["NoNewPrivileges", "ProtectSystem", "PrivateTmp"]:
            assert directive in unit, f"Debe incluir {directive} para hardening"

    def test_execstart_apunta_a_uvicorn(self, unit):
        """AGENT-T: el comando de arranque es uvicorn con main:app."""
        assert "uvicorn" in unit
        assert "main:app" in unit


class TestVerifyHttps:
    """Los scripts de verificacion deben cubrir los 4 chequeos basicos."""

    @pytest.mark.parametrize("script", [
        "verify_https.sh",
        "verify_https.ps1",
    ])
    def test_existe(self, script):
        path = ROOT / script
        assert path.exists()

    def test_verify_sh_cubre_4_checks(self):
        path = ROOT / "verify_https.sh"
        if not path.exists():
            pytest.skip()
        content = path.read_text(encoding="utf-8")
        for check in ["/api/status/health", "redir", "openssl s_client", "Strict-Transport-Security"]:
            assert check in content, f"Debe incluir check de {check}"

    def test_verify_ps1_cubre_4_checks(self):
        path = ROOT / "verify_https.ps1"
        if not path.exists():
            pytest.skip()
        content = path.read_text(encoding="utf-8")
        for check in ["/api/status/health", "Redirect", "SslStream", "Strict-Transport-Security"]:
            assert check in content, f"Debe incluir check de {check}"
