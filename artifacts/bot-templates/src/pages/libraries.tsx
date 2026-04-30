import { useState } from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import { Library, Server, HardDrive, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from "lucide-react";

const T = (lang: string, es: string, en: string) => (lang === "es" ? es : en);

// ─── Archivos del sistema de bibliotecas ─────────────────────────

const BOT_CONFIG_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║           IMPLEMENTACIÓN DEL CÓDIGO                          ║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Configuración central de bibliotecas y módulos del bot
# Editá este archivo para habilitar o deshabilitar herramientas.
# ─────────────────────────────────────────────────────────────

BOT_CONFIG = {

    # ─── Rutas de bibliotecas ──────────────────────────────────
    # MODIFICAR: path local donde están los archivos .py de herramientas
    "local_libs_path": "./libs",

    # MODIFICAR: URL de tu servidor con bibliotecas en la nube.
    # Dejá en None para no usar bibliotecas remotas.
    # Ejemplo: "https://mi-servidor.com/bot-libs"
    # Ejemplo: "https://raw.githubusercontent.com/AlbertiJ/Replit-bot/main/libs"
    "cloud_libs_url": None,

    # MODIFICAR: si True, intenta cargar desde la nube si no encuentra el archivo local
    "fallback_to_cloud": True,

    # ─── Módulos habilitados ───────────────────────────────────
    # Cambiá True/False para activar o desactivar cada herramienta
    # Si una librería no está instalada, el bot la omite sin romperse
    "enabled_modules": {

        # ── OSINT ──
        "osint_ip_lookup":    True,   # Geolocalización e info de IPs
        "osint_whois":        True,   # Consultas WHOIS de dominios
        "osint_dns":          True,   # Resolución y análisis DNS
        "osint_http_headers": True,   # Cabeceras HTTP de servidores
        "osint_web_scraping": True,   # Extracción de datos de páginas web
        "osint_shodan":       False,  # Requiere API key de Shodan (shodan.io)
        "osint_virustotal":   False,  # Requiere API key de VirusTotal

        # ── CTF / Seguridad ──
        "ctf_encoding":       True,   # Base64, ROT13, Hex, URL encoding
        "ctf_hashing":        True,   # MD5, SHA1, SHA256, SHA512
        "ctf_sql_patterns":   True,   # Payloads SQL para entornos CTF (educativo)
        "ctf_xss_patterns":   False,  # Payloads XSS para CTF (educativo)
        "ctf_jwt_decoder":    True,   # Decodificador de tokens JWT
        "ctf_port_scanner":   False,  # Escáner de puertos (requiere permisos root)

        # ── Utilidades ──
        "utils_password_gen": True,   # Generador de contraseñas seguras
        "utils_qr_gen":       False,  # Generador de códigos QR (pip install qrcode)
        "utils_ip_range":     True,   # Cálculo de rangos de red (CIDR)
    },

    # IDEA FUTURA: agregar soporte para autenticación en el servidor de libs
    # "cloud_auth_token": os.getenv("LIBS_SERVER_TOKEN"),
}
`;

const LIB_LOADER_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio)  |  Dueño: Juan Alberti   ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Cargador dinámico de bibliotecas locales y remotas
# Uso: from lib_loader import LibLoader
# ─────────────────────────────────────────────────────────────

import os
import sys
import logging
import importlib.util
import requests
import tempfile
from bot_config import BOT_CONFIG  # Importa la configuración central

logger = logging.getLogger(__name__)


class LibLoader:
    """
    Carga módulos Python desde una carpeta local o desde una URL remota.
    Los módulos deshabilitados en bot_config.py se omiten sin generar errores.

    IDEA FUTURA: agregar caché de módulos remotos para no descargarlos en cada inicio.
    IDEA FUTURA: firma digital para verificar integridad de módulos descargados.
    """

    def __init__(self):
        self.local_path = BOT_CONFIG.get("local_libs_path", "./libs")
        self.cloud_url = BOT_CONFIG.get("cloud_libs_url")
        self.fallback = BOT_CONFIG.get("fallback_to_cloud", True)
        self.enabled = BOT_CONFIG.get("enabled_modules", {})
        self._cache = {}

    def is_enabled(self, module_name: str) -> bool:
        """Verifica si un módulo está habilitado en la configuración."""
        return self.enabled.get(module_name, False)

    def load_local(self, module_name: str):
        """
        Carga un módulo Python desde la carpeta local (libs/).
        Retorna el módulo si existe y está habilitado, None si no.
        MODIFICAR: cambiá 'local_libs_path' en bot_config.py para apuntar a otra carpeta.
        """
        if not self.is_enabled(module_name):
            logger.debug(f"Módulo deshabilitado: {module_name}")
            return None

        filepath = os.path.join(self.local_path, f"{module_name}.py")

        if not os.path.exists(filepath):
            logger.warning(f"No encontrado localmente: {filepath}")
            return None

        try:
            spec = importlib.util.spec_from_file_location(module_name, filepath)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self._cache[module_name] = module
            logger.info(f"Modulo local cargado: {module_name}")
            return module
        except Exception as e:
            logger.error(f"Error cargando {module_name}: {e}")
            return None

    def load_from_cloud(self, module_name: str):
        """
        Descarga y carga un módulo Python desde la URL del servidor remoto.
        MODIFICAR: configurá 'cloud_libs_url' en bot_config.py con la URL de tu servidor.
        IDEA FUTURA: agregar autenticación Bearer token para URLs privadas.
        """
        if not self.cloud_url or not self.is_enabled(module_name):
            return None

        url = f"{self.cloud_url.rstrip('/')}/{module_name}.py"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code != 200:
                logger.warning(f"No encontrado en nube: {url} (status {r.status_code})")
                return None

            # Guardamos el código en un archivo temporal para cargarlo
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
                tmp.write(r.text)
                tmp_path = tmp.name

            spec = importlib.util.spec_from_file_location(module_name, tmp_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            os.unlink(tmp_path)

            self._cache[module_name] = module
            logger.info(f"Modulo remoto cargado: {module_name} desde {url}")
            return module

        except Exception as e:
            logger.error(f"Error cargando desde nube {module_name}: {e}")
            return None

    def get(self, module_name: str):
        """
        Carga un módulo: primero local, luego nube si fallback está activo.
        Retorna el módulo o None si no se pudo cargar.

        Uso:
            loader = LibLoader()
            osint = loader.get("osint_ip_lookup")
            if osint:
                info = osint.lookup("8.8.8.8")
        """
        if module_name in self._cache:
            return self._cache[module_name]

        module = self.load_local(module_name)

        if module is None and self.fallback:
            module = self.load_from_cloud(module_name)

        return module

    def load_all_enabled(self) -> dict:
        """
        Carga todos los módulos habilitados en bot_config.py al iniciar el bot.
        IDEA FUTURA: cargar en paralelo usando threading para reducir el tiempo de inicio.
        """
        results = {}
        for module_name, enabled in self.enabled.items():
            if enabled:
                mod = self.get(module_name)
                results[module_name] = mod is not None
        logger.info(f"Módulos cargados: {sum(results.values())}/{len(results)}")
        return results


# ─── Instancia global del loader ──────────────────────────────────
# Importá esta instancia en tu bot para usarla
loader = LibLoader()
`;

const OSINT_LIB_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio)  |  Dueño: Juan Alberti   ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# LIBRERÍA LOCAL: libs/osint_ip_lookup.py
# PROPÓSITO: Funciones OSINT para lookup de IP y geolocalización
# ─────────────────────────────────────────────────────────────

import requests
import socket


def lookup(ip_or_domain: str) -> dict:
    """
    Obtiene información pública de una IP o dominio.
    Usa la API gratuita ip-api.com (sin clave requerida).

    IDEA FUTURA: integrar con Shodan API para info de puertos abiertos.
    IDEA FUTURA: agregar MaxMind GeoIP como fuente alternativa.

    Retorna dict con: ip, country, city, isp, org, timezone, lat, lon
    """
    try:
        target = ip_or_domain.strip()

        # Si es dominio, primero resolvemos la IP
        # MODIFICAR: podés agregar resolución IPv6 con socket.getaddrinfo
        if not _is_ip(target):
            target = socket.gethostbyname(target)

        r = requests.get(f"http://ip-api.com/json/{target}?lang=es", timeout=10)
        data = r.json()

        if data.get("status") == "success":
            return {
                "success": True,
                "ip": data.get("query"),
                "country": data.get("country"),
                "region": data.get("regionName"),
                "city": data.get("city"),
                "zip": data.get("zip"),
                "isp": data.get("isp"),
                "org": data.get("org"),
                "timezone": data.get("timezone"),
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "proxy": data.get("proxy", False),
                "hosting": data.get("hosting", False),
            }
        return {"success": False, "error": "No se encontró información"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def format_for_bot(ip_or_domain: str) -> str:
    """
    Formatea la información de IP para enviar por bot (Telegram o WhatsApp).
    MODIFICAR: ajustá el formato según la plataforma que uses.
    """
    data = lookup(ip_or_domain)
    if not data["success"]:
        return f"Error: {data['error']}"

    proxy_str = "Si (posible VPN/Proxy)" if data.get("proxy") else "No"
    hosting_str = "Si (servidor/hosting)" if data.get("hosting") else "No"

    return (
        f"Resultado para: {ip_or_domain}\n"
        f"IP: {data['ip']}\n"
        f"Pais: {data['country']}\n"
        f"Region: {data['region']}\n"
        f"Ciudad: {data['city']}\n"
        f"ISP: {data['isp']}\n"
        f"Org: {data['org']}\n"
        f"Zona horaria: {data['timezone']}\n"
        f"Coordenadas: {data['lat']}, {data['lon']}\n"
        f"Proxy/VPN: {proxy_str}\n"
        f"Hosting: {hosting_str}"
    )


def _is_ip(text: str) -> bool:
    """Detecta si el string es una IP (v4) o un dominio."""
    parts = text.split(".")
    if len(parts) == 4:
        return all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)
    return False
`;

const CTF_LIB_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio)  |  Dueño: Juan Alberti   ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# LIBRERÍA LOCAL: libs/ctf_encoding.py
# PROPÓSITO: Funciones de encoding/decoding para CTF y análisis
# ⚠️ Solo para uso educativo y entornos CTF autorizados
# ─────────────────────────────────────────────────────────────

import base64
import hashlib
import binascii
import json
from codecs import encode as codec_encode
from urllib.parse import quote, unquote


# ─── Encoding ─────────────────────────────────────────────────────

def b64_encode(text: str) -> str:
    """Codifica texto en Base64."""
    return base64.b64encode(text.encode()).decode()

def b64_decode(text: str) -> str:
    """
    Decodifica Base64. Retorna error si el formato es inválido.
    IDEA FUTURA: detectar automáticamente Base64 URL-safe vs estándar.
    """
    try:
        return base64.b64decode(text).decode()
    except Exception:
        return "ERROR: No es Base64 válido"

def rot13(text: str) -> str:
    """Cifrado ROT13. IDEA FUTURA: agregar ROT47 para ASCII extendido."""
    return codec_encode(text, "rot_13")

def to_hex(text: str) -> str:
    """Convierte texto a representación hexadecimal."""
    return text.encode().hex()

def from_hex(hex_str: str) -> str:
    """Convierte hexadecimal a texto."""
    try:
        return bytes.fromhex(hex_str).decode()
    except Exception:
        return "ERROR: Hex inválido"

def url_encode(text: str) -> str:
    """URL-encode de un string. Útil para análisis de parámetros."""
    return quote(text)

def url_decode(text: str) -> str:
    """URL-decode de un string."""
    return unquote(text)


# ─── Hashing ──────────────────────────────────────────────────────

def md5(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()

def sha1(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()

def sha512(text: str) -> str:
    return hashlib.sha512(text.encode()).hexdigest()

def all_hashes(text: str) -> dict:
    """
    Calcula todos los hashes disponibles de un texto.
    IDEA FUTURA: agregar NTLM hash para análisis de credenciales Windows en CTF.
    """
    return {
        "input":  text,
        "md5":    md5(text),
        "sha1":   sha1(text),
        "sha256": sha256(text),
        "sha512": sha512(text),
    }


# ─── JWT Decoder ──────────────────────────────────────────────────

def decode_jwt(token: str) -> dict:
    """
    Decodifica un token JWT sin verificar la firma.
    Útil en CTF para analizar el contenido del payload.
    IDEA FUTURA: agregar verificación de firma con clave pública conocida.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {"error": "No es un JWT válido"}

        def decode_part(part: str) -> dict:
            # Agregar padding si es necesario
            padding = 4 - len(part) % 4
            part += "=" * (padding % 4)
            return json.loads(base64.urlsafe_b64decode(part).decode())

        return {
            "header":  decode_part(parts[0]),
            "payload": decode_part(parts[1]),
            "signature": parts[2][:20] + "...",
        }
    except Exception as e:
        return {"error": str(e)}


# ─── Análisis automático ───────────────────────────────────────────

def analyze(text: str) -> dict:
    """
    Analiza un string e intenta detectar el tipo de encoding.
    IDEA FUTURA: integrar con CyberChef API para análisis avanzado.
    """
    is_b64 = len(text) % 4 == 0 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" for c in text)
    is_hex = all(c in "0123456789abcdefABCDEF" for c in text) and len(text) % 2 == 0
    is_jwt = text.count(".") == 2 and len(text) > 20

    result = {
        "length":     len(text),
        "likely_b64": is_b64,
        "likely_hex": is_hex,
        "likely_jwt": is_jwt,
        "md5":        md5(text),
    }

    if is_b64:
        result["b64_decoded"] = b64_decode(text)
    if is_hex:
        result["hex_decoded"] = from_hex(text)
    if is_jwt:
        result["jwt_decoded"] = decode_jwt(text)

    return result
`;

const CLOUD_BRIDGE_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio)  |  Dueño: Juan Alberti   ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# LIBRERÍA: libs/cloud_bridge.py
# PROPÓSITO: Puente para comunicarse con un servidor remoto de herramientas
# Permite que el bot consulte APIs propias alojadas en la nube
# ─────────────────────────────────────────────────────────────

import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# MODIFICAR: URL de tu servidor de herramientas en la nube
# Puede ser un VPS propio, Railway, Render, etc.
CLOUD_SERVER_URL = os.getenv("CLOUD_SERVER_URL", "https://tu-servidor.com")
CLOUD_AUTH_TOKEN = os.getenv("CLOUD_AUTH_TOKEN", None)  # Token opcional para APIs privadas

# Tiempo máximo de espera para requests remotos
# MODIFICAR: aumentá si tu servidor es lento, reducí para respuestas más rápidas
REQUEST_TIMEOUT = 15


def _headers() -> dict:
    """
    Genera los headers de autenticación para el servidor remoto.
    MODIFICAR: adaptá según el tipo de auth que use tu servidor (Bearer, API-Key, etc.)
    """
    h = {"Content-Type": "application/json"}
    if CLOUD_AUTH_TOKEN:
        h["Authorization"] = f"Bearer {CLOUD_AUTH_TOKEN}"
    return h


def call_tool(tool_name: str, params: dict) -> dict:
    """
    Llama a una herramienta remota en el servidor de la nube.

    Ejemplo de uso:
        result = call_tool("osint_scan", {"target": "192.168.1.1"})

    Tu servidor debe exponer el endpoint: POST /tools/{tool_name}
    IDEA FUTURA: cachear resultados repetidos para reducir llamadas al servidor.
    """
    url = f"{CLOUD_SERVER_URL}/tools/{tool_name}"
    try:
        r = requests.post(url, json=params, headers=_headers(), timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        logger.error(f"No se pudo conectar al servidor: {CLOUD_SERVER_URL}")
        return {"error": "Servidor no disponible"}
    except requests.exceptions.Timeout:
        logger.error(f"Timeout al llamar a {tool_name}")
        return {"error": "Timeout del servidor"}
    except Exception as e:
        logger.error(f"Error en cloud_bridge.call_tool: {e}")
        return {"error": str(e)}


def fetch_remote_lib(lib_name: str, save_to: str = "./libs") -> bool:
    """
    Descarga una biblioteca Python desde el servidor remoto y la guarda localmente.
    Permite actualizar herramientas del bot sin reiniciarlo manualmente.

    MODIFICAR: tu servidor debe exponer: GET /libs/{lib_name}.py
    IDEA FUTURA: verificar hash SHA256 del archivo descargado para seguridad.
    """
    url = f"{CLOUD_SERVER_URL}/libs/{lib_name}.py"
    try:
        r = requests.get(url, headers=_headers(), timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            os.makedirs(save_to, exist_ok=True)
            filepath = os.path.join(save_to, f"{lib_name}.py")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(r.text)
            logger.info(f"Libreria descargada: {lib_name} -> {filepath}")
            return True
        logger.warning(f"Libreria no encontrada en servidor: {lib_name}")
        return False
    except Exception as e:
        logger.error(f"Error descargando libreria {lib_name}: {e}")
        return False


def check_server_status() -> bool:
    """
    Verifica si el servidor remoto está activo.
    IDEA FUTURA: enviar notificación al bot si el servidor cae.
    """
    try:
        r = requests.get(f"{CLOUD_SERVER_URL}/health", timeout=5)
        return r.status_code == 200
    except Exception:
        return False
`;

const REQUIREMENTS_TXT = `# ─────────────────────────────────────────────────────────────
# DEPENDENCIAS EXTENDIDAS para bots con sistema de bibliotecas
# Instalación: pip install -r requirements_extended.txt
# ─────────────────────────────────────────────────────────────

# ─── Bot ──────────────────────────────────────────────────────
python-telegram-bot==20.7   # Telegram (alternativa: solo Flask para WhatsApp)
flask==3.0.0                # WhatsApp webhook server
twilio==8.10.0              # WhatsApp via Twilio

# ─── Carga de variables de entorno ────────────────────────────
python-dotenv==1.0.0

# ─── HTTP / Web ───────────────────────────────────────────────
requests==2.31.0
beautifulsoup4==4.12.2      # Web scraping
lxml==5.0.0                 # Parser HTML rápido (alternativa a html.parser)

# ─── OSINT ────────────────────────────────────────────────────
python-whois==0.8.0         # Consultas WHOIS
dnspython==2.4.2            # DNS lookup y análisis

# ─── CTF / Seguridad ──────────────────────────────────────────
# (no requieren instalación: base64, hashlib, codecs son estándar de Python)
pyjwt==2.8.0                # Codificación y análisis de JWT

# ─── IA / Chat ────────────────────────────────────────────────
openai==1.12.0              # Integración con ChatGPT (si usás ai_chat)

# ─── Media ────────────────────────────────────────────────────
yt-dlp==2024.1.19           # Descarga de videos (YouTube, TikTok, etc.)

# ─── OPCIONALES (descomentar según necesidad) ─────────────────
# shodan==1.28.0            # Shodan API (requiere API key)
# qrcode==7.4.2             # Generador de códigos QR
# pillow==10.2.0            # Procesamiento de imágenes
# cryptography==42.0.0      # Cifrado avanzado
`;

const USE_IN_BOT_PY = `# ─────────────────────────────────────────────────────────────
# EJEMPLO: Cómo usar el sistema de bibliotecas en tu bot
# Archivo: mi_bot_osint.py
# ─────────────────────────────────────────────────────────────

import os
import logging
from lib_loader import loader          # Importa el loader global
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # MODIFICAR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Cargar módulos al inicio ─────────────────────────────────────
# El loader busca primero en ./libs/ y si no encuentra, intenta la nube
osint_ip  = loader.get("osint_ip_lookup")   # None si está deshabilitado
ctf_enc   = loader.get("ctf_encoding")
ctf_hash  = loader.get("ctf_hashing")

logger.info(f"OSINT IP: {'OK' if osint_ip else 'No disponible'}")
logger.info(f"CTF Encoding: {'OK' if ctf_enc else 'No disponible'}")


async def ip_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Usa la librería osint_ip_lookup si está disponible."""
    if not osint_ip:
        await update.message.reply_text("Modulo OSINT IP no disponible. Activalo en bot_config.py")
        return

    if not ctx.args:
        await update.message.reply_text("Uso: /ip <direccion o dominio>")
        return

    # Llamamos a la función de la librería cargada
    resultado = osint_ip.format_for_bot(ctx.args[0])
    await update.message.reply_text(resultado)


async def encode_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Usa la librería ctf_encoding si está disponible."""
    if not ctf_enc:
        await update.message.reply_text("Modulo CTF Encoding no disponible.")
        return

    if not ctx.args:
        await update.message.reply_text("Uso: /b64 <texto>")
        return

    texto = " ".join(ctx.args)
    encoded = ctf_enc.b64_encode(texto)
    await update.message.reply_text(f"Base64: {encoded}")


if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("ip", ip_cmd))
    app.add_handler(CommandHandler("b64", encode_cmd))
    logger.info("Bot con sistema de librerias iniciado...")
    app.run_polling()
`;

// ─── Componente de sección colapsable ─────────────────────────────
function Section({
  title, icon, children, defaultOpen = false
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div className="flex items-center gap-3 font-semibold text-sm">
          {icon}
          {title}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

// ─── Tabla de módulos ─────────────────────────────────────────────
const MODULES = [
  { id: "osint_ip_lookup",    cat: "OSINT",    label: "IP Lookup / Geolocalización",   default: true,  requires: "requests" },
  { id: "osint_whois",        cat: "OSINT",    label: "WHOIS de dominios",              default: true,  requires: "python-whois" },
  { id: "osint_dns",          cat: "OSINT",    label: "Análisis DNS",                   default: true,  requires: "dnspython" },
  { id: "osint_http_headers", cat: "OSINT",    label: "Cabeceras HTTP",                 default: true,  requires: "requests" },
  { id: "osint_web_scraping", cat: "OSINT",    label: "Web Scraping",                   default: true,  requires: "beautifulsoup4" },
  { id: "osint_shodan",       cat: "OSINT",    label: "Shodan API",                     default: false, requires: "shodan + API Key" },
  { id: "osint_virustotal",   cat: "OSINT",    label: "VirusTotal API",                 default: false, requires: "requests + API Key" },
  { id: "ctf_encoding",       cat: "CTF",      label: "Encoding (Base64/ROT13/Hex)",    default: true,  requires: "stdlib" },
  { id: "ctf_hashing",        cat: "CTF",      label: "Hashing (MD5/SHA256/SHA512)",    default: true,  requires: "stdlib" },
  { id: "ctf_sql_patterns",   cat: "CTF",      label: "SQL Patterns (CTF/educativo)",   default: true,  requires: "stdlib" },
  { id: "ctf_jwt_decoder",    cat: "CTF",      label: "JWT Decoder",                    default: true,  requires: "pyjwt" },
  { id: "ctf_port_scanner",   cat: "CTF",      label: "Port Scanner",                   default: false, requires: "root/admin + nmap" },
  { id: "utils_password_gen", cat: "Utilidad", label: "Generador de contraseñas",       default: true,  requires: "stdlib" },
  { id: "utils_ip_range",     cat: "Utilidad", label: "Cálculo de rangos de red (CIDR)", default: true, requires: "stdlib" },
  { id: "utils_qr_gen",       cat: "Utilidad", label: "Generador de códigos QR",        default: false, requires: "qrcode + pillow" },
];

export default function Libraries() {
  const { lang } = useLanguage();
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map(m => [m.id, m.default]))
  );

  const toggle = (id: string) => setModules(prev => ({ ...prev, [id]: !prev[id] }));

  const catColors: Record<string, string> = {
    OSINT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    CTF: "bg-red-500/10 text-red-400 border-red-500/20",
    Utilidad: "bg-green-500/10 text-green-400 border-green-500/20",
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Library className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {T(lang, "Sistema de Bibliotecas", "Library System")}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          {T(lang,
            "Amplía las capacidades de tus bots con módulos locales y remotos. Activá o desactivá herramientas sin tocar el código del bot.",
            "Extend your bots' capabilities with local and remote modules. Enable or disable tools without touching the bot code."
          )}
        </p>
      </div>

      {/* Arquitectura visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: <HardDrive className="h-5 w-5 text-green-400" />,
            title: T(lang, "Bibliotecas Locales", "Local Libraries"),
            desc: T(lang, "Archivos .py en la carpeta libs/ de tu proyecto. Sin internet, sin dependencias externas.", "Python files in your project's libs/ folder. No internet, no external dependencies."),
            badge: "libs/",
            color: "border-green-500/30 bg-green-500/5",
          },
          {
            icon: <Server className="h-5 w-5 text-blue-400" />,
            title: T(lang, "Bibliotecas en la Nube", "Cloud Libraries"),
            desc: T(lang, "Módulos alojados en tu servidor. El bot los descarga automáticamente desde la URL configurada.", "Modules hosted on your server. The bot downloads them automatically from the configured URL."),
            badge: "CLOUD_SERVER_URL",
            color: "border-blue-500/30 bg-blue-500/5",
          },
          {
            icon: <ToggleRight className="h-5 w-5 text-purple-400" />,
            title: T(lang, "Módulos Variables", "Variable Modules"),
            desc: T(lang, "Cada módulo puede activarse/desactivarse en bot_config.py. El bot funciona aunque falte alguno.", "Each module can be toggled in bot_config.py. The bot works even if some are missing."),
            badge: "bot_config.py",
            color: "border-purple-500/30 bg-purple-500/5",
          },
        ].map((card, i) => (
          <div key={i} className={`border rounded-lg p-4 ${card.color}`}>
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="font-semibold text-sm">{card.title}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{card.desc}</p>
            <code className="text-xs bg-background/60 px-2 py-1 rounded font-mono">{card.badge}</code>
          </div>
        ))}
      </div>

      {/* Configurador visual de módulos */}
      <div className="border border-border rounded-lg overflow-hidden mb-8">
        <div className="px-5 py-3.5 bg-muted/40 border-b border-border">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <ToggleRight className="h-4 w-4 text-primary" />
            {T(lang, "Configurador de Módulos (bot_config.py)", "Module Configurator (bot_config.py)")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {T(lang, "Simulación visual — en tu proyecto editás bot_config.py directamente.", "Visual simulation — in your project you edit bot_config.py directly.")}
          </p>
        </div>
        <div className="divide-y divide-border">
          {["OSINT", "CTF", "Utilidad"].map(cat => (
            <div key={cat}>
              <div className={`px-5 py-2 text-xs font-bold uppercase tracking-wider ${catColors[cat]} border-b border-border/50`}>
                {cat}
              </div>
              {MODULES.filter(m => m.cat === cat).map(mod => (
                <div key={mod.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggle(mod.id)} className="flex-shrink-0">
                      {modules[mod.id]
                        ? <ToggleRight className="h-5 w-5 text-green-400" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div>
                      <span className="text-sm font-medium">{mod.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{mod.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${modules[mod.id] ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                      {modules[mod.id] ? T(lang, "Activo", "Active") : T(lang, "Inactivo", "Inactive")}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block font-mono">{mod.requires}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Estructura de carpetas */}
      <div className="border border-border rounded-lg p-5 mb-8 bg-muted/20">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          {T(lang, "Estructura de carpetas del proyecto", "Project folder structure")}
        </h2>
        <pre className="text-xs font-mono text-muted-foreground leading-relaxed">{`mi-bot/
├── bot_config.py          # Configuración central (módulos ON/OFF + URLs)
├── lib_loader.py          # Cargador de bibliotecas (local + nube)
├── mi_bot.py              # Tu bot principal
├── requirements.txt       # Dependencias base
├── requirements_extended.txt  # Dependencias opcionales
├── .env                   # Tokens y claves (NUNCA en git)
├── .gitignore
└── libs/                  # Carpeta de bibliotecas locales
    ├── osint_ip_lookup.py
    ├── osint_whois.py
    ├── osint_dns.py
    ├── osint_http_headers.py
    ├── osint_web_scraping.py
    ├── ctf_encoding.py
    ├── ctf_hashing.py
    ├── ctf_sql_patterns.py
    ├── ctf_jwt_decoder.py
    ├── utils_password_gen.py
    └── cloud_bridge.py    # Puente con servidor remoto`}</pre>
      </div>

      {/* Archivos de código */}
      <Section title={T(lang, "bot_config.py — Configuración central", "bot_config.py — Central configuration")} icon={<span className="text-base">⚙️</span>} defaultOpen={true}>
        <p className="text-sm text-muted-foreground mb-3">
          {T(lang, "Editá este archivo para activar/desactivar módulos y configurar las URLs de tus servidores.", "Edit this file to enable/disable modules and configure your server URLs.")}
        </p>
        <CodeBlock code={BOT_CONFIG_PY} language="python" filename="bot_config.py" />
      </Section>

      <Section title={T(lang, "lib_loader.py — Cargador dinámico", "lib_loader.py — Dynamic loader")} icon={<span className="text-base">🔧</span>}>
        <p className="text-sm text-muted-foreground mb-3">
          {T(lang, "Este módulo carga las bibliotecas automáticamente: primero busca en libs/, luego en la nube si está configurado.", "This module loads libraries automatically: first looks in libs/, then in the cloud if configured.")}
        </p>
        <CodeBlock code={LIB_LOADER_PY} language="python" filename="lib_loader.py" />
      </Section>

      <Section title={T(lang, "libs/osint_ip_lookup.py — Biblioteca OSINT", "libs/osint_ip_lookup.py — OSINT Library")} icon={<span className="text-base">🔍</span>}>
        <p className="text-sm text-muted-foreground mb-3">
          {T(lang, "Ejemplo de biblioteca local para OSINT. Copiá este patrón para crear tus propias bibliotecas.", "Example of local OSINT library. Copy this pattern to create your own libraries.")}
        </p>
        <CodeBlock code={OSINT_LIB_PY} language="python" filename="libs/osint_ip_lookup.py" />
      </Section>

      <Section title={T(lang, "libs/ctf_encoding.py — Biblioteca CTF", "libs/ctf_encoding.py — CTF Library")} icon={<span className="text-base">🏴</span>}>
        <p className="text-sm text-muted-foreground mb-3">
          {T(lang, "Biblioteca de encoding, hashing y análisis para CTF. Incluye auto-detección de tipo de encoding.", "Encoding, hashing and analysis library for CTF. Includes auto-detection of encoding type.")}
        </p>
        <CodeBlock code={CTF_LIB_PY} language="python" filename="libs/ctf_encoding.py" />
      </Section>

      <Section title={T(lang, "libs/cloud_bridge.py — Puente con servidor remoto", "libs/cloud_bridge.py — Remote server bridge")} icon={<span className="text-base">☁️</span>}>
        <p className="text-sm text-muted-foreground mb-3">
          {T(lang, "Conecta tu bot con tu propio servidor en la nube para consultar herramientas externas o descargar módulos nuevos.", "Connects your bot to your own cloud server to query external tools or download new modules.")}
        </p>
        <CodeBlock code={CLOUD_BRIDGE_PY} language="python" filename="libs/cloud_bridge.py" />
      </Section>

      <Section title={T(lang, "requirements_extended.txt — Dependencias", "requirements_extended.txt — Dependencies")} icon={<span className="text-base">📦</span>}>
        <CodeBlock code={REQUIREMENTS_TXT} language="bash" filename="requirements_extended.txt" />
      </Section>

      <Section title={T(lang, "Ejemplo de uso en tu bot", "Example usage in your bot")} icon={<span className="text-base">🤖</span>}>
        <p className="text-sm text-muted-foreground mb-3">
          {T(lang, "Así se usa el sistema de bibliotecas dentro de un bot Telegram. El patrón es idéntico para WhatsApp.", "This is how the library system is used inside a Telegram bot. The pattern is identical for WhatsApp.")}
        </p>
        <CodeBlock code={USE_IN_BOT_PY} language="python" filename="mi_bot_con_libs.py" />
      </Section>
    </Layout>
  );
}
