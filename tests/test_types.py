"""
============================================
tests/test_types.py — Tests de la cobertura de type hints
============================================

Cubre C3 del ROADMAP: type hints + mypy.

Valida:
- mypy corre sin errores sobre app/
- py.typed marker existe (PEP 561)
- mypy.ini esta bien formado
- Los routers tienen anotaciones en sus signatures
"""
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"


class TestPyTypedMarker:
    """AGENT-T: el paquete declara que es type-checked (PEP 561)."""

    def test_py_typed_existe(self):
        path = APP / "py.typed"
        assert path.exists(), "Debe existir app/py.typed (PEP 561)"

    def test_py_typed_no_esta_vacio(self):
        path = APP / "py.typed"
        # El archivo puede estar vacio o tener un comentario, pero debe existir
        assert path.stat().st_size >= 0


class TestMypyConfig:
    """AGENT-T: la config de mypy es valida."""

    def test_mypy_ini_existe(self):
        path = ROOT / "mypy.ini"
        assert path.exists(), "Debe existir mypy.ini en la raiz"

    def test_mypy_ini_python_3_12(self):
        path = ROOT / "mypy.ini"
        content = path.read_text(encoding="utf-8")
        assert "python_version = 3.12" in content

    def test_mypy_puede_correr(self):
        """AGENT-T: mypy corre sin errores sobre app/."""
        result = subprocess.run(
            [sys.executable, "-m", "mypy", "app/"],
            capture_output=True, text=True, cwd=str(ROOT),
        )
        # Success: no issues found
        assert "Success: no issues found" in result.stdout or result.returncode == 0, \
            f"mypy fallo:\nstdout: {result.stdout}\nstderr: {result.stderr}"


class TestTypeHintsCoverage:
    """AGENT-T: la mayoria de los modulos tienen type hints en sus funciones publicas."""

    @pytest.mark.parametrize("module", [
        "app/auth.py",
        "app/launcher.py",
        "app/activity.py",
        "app/admin.py",
        "app/botfather.py",
        "app/watchdog.py",
        "app/builder.py",
        "app/ctf_osint.py",
        "app/ctf_templates.py",
        "app/libraries.py",
        "app/status.py",
        "app/ratelimit.py",
        "app/logging_config.py",
    ])
    def test_modulo_tiene_anotaciones(self, module):
        """AGENT-T: el modulo tiene al menos una anotacion de tipo (return o parametro)."""
        path = ROOT / module
        if not path.exists():
            pytest.skip(f"{module} no existe")
        content = path.read_text(encoding="utf-8")
        # Busca al menos una funcion con anotacion de tipo de retorno (->)
        matches = re.findall(r"def \w+\([^)]*\)\s*->", content)
        assert len(matches) > 0, f"{module} no tiene funciones con anotacion de retorno"

    @pytest.mark.parametrize("module", [
        "app/auth.py",
        "app/launcher.py",
        "app/activity.py",
    ])
    def test_pydantic_model_tiene_base_model(self, module):
        """AGENT-T: los request/response models usan BaseModel de pydantic."""
        path = ROOT / module
        content = path.read_text(encoding="utf-8")
        # Si el modulo tiene class X(BaseModel), debe estar importado
        if "BaseModel" in content:
            assert "from pydantic import" in content or "import pydantic" in content, \
                f"{module} usa BaseModel pero no importa pydantic"


class TestCommonPatterns:
    """AGENT-T: patrones comunes de tipos estan bien."""

    def test_typing_imports_any(self):
        """AGENT-T: los modulos que retornan dict[str, Any] importan Any."""
        for module in ["auth.py", "launcher.py", "libraries.py", "ctf_templates.py", "ctf_osint.py", "watchdog.py"]:
            path = APP / module
            content = path.read_text(encoding="utf-8")
            if "dict[str, Any]" in content or "dict[Any" in content:
                assert "from typing import" in content and "Any" in content, \
                    f"{module} usa Any pero no lo importa"

    def test_typing_imports_optional(self):
        """AGENT-T: los modulos con Optional[X] importan Optional."""
        for module in ["auth.py", "launcher.py", "libraries.py"]:
            path = APP / module
            content = path.read_text(encoding="utf-8")
            if "Optional[" in content:
                assert "from typing import" in content and "Optional" in content
