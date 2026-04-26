"""
Disclaimer obligatorio para bots de la categoria CTF / OSINT.

Cada bot CTF/OSINT debe llamar a `print_disclaimer()` al iniciar y
opcionalmente a `require_acknowledge()` para forzar al usuario a
aceptar las condiciones antes de continuar.

# MODIFICAR: si quieres adaptar el texto a tu contexto, edita
# DISCLAIMER_TEXT abajo. Mantenlo claro y honesto.
"""

import sys
from pathlib import Path

DISCLAIMER_TEXT = """
================================================================================
  AVISO LEGAL Y ETICO - PLANTILLAS CTF / OSINT
================================================================================

Esta herramienta incluye capacidades de analisis de URLs, web scraping,
deteccion de formularios y pruebas didacticas de inyeccion SQL.

Su uso esta PERMITIDO solo para:
  [OK] Sistemas que tu mismo administras.
  [OK] Laboratorios CTF autorizados (HackTheBox, TryHackMe, PortSwigger, etc.).
  [OK] Programas de Bug Bounty con autorizacion explicita.
  [OK] Entornos educativos controlados.

Esta PROHIBIDO usar esta herramienta para:
  [NO] Atacar sitios o sistemas de terceros sin autorizacion por escrito.
  [NO] Acceder a informacion a la que no tienes derecho.
  [NO] Cualquier actividad ilegal.

Usar estas tecnicas contra sistemas de terceros sin permiso es DELITO en
casi todos los paises. Los autores de este proyecto NO se responsabilizan
por usos indebidos.

Al continuar declaras que entiendes y aceptas estas condiciones.
================================================================================
"""


def print_disclaimer() -> None:
    """Imprime el disclaimer en la consola al iniciar el bot."""
    print(DISCLAIMER_TEXT)


def require_acknowledge(flag_file: str = ".ctf_acknowledged") -> None:
    """
    Pide al usuario aceptar el disclaimer la primera vez. Crea un
    archivo flag para no preguntar de nuevo en ese equipo.

    # MODIFICAR: si quieres pedir aceptacion CADA vez, comenta el bloque
    # del flag_file y deja solo el input().
    """
    flag_path = Path(flag_file)
    if flag_path.exists():
        return

    print_disclaimer()
    response = input("Escribe 'ACEPTO' para continuar: ").strip().upper()
    if response != "ACEPTO":
        print("Disclaimer no aceptado. Saliendo.")
        sys.exit(0)

    flag_path.touch()
    print(f"Aceptacion guardada en {flag_path.resolve()}")
