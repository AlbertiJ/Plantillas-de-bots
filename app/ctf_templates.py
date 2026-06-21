"""
============================================
app/ctf_templates.py — Templates CTF
============================================

Port del commit B (233b2e8). Lee data/ctf_templates.json
(23 templates preconfigurados para OSINT, recon, scanning,
fuzzing, exploitation, crypto y stego).

# MODIFICAR: agregar más templates (subir el JSON, no tocar este código)
# MODIFICAR: persistir cambios del usuario a un override file
"""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from app.auth import is_authenticated

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_FILE = BASE_DIR / "data" / "ctf_templates.json"


# ---------------------------------------------------------
# Carga
# ---------------------------------------------------------
def _load_all() -> dict:
    if not TEMPLATES_FILE.exists():
        return {"version": "0.0.0", "templates": [], "categories": []}
    return json.loads(TEMPLATES_FILE.read_text(encoding="utf-8"))


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class Template(BaseModel):
    id: str
    name: str
    category: str
    tool: str
    description: str
    command: list[str]
    args: list[dict] = []
    tags: list[str] = []
    example_output: Optional[str] = None
    notes: Optional[str] = None


class Category(BaseModel):
    id: str
    name: str
    icon: str


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


def _fill_args(template: Template, provided: dict[str, str]) -> list[str]:
    """
    Reemplaza {argname} en el command con los valores provistos.
    Falla con 400 si falta un arg requerido.
    """
    cmd = list(template.command)
    for arg in template.args:
        placeholder = "{" + arg["name"] + "}"
        for i, part in enumerate(cmd):
            if placeholder in part:
                if arg["name"] not in provided:
                    if arg.get("required", False):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Falta argumento requerido: {arg['name']} ({arg.get('description','')})",
                        )
                    # Opcional y no provisto: dejar el placeholder
                else:
                    cmd[i] = part.replace(placeholder, provided[arg["name"]])
    return cmd


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.get("/")
async def list_templates(
    request: Request,
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    tag: Optional[str] = Query(None, description="Filtrar por tag"),
    search: Optional[str] = Query(None, description="Buscar en name/description"),
):
    """Lista todos los templates, con filtros opcionales."""
    _require_auth(request)
    data = _load_all()
    templates = data.get("templates", [])

    if category:
        templates = [t for t in templates if t.get("category") == category]
    if tag:
        templates = [t for t in templates if tag in t.get("tags", [])]
    if search:
        s = search.lower()
        templates = [
            t for t in templates
            if s in t.get("name", "").lower()
            or s in t.get("description", "").lower()
        ]

    return {
        "version": data.get("version"),
        "total": len(templates),
        "categories": data.get("categories", []),
        "templates": templates,
    }


@router.get("/categories")
async def list_categories(request: Request):
    """Lista las categorías con conteo de templates."""
    _require_auth(request)
    data = _load_all()
    categories = data.get("categories", [])
    templates = data.get("templates", [])

    counts: dict[str, int] = {}
    for t in templates:
        cat = t.get("category", "uncategorized")
        counts[cat] = counts.get(cat, 0) + 1

    return {
        "categories": [
            {**c, "count": counts.get(c["id"], 0)}
            for c in categories
        ]
    }


@router.get("/{template_id}")
async def get_template(template_id: str, request: Request):
    """Devuelve un template específico por ID."""
    _require_auth(request)
    data = _load_all()
    for t in data.get("templates", []):
        if t.get("id") == template_id:
            return t
    raise HTTPException(status_code=404, detail=f"Template '{template_id}' no existe")


@router.post("/{template_id}/render")
async def render_command(template_id: str, request: Request, args: dict[str, str] = {}):
    """
    Toma los args del usuario, devuelve el comando final listo
    para enviar a /api/launcher/run/.
    No ejecuta nada — solo arma el comando.
    """
    _require_auth(request)
    data = _load_all()
    template_dict = None
    for t in data.get("templates", []):
        if t.get("id") == template_id:
            template_dict = t
            break

    if not template_dict:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' no existe")

    template = Template(**template_dict)
    rendered = _fill_args(template, args)

    return {
        "template_id": template_id,
        "args_used": args,
        "command": rendered,
        "command_str": " ".join(rendered),
    }
