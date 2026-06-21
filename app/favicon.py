"""Favicon SVG embebido - bot simple"""
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()

FAVICON_SVG = b"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#1877f2"/>
  <text x="32" y="44" text-anchor="middle" font-size="32" fill="white" font-family="Arial">B</text>
</svg>"""


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")