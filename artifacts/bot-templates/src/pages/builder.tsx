import { useState } from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import { Wrench, ShieldAlert, Download, Bot, Layers, CheckSquare, Square } from "lucide-react";

// ─── Cabecera estándar para todos los archivos Python generados ───
const PYTHON_HEADER = `# ╔══════════════════════════════════════════════════════════════╗
# ║           IMPLEMENTACIÓN DEL CÓDIGO                          ║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ║  Seguimiento: github.com/AlbertiJ/Replit-bot/issues          ║
# ╠══════════════════════════════════════════════════════════════╣
# ║  DISCLAIMER / AVISO LEGAL — Código Abierto (Open Source)    ║
# ║  Este código fue creado sin conocimientos previos de         ║
# ║  programación, íntegramente por Replit con cuenta paga.      ║
# ║  El dueño y el desarrollador NO se hacen responsables por    ║
# ║  el mal uso o implementación incorrecta del mismo.           ║
# ║  Úsalo siempre de forma ética, responsable y legal.          ║
# ╚══════════════════════════════════════════════════════════════╝
`;

// ─── 10 Plantillas Avanzadas ───────────────────────────────────────
const TEMPLATES: Record<string, Record<string, {
  name: { es: string; en: string };
  purpose: { es: string; en: string };
  capabilities: { es: string[]; en: string[] };
  filename: string;
  code: string;
}>> = {
  telegram: {
    osint: {
      name: { es: "Telegram OSINT Recon", en: "Telegram OSINT Recon" },
      purpose: {
        es: "Recolectar información pública de IPs, dominios y URLs usando técnicas OSINT (Open Source Intelligence). Útil para investigación, auditorías y CTF.",
        en: "Collect public information on IPs, domains and URLs using OSINT techniques. Useful for investigation, audits and CTF.",
      },
      capabilities: {
        es: ["Consulta WHOIS de dominios", "Lookup de IP con geolocalización", "Peticiones GET/POST a URLs", "Web scraping básico", "Detección de cabeceras HTTP"],
        en: ["WHOIS domain query", "IP lookup with geolocation", "GET/POST requests to URLs", "Basic web scraping", "HTTP header detection"],
      },
      filename: "telegram_osint_recon.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de Telegram para OSINT (inteligencia de fuentes abiertas)
# PLATAFORMA: Telegram — python-telegram-bot v20+
# USO: Solo para investigación ética, auditorías y CTF (Capture The Flag)
# ─────────────────────────────────────────────────────────────

import os
import logging
import socket
import requests
import whois                  # pip install python-whois
from bs4 import BeautifulSoup # pip install beautifulsoup4
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from dotenv import load_dotenv  # pip install python-dotenv

# Cargamos las credenciales desde el archivo .env (¡NUNCA las escribas directamente aquí!)
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre de la variable en tu .env

# Configuración del sistema de logging (registros)
# IDEA FUTURA: escribir los logs en un archivo .log con rotación diaria
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ─── Comando /start ────────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Mensaje de bienvenida con lista de comandos disponibles."""
    msg = (
        "🔍 *Bot OSINT Recon*\\n\\n"
        "Comandos disponibles:\\n"
        "\`/ip <dirección>\` — Información de IP\\n"
        "\`/whois <dominio>\` — Consulta WHOIS\\n"
        "\`/headers <url>\` — Cabeceras HTTP\\n"
        "\`/scrape <url>\` — Título y links de una página\\n"
        "\`/get <url>\` — Petición GET simple\\n"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


# ─── Comando /ip ───────────────────────────────────────────────────
async def ip_lookup(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Consulta información pública de una dirección IP.
    Usa la API gratuita de ip-api.com (sin clave).
    IDEA FUTURA: agregar soporte para IPv6 y ASN lookup.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /ip <dirección IP o dominio>")
        return

    target = ctx.args[0]  # MODIFICAR: podés validar el formato IP antes de consultar
    try:
        response = requests.get(f"http://ip-api.com/json/{target}", timeout=10)
        data = response.json()
        if data.get("status") == "success":
            msg = (
                f"🌐 *IP: {data.get('query')}*\\n"
                f"País: {data.get('country')}\\n"
                f"Ciudad: {data.get('city')}\\n"
                f"ISP: {data.get('isp')}\\n"
                f"Org: {data.get('org')}\\n"
                f"Zona horaria: {data.get('timezone')}\\n"
                f"Lat/Lon: {data.get('lat')}, {data.get('lon')}"
            )
        else:
            msg = f"❌ No se pudo obtener información para: {target}"
        await update.message.reply_text(msg, parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en ip_lookup: {e}")
        await update.message.reply_text("⚠️ Error al consultar la IP.")


# ─── Comando /whois ────────────────────────────────────────────────
async def whois_lookup(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Consulta información de registro WHOIS de un dominio.
    IDEA FUTURA: parsear y mostrar solo los campos más útiles (registrar, fechas).
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /whois <dominio>")
        return

    domain = ctx.args[0]  # MODIFICAR: agregar validación de formato de dominio
    try:
        w = whois.whois(domain)
        msg = (
            f"🔎 *WHOIS: {domain}*\\n"
            f"Registrar: {w.registrar}\\n"
            f"Creado: {w.creation_date}\\n"
            f"Vence: {w.expiration_date}\\n"
            f"Emails: {w.emails}\\n"
            f"Nameservers: {', '.join(w.name_servers or [])}\\n"
        )
        await update.message.reply_text(msg[:4000], parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en whois_lookup: {e}")
        await update.message.reply_text("⚠️ Error al consultar WHOIS.")


# ─── Comando /headers ──────────────────────────────────────────────
async def check_headers(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Muestra las cabeceras HTTP de respuesta de una URL.
    Útil para detectar tecnologías del servidor (Server, X-Powered-By, etc).
    IDEA FUTURA: puntuar la seguridad según cabeceras faltantes (CSP, HSTS, etc).
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /headers <url>")
        return

    url = ctx.args[0]
    if not url.startswith("http"):
        url = "https://" + url  # MODIFICAR: podés agregar manejo de certificados SSL

    try:
        r = requests.head(url, timeout=10, allow_redirects=True)
        lines = [f"\`{k}\`: {v}" for k, v in r.headers.items()]
        msg = f"📋 *Headers de {url}*\\n\\n" + "\\n".join(lines[:20])
        await update.message.reply_text(msg[:4000], parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en check_headers: {e}")
        await update.message.reply_text("⚠️ No se pudieron obtener las cabeceras.")


# ─── Comando /scrape ───────────────────────────────────────────────
async def scrape_page(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Extrae el título y primeros links de una página web (web scraping básico).
    IDEA FUTURA: extraer emails, números de teléfono, imágenes con regex.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /scrape <url>")
        return

    url = ctx.args[0]
    try:
        headers = {"User-Agent": "Mozilla/5.0"}  # MODIFICAR: podés rotar User-Agents
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")

        title = soup.title.string if soup.title else "Sin título"
        links = [a.get("href") for a in soup.find_all("a", href=True)][:10]
        links_text = "\\n".join(links) if links else "No se encontraron links"

        msg = f"🕷️ *Scraping: {url}*\\n\\n*Título:* {title}\\n\\n*Links (primeros 10):*\\n{links_text}"
        await update.message.reply_text(msg[:4000], parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en scrape_page: {e}")
        await update.message.reply_text("⚠️ Error al hacer scraping.")


# ─── Comando /get ──────────────────────────────────────────────────
async def get_request(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Realiza una petición GET y devuelve el status y primeros 500 chars del body.
    IDEA FUTURA: agregar soporte para /post con parámetros personalizados.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /get <url>")
        return

    url = ctx.args[0]
    try:
        r = requests.get(url, timeout=10)
        preview = r.text[:500].replace("<", "&lt;")
        msg = f"📡 *GET {url}*\\nStatus: \`{r.status_code}\`\\n\\n\`\`\`\\n{preview}\\n\`\`\`"
        await update.message.reply_text(msg[:4000], parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en get_request: {e}")
        await update.message.reply_text("⚠️ Error al realizar la petición.")


# ─── Punto de entrada principal ────────────────────────────────────
if __name__ == "__main__":
    # MODIFICAR: reemplazá TOKEN por tu variable de entorno si tiene otro nombre
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ip", ip_lookup))
    app.add_handler(CommandHandler("whois", whois_lookup))
    app.add_handler(CommandHandler("headers", check_headers))
    app.add_handler(CommandHandler("scrape", scrape_page))
    app.add_handler(CommandHandler("get", get_request))
    logger.info("🤖 Bot OSINT Telegram iniciado...")
    app.run_polling()
`,
    },

    ctf: {
      name: { es: "Telegram CTF Helper", en: "Telegram CTF Helper" },
      purpose: {
        es: "Asistente para prácticas CTF (Capture The Flag) y pruebas de seguridad. Incluye herramientas de encoding, hashing y detección de patrones de SQL injection para entornos de laboratorio.",
        en: "Assistant for CTF (Capture The Flag) practices and security testing. Includes encoding, hashing and SQL injection pattern tools for lab environments.",
      },
      capabilities: {
        es: ["Codificación Base64/ROT13/Hex", "Hash MD5/SHA256", "Patrones de SQL injection (educativo)", "Decodificación múltiple", "Análisis de strings"],
        en: ["Base64/ROT13/Hex encoding", "MD5/SHA256 hashing", "SQL injection patterns (educational)", "Multiple decoding", "String analysis"],
      },
      filename: "telegram_ctf_helper.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de Telegram como asistente para CTF y seguridad informática
# PLATAFORMA: Telegram — python-telegram-bot v20+
# ⚠️ ADVERTENCIA: Este bot es para USO EDUCATIVO y entornos CTF/laboratorio.
#    Nunca lo uses contra sistemas sin autorización explícita.
# ─────────────────────────────────────────────────────────────

import os
import base64
import hashlib
import logging
from codecs import encode as codecs_encode
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre de tu variable en .env

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─── Diccionario de payloads SQL injection (solo educativo/CTF) ───
# IDEA FUTURA: ampliar la lista con técnicas de blind SQL, time-based, etc.
SQL_PAYLOADS = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "admin' --",
    "' UNION SELECT NULL --",
    "1; DROP TABLE users --",
    "' OR 1=1 LIMIT 1 --",
]


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Menú principal del bot CTF."""
    msg = (
        "🏴 *CTF Helper Bot*\\n\\n"
        "*Encoding:*\\n"
        "\`/b64enc <texto>\` — Codificar en Base64\\n"
        "\`/b64dec <texto>\` — Decodificar Base64\\n"
        "\`/rot13 <texto>\` — Cifrado ROT13\\n"
        "\`/hex <texto>\` — Texto a HEX\\n\\n"
        "*Hashing:*\\n"
        "\`/md5 <texto>\` — Hash MD5\\n"
        "\`/sha256 <texto>\` — Hash SHA256\\n\\n"
        "*CTF Tools:*\\n"
        "\`/sqli\` — Payloads SQL injection (educativo)\\n"
        "\`/analyze <texto>\` — Análisis de string\\n"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


# ─── Encoding / Decoding ──────────────────────────────────────────
async def b64_encode(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Codifica texto en Base64. IDEA FUTURA: soportar archivos binarios."""
    if not ctx.args:
        await update.message.reply_text("Uso: /b64enc <texto>")
        return
    text = " ".join(ctx.args)
    encoded = base64.b64encode(text.encode()).decode()
    await update.message.reply_text(f"🔐 Base64:\\n\`{encoded}\`", parse_mode="Markdown")


async def b64_decode(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Decodifica Base64. IDEA FUTURA: detectar automáticamente si el input es Base64."""
    if not ctx.args:
        await update.message.reply_text("Uso: /b64dec <texto>")
        return
    try:
        decoded = base64.b64decode(ctx.args[0]).decode()
        await update.message.reply_text(f"🔓 Decodificado:\\n\`{decoded}\`", parse_mode="Markdown")
    except Exception:
        await update.message.reply_text("❌ No es un string Base64 válido.")


async def rot13(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Aplica cifrado ROT13. IDEA FUTURA: agregar ROT47 para caracteres ASCII extendidos."""
    if not ctx.args:
        await update.message.reply_text("Uso: /rot13 <texto>")
        return
    text = " ".join(ctx.args)
    result = codecs_encode(text, "rot_13")
    await update.message.reply_text(f"🔄 ROT13:\\n\`{result}\`", parse_mode="Markdown")


async def to_hex(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Convierte texto a representación hexadecimal."""
    if not ctx.args:
        await update.message.reply_text("Uso: /hex <texto>")
        return
    text = " ".join(ctx.args)
    hexval = text.encode().hex()
    await update.message.reply_text(f"🔢 HEX:\\n\`{hexval}\`", parse_mode="Markdown")


# ─── Hashing ──────────────────────────────────────────────────────
async def md5_hash(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Genera el hash MD5 de un texto. IDEA FUTURA: comparar contra un hash dado."""
    if not ctx.args:
        await update.message.reply_text("Uso: /md5 <texto>")
        return
    text = " ".join(ctx.args)
    result = hashlib.md5(text.encode()).hexdigest()
    await update.message.reply_text(f"#️⃣ MD5:\\n\`{result}\`", parse_mode="Markdown")


async def sha256_hash(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Genera el hash SHA256 de un texto."""
    if not ctx.args:
        await update.message.reply_text("Uso: /sha256 <texto>")
        return
    text = " ".join(ctx.args)
    result = hashlib.sha256(text.encode()).hexdigest()
    await update.message.reply_text(f"#️⃣ SHA256:\\n\`{result}\`", parse_mode="Markdown")


# ─── SQL Injection Reference ──────────────────────────────────────
async def sqli_payloads(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Muestra payloads de SQL injection para uso en CTF y laboratorios.
    ⚠️ Solo para entornos autorizados. IDEA FUTURA: categorizarlos por tipo (union, blind, error).
    """
    lines = "\\n".join([f"\`{p}\`" for p in SQL_PAYLOADS])
    msg = f"💉 *SQL Injection Payloads (Educativo/CTF)*\\n\\n{lines}\\n\\n⚠️ Solo usar en entornos autorizados."
    await update.message.reply_text(msg, parse_mode="Markdown")


# ─── Análisis de string ───────────────────────────────────────────
async def analyze_string(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Analiza un string: longitud, tipo de caracteres, posibles encodings.
    IDEA FUTURA: detectar automáticamente si es Base64, hex, JWT, hash, etc.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /analyze <texto>")
        return
    text = " ".join(ctx.args)
    is_base64 = len(text) % 4 == 0 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" for c in text)
    is_hex = all(c in "0123456789abcdefABCDEF" for c in text)
    msg = (
        f"🔬 *Análisis de string*\\n\\n"
        f"Longitud: \`{len(text)}\`\\n"
        f"¿Posible Base64? {'✅' if is_base64 else '❌'}\\n"
        f"¿Posible HEX? {'✅' if is_hex else '❌'}\\n"
        f"MD5 del input: \`{hashlib.md5(text.encode()).hexdigest()}\`"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("b64enc", b64_encode))
    app.add_handler(CommandHandler("b64dec", b64_decode))
    app.add_handler(CommandHandler("rot13", rot13))
    app.add_handler(CommandHandler("hex", to_hex))
    app.add_handler(CommandHandler("md5", md5_hash))
    app.add_handler(CommandHandler("sha256", sha256_hash))
    app.add_handler(CommandHandler("sqli", sqli_payloads))
    app.add_handler(CommandHandler("analyze", analyze_string))
    logger.info("🏴 CTF Helper Bot iniciado...")
    app.run_polling()
`,
    },

    downloader: {
      name: { es: "Telegram Media Downloader", en: "Telegram Media Downloader" },
      purpose: {
        es: "Descarga videos y archivos de plataformas como YouTube, TikTok, Instagram y sitios con reproductor web. Analiza el código de la página para extraer la URL de reproducción y guarda el archivo localmente.",
        en: "Downloads videos and files from platforms like YouTube, TikTok, Instagram and sites with web players. Analyzes page code to extract playback URL and saves the file locally.",
      },
      capabilities: {
        es: ["Descarga de YouTube (yt-dlp)", "Descarga de TikTok / Instagram", "Extracción de URL de video de páginas web", "Envío del archivo directo por Telegram", "Selección de calidad de video"],
        en: ["YouTube download (yt-dlp)", "TikTok / Instagram download", "Video URL extraction from web pages", "Direct file sending via Telegram", "Video quality selection"],
      },
      filename: "telegram_media_downloader.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de Telegram para descargar videos/archivos de la web
# PLATAFORMA: Telegram — python-telegram-bot v20+
# DEPENDENCIAS: yt-dlp, requests, beautifulsoup4
# pip install yt-dlp requests beautifulsoup4
# ─────────────────────────────────────────────────────────────

import os
import re
import logging
import tempfile
import requests
import yt_dlp                 # pip install yt-dlp (soporta YouTube, TikTok, Instagram y más)
from bs4 import BeautifulSoup
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre de tu variable en .env

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Carpeta temporal para descargas — se limpia automáticamente
# MODIFICAR: cambiá la ruta si querés guardar los archivos permanentemente
DOWNLOAD_DIR = tempfile.mkdtemp()

# Sitios soportados de forma nativa por yt-dlp
# IDEA FUTURA: agregar soporte para Dailymotion, Vimeo, Twitch clips
SUPPORTED_SITES = ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "twitter.com", "x.com"]


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Instrucciones de uso del bot descargador."""
    msg = (
        "📥 *Media Downloader Bot*\\n\\n"
        "Enviame cualquier link de video y lo descargo por vos:\\n\\n"
        "✅ YouTube\\n"
        "✅ TikTok\\n"
        "✅ Instagram (posts públicos)\\n"
        "✅ Twitter/X\\n"
        "✅ Sitios con reproductor web\\n\\n"
        "📌 Comandos:\\n"
        "\`/download <url>\` — Descargar video\\n"
        "\`/analyze <url>\` — Analizar página y buscar video\\n"
        "\`/quality <url>\` — Ver calidades disponibles\\n\\n"
        "O simplemente pegá el link y lo proceso automáticamente."
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


# ─── Descarga con yt-dlp ──────────────────────────────────────────
async def download_video(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Descarga un video usando yt-dlp y lo envía por Telegram.
    yt-dlp soporta más de 1000 sitios incluyendo YouTube, TikTok, Instagram.
    IDEA FUTURA: agregar botones inline para elegir la calidad antes de descargar.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /download <url>")
        return

    url = ctx.args[0]
    msg = await update.message.reply_text("⏳ Descargando... esto puede tardar unos segundos.")

    # Configuración de yt-dlp
    # MODIFICAR: cambiá 'format' para elegir calidad (bestaudio, 720, 1080, etc.)
    ydl_opts = {
        "format": "best[filesize<50M]/best",  # Máx 50MB para enviar por Telegram
        "outtmpl": os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

        if os.path.exists(filename) and os.path.getsize(filename) < 50 * 1024 * 1024:
            await msg.edit_text("📤 Subiendo a Telegram...")
            with open(filename, "rb") as f:
                await update.message.reply_video(
                    video=f,
                    caption=f"📹 {info.get('title', 'Video')}",
                    supports_streaming=True,
                )
            os.remove(filename)  # Limpiamos el archivo temporal
        else:
            await msg.edit_text("❌ El archivo es demasiado grande para enviar por Telegram (máx 50MB).")
    except Exception as e:
        logger.error(f"Error en download_video: {e}")
        await msg.edit_text(f"⚠️ No se pudo descargar: {str(e)[:200]}")


# ─── Análisis de página para extraer video ────────────────────────
async def analyze_page(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Analiza el HTML de una página y busca URLs de video (.mp4, .m3u8, etc).
    Útil para sitios que no soporta yt-dlp de forma nativa.
    IDEA FUTURA: usar Selenium/Playwright para páginas con JavaScript dinámico.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /analyze <url>")
        return

    url = ctx.args[0]
    await update.message.reply_text("🔍 Analizando página...")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")

        # Buscar etiquetas <video> y <source>
        video_urls = []
        for tag in soup.find_all(["video", "source"]):
            src = tag.get("src") or tag.get("data-src")
            if src:
                video_urls.append(src)

        # Buscar URLs .mp4 / .m3u8 en el HTML con regex
        # MODIFICAR: agregá más extensiones si el sitio usa formatos diferentes (.webm, .ts)
        pattern = re.compile(r'https?://[^\s"\'<>]+\.(mp4|m3u8|webm|mov)', re.IGNORECASE)
        found = pattern.findall(r.text)

        all_urls = list(set(video_urls + [m for m in found]))

        if all_urls:
            msg = f"🎬 *URLs de video encontradas:*\\n\\n" + "\\n".join([f"\`{u}\`" for u in all_urls[:5]])
        else:
            msg = "🤔 No se encontraron URLs de video directas. Probá con /download <url>."

        await update.message.reply_text(msg, parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en analyze_page: {e}")
        await update.message.reply_text("⚠️ Error al analizar la página.")


# ─── Ver calidades disponibles ────────────────────────────────────
async def list_quality(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Lista los formatos y calidades disponibles para un video.
    IDEA FUTURA: mostrar botones inline para elegir calidad directamente.
    """
    if not ctx.args:
        await update.message.reply_text("Uso: /quality <url>")
        return

    url = ctx.args[0]
    ydl_opts = {"quiet": True, "no_warnings": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = info.get("formats", [])
            lines = []
            for f in formats[-10:]:  # Últimas 10 (generalmente las mejores)
                ext = f.get("ext", "?")
                res = f.get("resolution", f.get("height", "?"))
                size = f.get("filesize")
                size_str = f"{size // 1024 // 1024}MB" if size else "?"
                lines.append(f"\`{ext}\` — {res} — {size_str}")
            msg = f"📊 *Calidades para:* {info.get('title', url)}\\n\\n" + "\\n".join(lines)
            await update.message.reply_text(msg[:4000], parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error en list_quality: {e}")
        await update.message.reply_text("⚠️ No se pudieron obtener las calidades.")


# ─── Handler automático: detectar links en mensajes ───────────────
async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Si el usuario envía un link directamente (sin comando), lo descarga automáticamente.
    IDEA FUTURA: preguntar al usuario si quiere video, audio o solo el link antes de descargar.
    """
    text = update.message.text or ""
    if text.startswith("http"):
        ctx.args = [text]
        await download_video(update, ctx)


if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("download", download_video))
    app.add_handler(CommandHandler("analyze", analyze_page))
    app.add_handler(CommandHandler("quality", list_quality))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    logger.info("📥 Media Downloader Bot iniciado...")
    app.run_polling()
`,
    },

    ai_chat: {
      name: { es: "Telegram AI Chat Bot", en: "Telegram AI Chat Bot" },
      purpose: {
        es: "Bot que simula conversación humana real usando OpenAI (ChatGPT). Puede cargarse con una personalidad específica o imitar estilos de conversación. Ideal para atención al cliente, asistentes virtuales o entretenimiento.",
        en: "Bot that simulates real human conversation using OpenAI (ChatGPT). Can be loaded with a specific personality or conversation style. Ideal for customer service, virtual assistants or entertainment.",
      },
      capabilities: {
        es: ["Conversación natural con IA (ChatGPT)", "Personalidad configurable por prompt", "Historial de conversación por usuario", "Importar estilo de chat desde archivo", "Respuestas con nombre y tono humanizado"],
        en: ["Natural AI conversation (ChatGPT)", "Configurable personality via prompt", "Per-user conversation history", "Import chat style from file", "Humanized name and tone responses"],
      },
      filename: "telegram_ai_chat.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de Telegram con IA conversacional (ChatGPT)
# PLATAFORMA: Telegram — python-telegram-bot v20+
# DEPENDENCIAS: openai, python-dotenv
# pip install openai python-dotenv
# ─────────────────────────────────────────────────────────────

import os
import logging
from openai import AsyncOpenAI
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")        # MODIFICAR: tu token de Telegram
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")    # MODIFICAR: tu clave de OpenAI

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# ─── Personalidad del bot ─────────────────────────────────────────
# MODIFICAR: cambiá este prompt para cambiar totalmente la personalidad del bot.
# Podés hacerlo sonar como un experto técnico, una persona amigable, un personaje, etc.
SYSTEM_PROMPT = """Sos un asistente conversacional amigable y natural.
Respondés en el mismo idioma que el usuario, con un tono cercano y humano.
Sos conciso pero completo. Nunca decís que sos una IA a menos que te pregunten directamente.
Tu nombre es Alex."""

# Historial de conversación por usuario (en memoria)
# IDEA FUTURA: guardar el historial en una base de datos (SQLite/PostgreSQL) para que persista entre reinicios
user_histories: dict[int, list] = {}
MAX_HISTORY = 20  # MODIFICAR: cantidad máxima de mensajes a recordar por usuario


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Inicio de conversación."""
    user_id = update.effective_user.id
    user_histories[user_id] = []  # Limpiar historial al iniciar
    await update.message.reply_text(
        "👋 ¡Hola! Soy Alex. Podés hablar conmigo de lo que quieras.\\n"
        "Usá /reset para reiniciar la conversación."
    )


async def reset(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Reinicia el historial de conversación del usuario."""
    user_id = update.effective_user.id
    user_histories[user_id] = []
    await update.message.reply_text("🔄 Conversación reiniciada. ¡Empecemos de nuevo!")


async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Procesa cada mensaje del usuario y genera una respuesta con ChatGPT.
    Mantiene el historial de la conversación para contexto continuo.
    IDEA FUTURA: agregar memoria de largo plazo resumiendo conversaciones viejas.
    """
    user_id = update.effective_user.id
    user_text = update.message.text

    if user_id not in user_histories:
        user_histories[user_id] = []

    # Agregar mensaje del usuario al historial
    user_histories[user_id].append({"role": "user", "content": user_text})

    # Limitar el historial para no exceder el contexto
    if len(user_histories[user_id]) > MAX_HISTORY:
        user_histories[user_id] = user_histories[user_id][-MAX_HISTORY:]

    try:
        # Mostrar indicador de escritura mientras pensamos
        await update.message.chat.send_action("typing")

        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # MODIFICAR: podés usar "gpt-4o" para respuestas más potentes
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                *user_histories[user_id],
            ],
            max_tokens=500,       # MODIFICAR: aumentá si querés respuestas más largas
            temperature=0.8,      # MODIFICAR: 0=muy formal, 1=muy creativo
        )

        reply = response.choices[0].message.content
        user_histories[user_id].append({"role": "assistant", "content": reply})
        await update.message.reply_text(reply)

    except Exception as e:
        logger.error(f"Error en handle_message: {e}")
        await update.message.reply_text("Perdón, tuve un problema. ¿Podés repetir eso?")


# ─── Cargar personalidad desde archivo ───────────────────────────
async def load_persona(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Carga un estilo de conversación desde un archivo de texto adjunto.
    El archivo debe tener un prompt de sistema en texto plano.
    IDEA FUTURA: cargar ejemplos de conversación para few-shot prompting.
    """
    global SYSTEM_PROMPT
    if update.message.document:
        file = await update.message.document.get_file()
        content = await file.download_as_bytearray()
        SYSTEM_PROMPT = content.decode("utf-8")
        await update.message.reply_text("✅ Nueva personalidad cargada correctamente.")
    else:
        await update.message.reply_text("📄 Adjuntá un archivo .txt con el prompt de personalidad.")


if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(CommandHandler("persona", load_persona))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(MessageHandler(filters.Document.ALL, load_persona))
    logger.info("🤖 AI Chat Bot iniciado...")
    app.run_polling()
`,
    },

    hybrid: {
      name: { es: "Telegram Híbrido: Seguridad + Entretenimiento", en: "Telegram Hybrid: Security + Entertainment" },
      purpose: {
        es: "Combina herramientas de seguridad (OSINT + CTF) con funciones de entretenimiento (juegos, trivia, chistes). Perfecto para comunidades técnicas que quieren mezclar trabajo y diversión.",
        en: "Combines security tools (OSINT + CTF) with entertainment features (games, trivia, jokes). Perfect for technical communities mixing work and fun.",
      },
      capabilities: {
        es: ["OSINT básico (IP, WHOIS)", "Encoding CTF (Base64, ROT13)", "Trivia de seguridad informática", "Generador de contraseñas fuertes", "Juego de adivinanza de comandos Linux"],
        en: ["Basic OSINT (IP, WHOIS)", "CTF encoding (Base64, ROT13)", "Cybersecurity trivia", "Strong password generator", "Linux command guessing game"],
      },
      filename: "telegram_hybrid_security_fun.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot híbrido — seguridad informática + entretenimiento
# PLATAFORMA: Telegram — python-telegram-bot v20+
# Combina OSINT, herramientas CTF y juegos para comunidades técnicas.
# ─────────────────────────────────────────────────────────────

import os
import base64
import hashlib
import random
import secrets
import string
import logging
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre de tu variable en .env

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─── Banco de trivia de seguridad informática ─────────────────────
# MODIFICAR: agregá más preguntas o cargarlas desde un archivo JSON externo
# IDEA FUTURA: sistema de puntuación con ranking de usuarios
TRIVIA = [
    {
        "q": "¿Qué significa SQL en SQL Injection?",
        "options": ["Structured Query Language", "Simple Query Language", "System Query Logic", "Secure Query Layer"],
        "answer": 0,
    },
    {
        "q": "¿Cuál es el puerto por defecto de HTTPS?",
        "options": ["80", "22", "443", "8080"],
        "answer": 2,
    },
    {
        "q": "¿Qué técnica OSINT usa motores de búsqueda para encontrar info sensible?",
        "options": ["Phishing", "Google Dorking", "Brute Force", "ARP Spoofing"],
        "answer": 1,
    },
    {
        "q": "¿Qué algoritmo de hash es considerado inseguro para contraseñas?",
        "options": ["bcrypt", "SHA-256", "MD5", "Argon2"],
        "answer": 2,
    },
]


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Menú principal con todas las opciones."""
    keyboard = [
        [InlineKeyboardButton("🔍 OSINT: Lookup IP", callback_data="osint")],
        [InlineKeyboardButton("🔐 CTF: Base64 Info", callback_data="ctf_info")],
        [InlineKeyboardButton("🎯 Trivia de Seguridad", callback_data="trivia")],
        [InlineKeyboardButton("🔑 Generar Contraseña", callback_data="passgen")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "🛡️ *Bot Híbrido: Seguridad + Diversión*\\n\\nElegí una opción:",
        reply_markup=reply_markup,
        parse_mode="Markdown",
    )


async def button_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Maneja los botones inline del menú principal."""
    query = update.callback_query
    await query.answer()

    if query.data == "osint":
        await query.edit_message_text("🔍 Usá: \`/ip <dirección>\` para hacer un lookup de IP.", parse_mode="Markdown")
    elif query.data == "ctf_info":
        await query.edit_message_text(
            "🔐 *Comandos CTF:*\\n\`/b64 <texto>\` — Base64\\n\`/rot <texto>\` — ROT13\\n\`/pass\` — Generar contraseña",
            parse_mode="Markdown",
        )
    elif query.data == "trivia":
        await start_trivia(update, ctx)
    elif query.data == "passgen":
        await gen_password(update, ctx)
    elif query.data.startswith("answer_"):
        await check_answer(update, ctx)


# ─── OSINT: IP Lookup ─────────────────────────────────────────────
async def ip_lookup(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Consulta info de IP. IDEA FUTURA: agregar mapa con la ubicación aproximada."""
    if not ctx.args:
        await update.message.reply_text("Uso: /ip <dirección IP>")
        return
    target = ctx.args[0]
    try:
        data = requests.get(f"http://ip-api.com/json/{target}", timeout=10).json()
        if data.get("status") == "success":
            msg = f"🌐 *{data['query']}* — {data['country']}, {data['city']}\\nISP: {data['isp']}"
        else:
            msg = f"❌ No se encontró info para: {target}"
        await update.message.reply_text(msg, parse_mode="Markdown")
    except Exception as e:
        await update.message.reply_text(f"⚠️ Error: {e}")


# ─── CTF: Encoding ───────────────────────────────────────────────
async def b64(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Codifica texto en Base64."""
    if not ctx.args:
        await update.message.reply_text("Uso: /b64 <texto>")
        return
    text = " ".join(ctx.args)
    encoded = base64.b64encode(text.encode()).decode()
    await update.message.reply_text(f"🔐 Base64: \`{encoded}\`", parse_mode="Markdown")


async def rot13(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Aplica ROT13."""
    if not ctx.args:
        await update.message.reply_text("Uso: /rot <texto>")
        return
    from codecs import encode as ce
    text = " ".join(ctx.args)
    await update.message.reply_text(f"🔄 ROT13: \`{ce(text, 'rot_13')}\`", parse_mode="Markdown")


# ─── Generador de contraseñas ────────────────────────────────────
async def gen_password(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Genera una contraseña fuerte y aleatoria usando secrets (criptográficamente seguro).
    IDEA FUTURA: preguntar la longitud y si incluir símbolos especiales.
    """
    length = 20  # MODIFICAR: cambiá la longitud según tus necesidades
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = "".join(secrets.choice(alphabet) for _ in range(length))
    strength = hashlib.sha256(password.encode()).hexdigest()[:8]
    msg = f"🔑 *Contraseña generada:*\\n\`{password}\`\\n\\n💪 Hash: \`{strength}...\`\\n⚠️ ¡No la compartas y guardala en un gestor de contraseñas!"
    if update.callback_query:
        await update.callback_query.edit_message_text(msg, parse_mode="Markdown")
    else:
        await update.message.reply_text(msg, parse_mode="Markdown")


# ─── Trivia interactiva ───────────────────────────────────────────
async def start_trivia(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Inicia una ronda de trivia de seguridad informática con botones inline."""
    question = random.choice(TRIVIA)
    ctx.user_data["trivia_answer"] = question["answer"]

    keyboard = [
        [InlineKeyboardButton(opt, callback_data=f"answer_{i}")]
        for i, opt in enumerate(question["options"])
    ]
    msg_text = f"🎯 *Trivia de Seguridad*\\n\\n{question['q']}"
    if update.callback_query:
        await update.callback_query.edit_message_text(msg_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
    else:
        await update.message.reply_text(msg_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")


async def check_answer(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Verifica la respuesta de la trivia."""
    query = update.callback_query
    selected = int(query.data.split("_")[1])
    correct = ctx.user_data.get("trivia_answer", -1)
    if selected == correct:
        await query.edit_message_text("✅ ¡Correcto! Bien jugado. Usá /start para más.")
    else:
        await query.edit_message_text(f"❌ Incorrecto. La respuesta era la opción #{correct + 1}. Usá /start para intentar de nuevo.")


if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ip", ip_lookup))
    app.add_handler(CommandHandler("b64", b64))
    app.add_handler(CommandHandler("rot", rot13))
    app.add_handler(CommandHandler("pass", gen_password))
    app.add_handler(CommandHandler("trivia", start_trivia))
    app.add_handler(CallbackQueryHandler(button_callback))
    logger.info("🛡️ Bot Híbrido Seguridad+Diversión iniciado...")
    app.run_polling()
`,
    },
  },

  // ─── WhatsApp Templates ────────────────────────────────────────────
  whatsapp: {
    osint: {
      name: { es: "WhatsApp OSINT Recon", en: "WhatsApp OSINT Recon" },
      purpose: {
        es: "Bot de WhatsApp para consultas OSINT: lookup de IP, WHOIS, headers HTTP y scraping básico. Responde por WhatsApp usando Twilio + Flask.",
        en: "WhatsApp bot for OSINT queries: IP lookup, WHOIS, HTTP headers and basic scraping. Responds via WhatsApp using Twilio + Flask.",
      },
      capabilities: {
        es: ["IP lookup con geolocalización", "WHOIS de dominios", "Cabeceras HTTP", "Web scraping básico", "Respuesta por WhatsApp vía Twilio"],
        en: ["IP lookup with geolocation", "Domain WHOIS", "HTTP headers", "Basic web scraping", "WhatsApp response via Twilio"],
      },
      filename: "whatsapp_osint_recon.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de WhatsApp para consultas OSINT
# PLATAFORMA: WhatsApp vía Twilio + Flask
# DEPENDENCIAS: flask, twilio, requests, python-whois, beautifulsoup4
# pip install flask twilio requests python-whois beautifulsoup4
# ─────────────────────────────────────────────────────────────

import os
import logging
import requests
import whois
from bs4 import BeautifulSoup
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()
# MODIFICAR: asegurate de tener estas variables en tu archivo .env
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
PORT = int(os.getenv("PORT", 5000))  # MODIFICAR: puerto del servidor Flask

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ip_lookup(target: str) -> str:
    """Consulta geolocalización de una IP. IDEA FUTURA: agregar ASN y abuse contact."""
    try:
        data = requests.get(f"http://ip-api.com/json/{target}", timeout=10).json()
        if data.get("status") == "success":
            return f"🌐 IP: {data['query']}\\nPaís: {data['country']}\\nCiudad: {data['city']}\\nISP: {data['isp']}"
        return f"❌ No se encontró info para: {target}"
    except Exception as e:
        return f"⚠️ Error: {e}"


def whois_lookup(domain: str) -> str:
    """Consulta WHOIS de un dominio. IDEA FUTURA: mostrar días restantes para vencimiento."""
    try:
        w = whois.whois(domain)
        return f"🔎 WHOIS: {domain}\\nRegistrar: {w.registrar}\\nCreado: {w.creation_date}\\nVence: {w.expiration_date}"
    except Exception as e:
        return f"⚠️ Error WHOIS: {e}"


def check_headers(url: str) -> str:
    """Devuelve las cabeceras HTTP más relevantes de seguridad."""
    try:
        if not url.startswith("http"):
            url = "https://" + url
        r = requests.head(url, timeout=10, allow_redirects=True)
        security_headers = ["Server", "X-Powered-By", "Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options"]
        lines = []
        for h in security_headers:
            val = r.headers.get(h, "No presente")
            lines.append(f"{h}: {val}")
        return f"📋 Headers de {url}:\\n" + "\\n".join(lines)
    except Exception as e:
        return f"⚠️ Error: {e}"


def scrape_page(url: str) -> str:
    """Extrae título y primeros links de una página."""
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        title = soup.title.string if soup.title else "Sin título"
        links = [a.get("href") for a in soup.find_all("a", href=True) if a.get("href", "").startswith("http")][:5]
        return f"🕷️ {url}\\nTítulo: {title}\\nLinks: " + "\\n".join(links)
    except Exception as e:
        return f"⚠️ Error: {e}"


# ─── Webhook de Twilio ────────────────────────────────────────────
@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """
    Endpoint que recibe mensajes de WhatsApp vía Twilio.
    MODIFICAR: cambiá la ruta '/whatsapp' si usás otra URL en el panel de Twilio.
    IDEA FUTURA: agregar autenticación del webhook con firma de Twilio.
    """
    incoming = request.values.get("Body", "").strip()
    response = MessagingResponse()
    msg = response.message()

    parts = incoming.split(" ", 1)
    cmd = parts[0].lower()
    arg = parts[1] if len(parts) > 1 else ""

    # MODIFICAR: podés agregar más comandos en este bloque if/elif
    if cmd == "menu":
        reply = ("🔍 *OSINT Bot WhatsApp*\\n\\n"
                 "ip <dirección> — Lookup de IP\\n"
                 "whois <dominio> — Info WHOIS\\n"
                 "headers <url> — Cabeceras HTTP\\n"
                 "scrape <url> — Scraping básico")
    elif cmd == "ip" and arg:
        reply = ip_lookup(arg)
    elif cmd == "whois" and arg:
        reply = whois_lookup(arg)
    elif cmd == "headers" and arg:
        reply = check_headers(arg)
    elif cmd == "scrape" and arg:
        reply = scrape_page(arg)
    else:
        reply = "Enviá *menu* para ver los comandos disponibles."

    msg.body(reply)
    return str(response)


if __name__ == "__main__":
    logger.info(f"🤖 WhatsApp OSINT Bot iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
`,
    },

    ctf: {
      name: { es: "WhatsApp CTF Helper", en: "WhatsApp CTF Helper" },
      purpose: {
        es: "Asistente CTF via WhatsApp. Permite codificar/decodificar, generar hashes y consultar referencias de seguridad directamente desde el chat de WhatsApp.",
        en: "CTF assistant via WhatsApp. Allows encoding/decoding, generating hashes and querying security references directly from WhatsApp chat.",
      },
      capabilities: {
        es: ["Base64/ROT13 por WhatsApp", "Hashing MD5/SHA256", "Payloads educativos SQL", "Análisis de strings", "Respuesta instantánea vía Twilio"],
        en: ["Base64/ROT13 via WhatsApp", "MD5/SHA256 hashing", "Educational SQL payloads", "String analysis", "Instant response via Twilio"],
      },
      filename: "whatsapp_ctf_helper.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de WhatsApp — asistente CTF y seguridad
# PLATAFORMA: WhatsApp vía Twilio + Flask
# DEPENDENCIAS: flask, twilio
# pip install flask twilio
# ─────────────────────────────────────────────────────────────

import os
import base64
import hashlib
import logging
from codecs import encode as ce
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")  # MODIFICAR
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")     # MODIFICAR
PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# IDEA FUTURA: cargar payloads desde un archivo JSON para actualizarlos sin tocar el código
SQL_PAYLOADS = ["' OR '1'='1", "admin' --", "' UNION SELECT NULL --", "' OR 1=1 LIMIT 1 --"]

MENU = ("🏴 *CTF Helper WhatsApp*\\n\\n"
        "b64enc <texto>\\n"
        "b64dec <texto>\\n"
        "rot13 <texto>\\n"
        "md5 <texto>\\n"
        "sha256 <texto>\\n"
        "sqli — Payloads SQL (educativo)\\n"
        "analyze <texto> — Análisis de string")


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """Webhook principal. MODIFICAR: la ruta debe coincidir con la configurada en Twilio."""
    incoming = request.values.get("Body", "").strip()
    response = MessagingResponse()
    msg = response.message()
    parts = incoming.split(" ", 1)
    cmd = parts[0].lower()
    arg = parts[1] if len(parts) > 1 else ""

    if cmd == "menu":
        reply = MENU
    elif cmd == "b64enc" and arg:
        reply = f"🔐 Base64: {base64.b64encode(arg.encode()).decode()}"
    elif cmd == "b64dec" and arg:
        try:
            reply = f"🔓 Decodificado: {base64.b64decode(arg).decode()}"
        except Exception:
            reply = "❌ No es Base64 válido."
    elif cmd == "rot13" and arg:
        reply = f"🔄 ROT13: {ce(arg, 'rot_13')}"
    elif cmd == "md5" and arg:
        reply = f"#️⃣ MD5: {hashlib.md5(arg.encode()).hexdigest()}"
    elif cmd == "sha256" and arg:
        reply = f"#️⃣ SHA256: {hashlib.sha256(arg.encode()).hexdigest()}"
    elif cmd == "sqli":
        reply = "💉 SQL Payloads (educativo/CTF):\\n" + "\\n".join(SQL_PAYLOADS) + "\\n⚠️ Solo en entornos autorizados."
    elif cmd == "analyze" and arg:
        is_b64 = len(arg) % 4 == 0
        is_hex = all(c in "0123456789abcdefABCDEF" for c in arg)
        reply = f"🔬 Longitud: {len(arg)}\\n¿Base64?: {'Sí' if is_b64 else 'No'}\\n¿HEX?: {'Sí' if is_hex else 'No'}\\nMD5: {hashlib.md5(arg.encode()).hexdigest()}"
    else:
        reply = "Enviá *menu* para ver los comandos."

    msg.body(reply)
    return str(response)


if __name__ == "__main__":
    logger.info(f"🏴 WhatsApp CTF Bot iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
`,
    },

    downloader: {
      name: { es: "WhatsApp Media Downloader", en: "WhatsApp Media Downloader" },
      purpose: {
        es: "Bot de WhatsApp que descarga videos de YouTube, TikTok y otros sitios al recibir un link, y responde con el archivo o con un link de descarga directa.",
        en: "WhatsApp bot that downloads videos from YouTube, TikTok and other sites when receiving a link, and responds with the file or a direct download link.",
      },
      capabilities: {
        es: ["Descarga YouTube/TikTok vía yt-dlp", "Detección automática de links en mensajes", "Envío de archivo o link de descarga", "Extracción de URL de video de páginas web"],
        en: ["YouTube/TikTok download via yt-dlp", "Automatic link detection in messages", "File or download link delivery", "Video URL extraction from web pages"],
      },
      filename: "whatsapp_media_downloader.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de WhatsApp para descargar videos/media
# PLATAFORMA: WhatsApp vía Twilio + Flask
# DEPENDENCIAS: flask, twilio, yt-dlp
# pip install flask twilio yt-dlp
# ─────────────────────────────────────────────────────────────

import os
import re
import tempfile
import logging
import yt_dlp
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client as TwilioClient
from dotenv import load_dotenv

load_dotenv()
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")  # MODIFICAR
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")     # MODIFICAR
TWILIO_WA_NUMBER = os.getenv("TWILIO_WA_NUMBER", "whatsapp:+14155238886")  # MODIFICAR: tu número Twilio
PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
twilio_client = TwilioClient(ACCOUNT_SID, AUTH_TOKEN)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOWNLOAD_DIR = tempfile.mkdtemp()  # MODIFICAR: carpeta permanente si querés guardar archivos

# Regex para detectar URLs en mensajes
URL_PATTERN = re.compile(r'https?://\\S+')


def get_video_info(url: str) -> dict:
    """
    Obtiene información del video sin descargarlo todavía.
    IDEA FUTURA: cachear la info para no consultar dos veces el mismo link.
    """
    ydl_opts = {"quiet": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=False)


def download_video(url: str) -> str | None:
    """
    Descarga el video y retorna la ruta del archivo.
    MODIFICAR: cambiá 'format' para ajustar la calidad (bestaudio, 480, 720, etc.)
    """
    ydl_opts = {
        "format": "best[filesize<15M]/worst",  # WhatsApp tiene límite menor que Telegram
        "outtmpl": os.path.join(DOWNLOAD_DIR, "%(id)s.%(ext)s"),
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """
    Webhook principal. Detecta si el mensaje contiene un link de video.
    IDEA FUTURA: agregar soporte para comandos /info y /quality.
    """
    incoming = request.values.get("Body", "").strip()
    from_number = request.values.get("From", "")
    response = MessagingResponse()
    msg = response.message()

    urls = URL_PATTERN.findall(incoming)

    if not urls:
        msg.body("📥 Enviame un link de YouTube, TikTok u otro sitio y lo descargo por vos.")
        return str(response)

    url = urls[0]
    msg.body(f"⏳ Procesando: {url[:60]}...")

    try:
        info = get_video_info(url)
        title = info.get("title", "Video")
        filepath = download_video(url)

        if filepath and os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size < 15 * 1024 * 1024:
                # MODIFICAR: necesitás una URL pública para el media_url (podés usar ngrok o un servidor)
                # Por ahora enviamos el título y link como confirmación
                msg.body(f"✅ Descargado: {title}\\n\\nℹ️ Para enviar archivos por WhatsApp necesitás una URL pública. Configurá ngrok o un servidor.")
            else:
                msg.body(f"⚠️ {title}\\nEl archivo es muy grande para WhatsApp (>{size//1024//1024}MB). Intentá con un video más corto.")
            os.remove(filepath)
        else:
            msg.body("❌ No se pudo descargar el video.")
    except Exception as e:
        logger.error(f"Error descargando: {e}")
        msg.body(f"⚠️ No pude descargar ese link: {str(e)[:100]}")

    return str(response)


if __name__ == "__main__":
    logger.info(f"📥 WhatsApp Media Downloader iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
`,
    },

    ai_chat: {
      name: { es: "WhatsApp AI Chat Bot", en: "WhatsApp AI Chat Bot" },
      purpose: {
        es: "Bot de WhatsApp que responde como una persona real usando ChatGPT. Mantiene contexto de conversación por usuario y puede tener personalidades customizadas.",
        en: "WhatsApp bot that responds like a real person using ChatGPT. Maintains conversation context per user and can have custom personalities.",
      },
      capabilities: {
        es: ["Conversación con IA (ChatGPT)", "Historial por usuario en memoria", "Personalidad configurable", "Respuesta natural via WhatsApp", "Comando de reseteo de chat"],
        en: ["AI conversation (ChatGPT)", "Per-user memory history", "Configurable personality", "Natural WhatsApp response", "Chat reset command"],
      },
      filename: "whatsapp_ai_chat.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot de WhatsApp con IA conversacional (ChatGPT)
# PLATAFORMA: WhatsApp vía Twilio + Flask
# DEPENDENCIAS: flask, twilio, openai
# pip install flask twilio openai
# ─────────────────────────────────────────────────────────────

import os
import logging
from openai import OpenAI
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")    # MODIFICAR
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")       # MODIFICAR
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")      # MODIFICAR
PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
client = OpenAI(api_key=OPENAI_API_KEY)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Personalidad del bot ─────────────────────────────────────────
# MODIFICAR: cambiá este texto para cambiar completamente el comportamiento del bot.
# Podés hacer que sea un asistente de soporte, un personaje, o un especialista en un tema.
SYSTEM_PROMPT = """Sos un asistente amigable y natural que responde por WhatsApp.
Respondés en el mismo idioma del usuario. Sos conciso (máximo 3 oraciones por mensaje).
Tu nombre es Alex. Sos cálido y claro, sin jerga técnica innecesaria."""

# Historial por número de usuario (en memoria)
# IDEA FUTURA: persistir con SQLite o Redis para que el historial sobreviva reinicios
user_histories: dict[str, list] = {}
MAX_HISTORY = 10  # MODIFICAR: aumentá para más contexto, reducí para ahorrar tokens


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """
    Webhook que recibe mensajes de WhatsApp y responde con IA.
    MODIFICAR: la URL de este endpoint debe configurarse en el panel de Twilio.
    """
    incoming = request.values.get("Body", "").strip()
    from_number = request.values.get("From", "unknown")
    response = MessagingResponse()
    msg = response.message()

    # Comando para resetear la conversación
    if incoming.lower() in ["reset", "reiniciar", "nuevo", "new"]:
        user_histories[from_number] = []
        msg.body("🔄 Conversación reiniciada. ¡Empecemos de nuevo!")
        return str(response)

    # Inicializar historial del usuario si no existe
    if from_number not in user_histories:
        user_histories[from_number] = []

    user_histories[from_number].append({"role": "user", "content": incoming})

    # Limitar historial
    if len(user_histories[from_number]) > MAX_HISTORY:
        user_histories[from_number] = user_histories[from_number][-MAX_HISTORY:]

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",  # MODIFICAR: "gpt-4o" para respuestas más potentes
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                *user_histories[from_number],
            ],
            max_tokens=300,   # MODIFICAR: WhatsApp funciona mejor con respuestas cortas
            temperature=0.7,  # MODIFICAR: 0=formal, 1=creativo
        )
        reply = completion.choices[0].message.content
        user_histories[from_number].append({"role": "assistant", "content": reply})
    except Exception as e:
        logger.error(f"Error OpenAI: {e}")
        reply = "Disculpá, tuve un problema. ¿Podés intentar de nuevo?"

    msg.body(reply)
    return str(response)


if __name__ == "__main__":
    logger.info(f"🤖 WhatsApp AI Chat Bot iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
`,
    },

    hybrid: {
      name: { es: "WhatsApp Híbrido: Seguridad + Diversión", en: "WhatsApp Hybrid: Security + Fun" },
      purpose: {
        es: "Bot de WhatsApp que combina herramientas de seguridad (OSINT, encoding CTF) con entretenimiento (trivia, generador de contraseñas). Ideal para grupos técnicos.",
        en: "WhatsApp bot combining security tools (OSINT, CTF encoding) with entertainment (trivia, password generator). Ideal for technical groups.",
      },
      capabilities: {
        es: ["OSINT básico por WhatsApp", "Base64/ROT13/Hashing", "Trivia de ciberseguridad", "Generador de contraseñas seguras", "Menú de texto navegable"],
        en: ["Basic OSINT via WhatsApp", "Base64/ROT13/Hashing", "Cybersecurity trivia", "Secure password generator", "Navigable text menu"],
      },
      filename: "whatsapp_hybrid_security_fun.py",
      code: `${PYTHON_HEADER}
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp híbrido — seguridad + entretenimiento
# PLATAFORMA: WhatsApp vía Twilio + Flask
# DEPENDENCIAS: flask, twilio, requests
# pip install flask twilio requests
# ─────────────────────────────────────────────────────────────

import os
import base64
import hashlib
import secrets
import string
import random
import logging
import requests
from codecs import encode as ce
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")  # MODIFICAR
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")     # MODIFICAR
PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# IDEA FUTURA: cargar trivia desde un archivo JSON para actualizarla sin tocar el código
TRIVIA_QUESTIONS = [
    ("¿Qué puerto usa SSH por defecto?", "22"),
    ("¿Qué significa CTF?", "Capture The Flag"),
    ("¿Qué herramienta se usa para escanear puertos?", "Nmap"),
    ("¿Qué protocolo cifra el tráfico web?", "HTTPS/TLS"),
]

MENU = """🛡️ *Bot Híbrido WhatsApp*

🔍 *OSINT:*
  ip <dirección>

🔐 *CTF:*
  b64enc <texto>
  b64dec <texto>
  rot13 <texto>
  md5 <texto>
  sha256 <texto>

🎮 *Diversión:*
  pass — Generar contraseña
  trivia — Pregunta de seguridad

Enviá *menu* para ver esto de nuevo."""


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """
    Webhook principal. Enruta comandos a sus funciones correspondientes.
    MODIFICAR: la URL debe coincidir con la configurada en el panel de Twilio Sandbox.
    """
    incoming = request.values.get("Body", "").strip()
    response = MessagingResponse()
    msg = response.message()
    parts = incoming.split(" ", 1)
    cmd = parts[0].lower()
    arg = parts[1] if len(parts) > 1 else ""

    # MODIFICAR: podés agregar más comandos en este bloque
    if cmd in ("menu", "hola", "start", "inicio"):
        reply = MENU
    elif cmd == "ip" and arg:
        try:
            data = requests.get(f"http://ip-api.com/json/{arg}", timeout=10).json()
            if data.get("status") == "success":
                reply = f"🌐 {data['query']} — {data['country']}, {data['city']}\\nISP: {data['isp']}"
            else:
                reply = f"❌ No encontré info para: {arg}"
        except Exception as e:
            reply = f"⚠️ Error: {e}"
    elif cmd == "b64enc" and arg:
        reply = f"🔐 {base64.b64encode(arg.encode()).decode()}"
    elif cmd == "b64dec" and arg:
        try:
            reply = f"🔓 {base64.b64decode(arg).decode()}"
        except Exception:
            reply = "❌ No es Base64 válido."
    elif cmd == "rot13" and arg:
        reply = f"🔄 {ce(arg, 'rot_13')}"
    elif cmd == "md5" and arg:
        reply = f"#️⃣ MD5: {hashlib.md5(arg.encode()).hexdigest()}"
    elif cmd == "sha256" and arg:
        reply = f"#️⃣ SHA256: {hashlib.sha256(arg.encode()).hexdigest()}"
    elif cmd == "pass":
        # MODIFICAR: cambiá 'length' para ajustar la longitud de la contraseña
        length = 18
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        reply = f"🔑 Contraseña: {password}\\n⚠️ ¡Guardala en un gestor de contraseñas!"
    elif cmd == "trivia":
        q, a = random.choice(TRIVIA_QUESTIONS)
        # IDEA FUTURA: guardar la respuesta por usuario y verificarla en el siguiente mensaje
        reply = f"🎯 Trivia:\\n{q}\\n\\n(Respuesta oculta — usá /respuesta para verla)"
        # Por simplicidad en WhatsApp la mostramos directamente
        reply = f"🎯 {q}\\n\\nRespuesta: {a}"
    else:
        reply = "Enviá *menu* para ver los comandos disponibles."

    msg.body(reply)
    return str(response)


if __name__ == "__main__":
    logger.info(f"🛡️ WhatsApp Híbrido iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
`,
    },
  },
};

// ─── Tipos para el constructor ──────────────────────────────────────
type Platform = "telegram" | "whatsapp";
type Purpose = "osint" | "ctf" | "downloader" | "ai_chat" | "hybrid";

interface Capability {
  id: string;
  label: { es: string; en: string };
  icon: string;
}

const CAPABILITIES: Capability[] = [
  { id: "get_post", label: { es: "Peticiones GET/POST", en: "GET/POST Requests" }, icon: "📡" },
  { id: "scraping", label: { es: "Web Scraping", en: "Web Scraping" }, icon: "🕷️" },
  { id: "encoding", label: { es: "Encoding (Base64/ROT13)", en: "Encoding (Base64/ROT13)" }, icon: "🔐" },
  { id: "hashing", label: { es: "Hashing (MD5/SHA256)", en: "Hashing (MD5/SHA256)" }, icon: "#️⃣" },
  { id: "sql", label: { es: "SQL Injection (CTF/Educativo)", en: "SQL Injection (CTF/Educational)" }, icon: "💉" },
  { id: "downloader", label: { es: "Descarga de Videos/Media", en: "Video/Media Download" }, icon: "📥" },
  { id: "ai", label: { es: "Conversación con IA (ChatGPT)", en: "AI Conversation (ChatGPT)" }, icon: "🤖" },
  { id: "geolocation", label: { es: "Geolocalización de IPs", en: "IP Geolocation" }, icon: "🌐" },
  { id: "trivia", label: { es: "Juegos / Trivia", en: "Games / Trivia" }, icon: "🎯" },
  { id: "password", label: { es: "Generador de Contraseñas", en: "Password Generator" }, icon: "🔑" },
];

// Mapeo de capacidades a propósito sugerido
const CAPABILITY_TO_PURPOSE: Record<string, Purpose> = {
  get_post: "osint",
  scraping: "osint",
  encoding: "ctf",
  hashing: "ctf",
  sql: "ctf",
  downloader: "downloader",
  ai: "ai_chat",
  geolocation: "osint",
  trivia: "hybrid",
  password: "hybrid",
};

const PURPOSE_ICONS: Record<Purpose, string> = {
  osint: "🔍",
  ctf: "🏴",
  downloader: "📥",
  ai_chat: "🤖",
  hybrid: "🛡️",
};

const PURPOSE_LABELS: Record<Purpose, { es: string; en: string }> = {
  osint: { es: "OSINT / Reconocimiento", en: "OSINT / Recon" },
  ctf: { es: "CTF / Seguridad Informática", en: "CTF / Cybersecurity" },
  downloader: { es: "Descargador de Media", en: "Media Downloader" },
  ai_chat: { es: "Chat con IA", en: "AI Chat" },
  hybrid: { es: "Híbrido: Seguridad + Diversión", en: "Hybrid: Security + Fun" },
};

export default function BotBuilder() {
  const { lang, t } = useLanguage();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [selectedCaps, setSelectedCaps] = useState<Set<string>>(new Set());

  const T = (es: string, en: string) => (lang === "es" ? es : en);

  const toggleCap = (id: string) => {
    const next = new Set(selectedCaps);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Sugerir propósito automáticamente según las capacidades seleccionadas
      const suggested = CAPABILITY_TO_PURPOSE[id];
      if (suggested && !purpose) {
        setPurpose(suggested);
      }
    }
    setSelectedCaps(next);
  };

  // Obtener el template seleccionado
  const template =
    platform && purpose
      ? TEMPLATES[platform]?.[purpose] ?? null
      : null;

  // Calcular propósito sugerido según las capacidades marcadas
  const suggestedPurpose = (): Purpose | null => {
    const votes: Record<Purpose, number> = { osint: 0, ctf: 0, downloader: 0, ai_chat: 0, hybrid: 0 };
    selectedCaps.forEach((cap) => {
      const p = CAPABILITY_TO_PURPOSE[cap];
      if (p) votes[p]++;
    });
    const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 0 ? (best[0] as Purpose) : null;
  };

  const suggested = suggestedPurpose();

  return (
    <Layout>
      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {T("Constructor de Bot", "Bot Builder")}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          {T(
            "Seleccioná la plataforma, el propósito y las capacidades de tu bot. Te mostramos la plantilla perfecta con código completo.",
            "Select the platform, purpose and capabilities of your bot. We'll show you the perfect template with full code."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Panel izquierdo: Configuración ─────────────────────── */}
        <div className="lg:col-span-1 space-y-5">

          {/* 1. Plataforma */}
          <div className="border border-border rounded-lg p-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              {T("1. Plataforma", "1. Platform")}
            </h2>
            <div className="space-y-2">
              {(["telegram", "whatsapp"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border ${
                    platform === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-base">{p === "telegram" ? "✈️" : "💬"}</span>
                  {p === "telegram" ? "Telegram" : "WhatsApp"}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Propósito */}
          <div className="border border-border rounded-lg p-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              {T("2. Propósito del Bot", "2. Bot Purpose")}
            </h2>
            <div className="space-y-1.5">
              {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => {
                const isSuggested = suggested === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPurpose(p)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border ${
                      purpose === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span>{PURPOSE_ICONS[p]}</span>
                    <span className="flex-1 text-left">{PURPOSE_LABELS[p][lang]}</span>
                    {isSuggested && purpose !== p && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                        {T("sugerido", "suggested")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Capacidades */}
          <div className="border border-border rounded-lg p-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              {T("3. Capacidades (opcional)", "3. Capabilities (optional)")}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              {T("Marcá las funciones que necesitás. Te sugerimos el propósito automáticamente.", "Check the features you need. We'll suggest a purpose automatically.")}
            </p>
            <div className="space-y-1.5">
              {CAPABILITIES.map((cap) => {
                const checked = selectedCaps.has(cap.id);
                return (
                  <button
                    key={cap.id}
                    onClick={() => toggleCap(cap.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      checked ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="h-4 w-4 flex-shrink-0 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span>{cap.icon}</span>
                    <span>{cap.label[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Panel derecho: Preview del template ─────────────────── */}
        <div className="lg:col-span-2">
          {!template ? (
            <div className="border border-dashed border-border rounded-lg h-full min-h-64 flex flex-col items-center justify-center text-center p-8">
              <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">
                {T("Seleccioná una plataforma y un propósito para ver la plantilla.", "Select a platform and purpose to preview the template.")}
              </p>
              <p className="text-muted-foreground/60 text-sm mt-1">
                {T("O marcá capacidades para recibir una sugerencia automática.", "Or check capabilities to get an automatic suggestion.")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info del template */}
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{PURPOSE_ICONS[purpose!]}</span>
                  <div>
                    <h2 className="text-xl font-bold">{template.name[lang]}</h2>
                    <p className="text-muted-foreground text-sm mt-1">{template.purpose[lang]}</p>
                  </div>
                </div>

                {/* Capacidades del template */}
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {T("Capacidades incluidas", "Included capabilities")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.capabilities[lang].map((cap, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Advertencia para CTF */}
                {purpose === "ctf" && (
                  <div className="mt-4 flex gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                    <ShieldAlert className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      {T(
                        "⚠️ Este código es exclusivamente para uso educativo, CTF y entornos de laboratorio autorizados. Nunca lo uses en sistemas sin permiso explícito.",
                        "⚠️ This code is exclusively for educational use, CTF and authorized lab environments. Never use it on systems without explicit permission."
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Código */}
              <CodeBlock
                code={template.code}
                language="python"
                filename={template.filename}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
