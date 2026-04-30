import { useState } from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import {
  ShieldAlert, Search, Bot, MessageSquare,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  Zap, Globe, Hash, Code2, Database, Wifi
} from "lucide-react";

const T = (lang: string, es: string, en: string) => (lang === "es" ? es : en);

// ─── Definición de herramientas disponibles ───────────────────────
const TOOLS = [
  { id: "ip_lookup",    icon: <Globe className="h-4 w-4" />,      label: { es: "IP Lookup / Geo",        en: "IP Lookup / Geo" },      cat: "osint", platforms: ["telegram","whatsapp"] },
  { id: "whois",        icon: <Search className="h-4 w-4" />,      label: { es: "WHOIS de dominios",      en: "WHOIS Lookup" },          cat: "osint", platforms: ["telegram","whatsapp"] },
  { id: "dns",          icon: <Wifi className="h-4 w-4" />,        label: { es: "Análisis DNS",           en: "DNS Analysis" },          cat: "osint", platforms: ["telegram"] },
  { id: "http_headers", icon: <Code2 className="h-4 w-4" />,       label: { es: "Cabeceras HTTP",         en: "HTTP Headers" },          cat: "osint", platforms: ["telegram","whatsapp"] },
  { id: "web_scraping", icon: <Globe className="h-4 w-4" />,       label: { es: "Web Scraping",           en: "Web Scraping" },          cat: "osint", platforms: ["telegram","whatsapp"] },
  { id: "b64",          icon: <Code2 className="h-4 w-4" />,       label: { es: "Encoding Base64/Hex",    en: "Base64/Hex Encoding" },   cat: "ctf",   platforms: ["telegram","whatsapp"] },
  { id: "hashing",      icon: <Hash className="h-4 w-4" />,        label: { es: "Hashing MD5/SHA256",     en: "MD5/SHA256 Hashing" },    cat: "ctf",   platforms: ["telegram","whatsapp"] },
  { id: "sql_patterns", icon: <Database className="h-4 w-4" />,    label: { es: "SQL Patterns (CTF)",     en: "SQL Patterns (CTF)" },    cat: "ctf",   platforms: ["telegram","whatsapp"] },
  { id: "jwt",          icon: <Zap className="h-4 w-4" />,         label: { es: "JWT Decoder",            en: "JWT Decoder" },           cat: "ctf",   platforms: ["telegram"] },
  { id: "auto_analyze", icon: <ShieldAlert className="h-4 w-4" />, label: { es: "Auto-análisis de string","en": "Auto String Analysis" }, cat: "ctf",   platforms: ["telegram","whatsapp"] },
];

// ─── Plantillas de código por plataforma ─────────────────────────

const TELEGRAM_CTF_OSINT_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║           IMPLEMENTACIÓN DEL CÓDIGO                          ║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╠══════════════════════════════════════════════════════════════╣
# ║  DISCLAIMER — Código Abierto. Solo uso ético y legal.        ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot Telegram CTF+OSINT con sistema de bibliotecas
# Carga módulos desde libs/ o desde servidor remoto según config
# ─────────────────────────────────────────────────────────────

import os
import logging
from lib_loader import loader       # Sistema de carga de bibliotecas
from bot_config import BOT_CONFIG   # Configuración central
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre de tu variable en .env

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─── Cargar módulos al inicio ─────────────────────────────────────
# Cada módulo se carga si está habilitado en bot_config.py
# Si no está disponible, los comandos correspondientes muestran un aviso
# IDEA FUTURA: recargar módulos en caliente con /reload_libs sin reiniciar el bot
osint_ip  = loader.get("osint_ip_lookup")
osint_dns = loader.get("osint_dns")
osint_hdr = loader.get("osint_http_headers")
osint_scr = loader.get("osint_web_scraping")
ctf_enc   = loader.get("ctf_encoding")
ctf_hash  = loader.get("ctf_hashing")
ctf_sql   = loader.get("ctf_sql_patterns")
ctf_jwt   = loader.get("ctf_jwt_decoder")

# Log del estado de módulos al arrancar
loaded_count = sum(1 for m in [osint_ip, osint_dns, osint_hdr, osint_scr, ctf_enc, ctf_hash, ctf_sql, ctf_jwt] if m)
logger.info(f"Modulos cargados: {loaded_count}/8")


def _mod_unavailable(name: str) -> str:
    """Mensaje estándar cuando un módulo no está disponible."""
    return f"Modulo {name} no disponible. Activalo en bot_config.py y verifica que este instalado."


# ─── /start — Menú principal ──────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Muestra el menú con los comandos disponibles según módulos cargados."""
    osint_cmds = []
    ctf_cmds   = []

    if osint_ip:  osint_cmds.append("/ip <target>  — IP Lookup + Geo")
    if osint_dns: osint_cmds.append("/dns <dominio> — Análisis DNS")
    if osint_hdr: osint_cmds.append("/headers <url> — Cabeceras HTTP")
    if osint_scr: osint_cmds.append("/scrape <url>  — Web Scraping")

    if ctf_enc:   ctf_cmds.append("/b64enc <txt>  — Base64 Encode")
    if ctf_enc:   ctf_cmds.append("/b64dec <txt>  — Base64 Decode")
    if ctf_enc:   ctf_cmds.append("/rot13 <txt>   — ROT13")
    if ctf_enc:   ctf_cmds.append("/hex <txt>     — Texto a Hex")
    if ctf_hash:  ctf_cmds.append("/hash <txt>    — Todos los hashes")
    if ctf_sql:   ctf_cmds.append("/sqli          — SQL Payloads (CTF)")
    if ctf_jwt:   ctf_cmds.append("/jwt <token>   — Decodificar JWT")
    if ctf_enc:   ctf_cmds.append("/analyze <txt> — Auto análisis")

    osint_section = "OSINT:\n" + "\n".join(osint_cmds) if osint_cmds else "OSINT: sin modulos activos"
    ctf_section   = "CTF:\n" + "\n".join(ctf_cmds) if ctf_cmds else "CTF: sin modulos activos"

    msg = f"Bot CTF+OSINT Telegram\n\n{osint_section}\n\n{ctf_section}\n\n/libs — Ver estado de modulos"
    await update.message.reply_text(msg)


# ─── /libs — Estado de módulos ────────────────────────────────────
async def libs_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Muestra el estado de cada módulo: cargado, deshabilitado o no encontrado.
    IDEA FUTURA: botón para recargar un módulo específico desde la nube.
    """
    status = [
        ("osint_ip_lookup",    osint_ip),
        ("osint_dns",          osint_dns),
        ("osint_http_headers", osint_hdr),
        ("osint_web_scraping", osint_scr),
        ("ctf_encoding",       ctf_enc),
        ("ctf_hashing",        ctf_hash),
        ("ctf_sql_patterns",   ctf_sql),
        ("ctf_jwt_decoder",    ctf_jwt),
    ]
    lines = [f"{'OK' if mod else 'NO'}  {name}" for name, mod in status]
    await update.message.reply_text("Estado de modulos:\n\n" + "\n".join(lines))


# ─── OSINT Commands ───────────────────────────────────────────────

async def ip_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Lookup de IP usando la librería osint_ip_lookup."""
    if not osint_ip:
        await update.message.reply_text(_mod_unavailable("osint_ip_lookup"))
        return
    if not ctx.args:
        await update.message.reply_text("Uso: /ip <IP o dominio>")
        return
    # MODIFICAR: la función format_for_bot() retorna texto listo para enviar
    await update.message.reply_text(osint_ip.format_for_bot(ctx.args[0]))


async def dns_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Análisis DNS del dominio. IDEA FUTURA: detectar subdominios con wordlist."""
    if not osint_dns:
        await update.message.reply_text(_mod_unavailable("osint_dns"))
        return
    if not ctx.args:
        await update.message.reply_text("Uso: /dns <dominio>")
        return
    await update.message.reply_text(osint_dns.lookup(ctx.args[0]))


async def headers_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Cabeceras HTTP del servidor. IDEA FUTURA: puntuar seguridad según cabeceras."""
    if not osint_hdr:
        await update.message.reply_text(_mod_unavailable("osint_http_headers"))
        return
    if not ctx.args:
        await update.message.reply_text("Uso: /headers <url>")
        return
    await update.message.reply_text(osint_hdr.check(ctx.args[0]))


async def scrape_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Scraping básico de una página web."""
    if not osint_scr:
        await update.message.reply_text(_mod_unavailable("osint_web_scraping"))
        return
    if not ctx.args:
        await update.message.reply_text("Uso: /scrape <url>")
        return
    await update.message.reply_text(osint_scr.scrape(ctx.args[0]))


# ─── CTF Commands ─────────────────────────────────────────────────

async def b64enc_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctf_enc: await update.message.reply_text(_mod_unavailable("ctf_encoding")); return
    if not ctx.args: await update.message.reply_text("Uso: /b64enc <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"Base64: {ctf_enc.b64_encode(text)}")


async def b64dec_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctf_enc: await update.message.reply_text(_mod_unavailable("ctf_encoding")); return
    if not ctx.args: await update.message.reply_text("Uso: /b64dec <texto>"); return
    await update.message.reply_text(f"Decodificado: {ctf_enc.b64_decode(ctx.args[0])}")


async def rot13_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctf_enc: await update.message.reply_text(_mod_unavailable("ctf_encoding")); return
    if not ctx.args: await update.message.reply_text("Uso: /rot13 <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"ROT13: {ctf_enc.rot13(text)}")


async def hex_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctf_enc: await update.message.reply_text(_mod_unavailable("ctf_encoding")); return
    if not ctx.args: await update.message.reply_text("Uso: /hex <texto>"); return
    text = " ".join(ctx.args)
    await update.message.reply_text(f"HEX: {ctf_enc.to_hex(text)}")


async def hash_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Genera todos los hashes de un texto. IDEA FUTURA: agregar NTLM para CTF Windows."""
    if not ctf_hash: await update.message.reply_text(_mod_unavailable("ctf_hashing")); return
    if not ctx.args: await update.message.reply_text("Uso: /hash <texto>"); return
    text = " ".join(ctx.args)
    h = ctf_hash.all_hashes(text)
    msg = f"Hashes para: {text}\nMD5:    {h['md5']}\nSHA1:   {h['sha1']}\nSHA256: {h['sha256']}"
    await update.message.reply_text(msg)


async def sqli_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Muestra payloads SQL para CTF. Solo uso educativo/autorizado."""
    if not ctf_sql: await update.message.reply_text(_mod_unavailable("ctf_sql_patterns")); return
    payloads = ctf_sql.get_payloads()
    await update.message.reply_text("SQL Payloads (CTF):\n\n" + "\n".join(payloads) + "\n\nSolo entornos autorizados.")


async def jwt_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Decodifica un JWT para análisis en CTF."""
    if not ctf_jwt: await update.message.reply_text(_mod_unavailable("ctf_jwt_decoder")); return
    if not ctx.args: await update.message.reply_text("Uso: /jwt <token>"); return
    import json
    result = ctf_jwt.decode_jwt(ctx.args[0])
    await update.message.reply_text(f"JWT decodificado:\n{json.dumps(result, indent=2, ensure_ascii=False)}")


async def analyze_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Auto-detecta el tipo de encoding/hash de un string."""
    if not ctf_enc: await update.message.reply_text(_mod_unavailable("ctf_encoding")); return
    if not ctx.args: await update.message.reply_text("Uso: /analyze <texto>"); return
    import json
    text = " ".join(ctx.args)
    result = ctf_enc.analyze(text)
    await update.message.reply_text(f"Analisis:\n{json.dumps(result, indent=2, ensure_ascii=False)[:1000]}")


# ─── Main ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN).build()
    handlers = [
        ("start",   start),      ("libs",    libs_status),
        ("ip",      ip_cmd),     ("dns",     dns_cmd),
        ("headers", headers_cmd),("scrape",  scrape_cmd),
        ("b64enc",  b64enc_cmd), ("b64dec",  b64dec_cmd),
        ("rot13",   rot13_cmd),  ("hex",     hex_cmd),
        ("hash",    hash_cmd),   ("sqli",    sqli_cmd),
        ("jwt",     jwt_cmd),    ("analyze", analyze_cmd),
    ]
    for name, handler in handlers:
        app.add_handler(CommandHandler(name, handler))
    logger.info("Bot CTF+OSINT Telegram iniciado...")
    app.run_polling()
`;

const WHATSAPP_CTF_OSINT_PY = `# ╔══════════════════════════════════════════════════════════════╗
# ║           IMPLEMENTACIÓN DEL CÓDIGO                          ║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╠══════════════════════════════════════════════════════════════╣
# ║  DISCLAIMER — Código Abierto. Solo uso ético y legal.        ║
# ╚══════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Bot WhatsApp CTF+OSINT con sistema de bibliotecas
# PLATAFORMA: WhatsApp vía Twilio + Flask
# ─────────────────────────────────────────────────────────────

import os
import json
import logging
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from lib_loader import loader       # Sistema de carga de bibliotecas
from dotenv import load_dotenv

load_dotenv()
PORT = int(os.getenv("PORT", 5000))  # MODIFICAR: puerto del servidor

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Cargar módulos al inicio ─────────────────────────────────────
# MODIFICAR: habilita/deshabilita módulos en bot_config.py
osint_ip  = loader.get("osint_ip_lookup")
osint_hdr = loader.get("osint_http_headers")
osint_scr = loader.get("osint_web_scraping")
ctf_enc   = loader.get("ctf_encoding")
ctf_hash  = loader.get("ctf_hashing")
ctf_sql   = loader.get("ctf_sql_patterns")

loaded_count = sum(1 for m in [osint_ip, osint_hdr, osint_scr, ctf_enc, ctf_hash, ctf_sql] if m)
logger.info(f"Modulos cargados: {loaded_count}/6")


def _unavailable(name: str) -> str:
    return f"Modulo {name} no disponible. Activalo en bot_config.py"


def build_menu() -> str:
    """Genera el menú dinámicamente según los módulos activos."""
    lines = ["Bot CTF+OSINT WhatsApp\n"]
    if osint_ip:  lines.append("ip <target>      - IP Lookup")
    if osint_hdr: lines.append("headers <url>    - Cabeceras HTTP")
    if osint_scr: lines.append("scrape <url>     - Web Scraping")
    if ctf_enc:   lines.append("b64enc <texto>   - Base64 Encode")
    if ctf_enc:   lines.append("b64dec <texto>   - Base64 Decode")
    if ctf_enc:   lines.append("rot13 <texto>    - ROT13")
    if ctf_hash:  lines.append("hash <texto>     - Hashes MD5/SHA")
    if ctf_sql:   lines.append("sqli             - SQL Payloads CTF")
    if ctf_enc:   lines.append("analyze <texto>  - Auto analisis")
    lines.append("libs             - Estado de modulos")
    return "\n".join(lines)


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """
    Webhook principal. Enruta comandos a sus módulos correspondientes.
    MODIFICAR: la URL debe coincidir con la configurada en Twilio.
    IDEA FUTURA: agregar sistema de autenticación para restringir usuarios.
    """
    incoming = request.values.get("Body", "").strip()
    response = MessagingResponse()
    msg = response.message()

    parts = incoming.lower().split(" ", 1)
    cmd = parts[0]
    arg = parts[1] if len(parts) > 1 else ""

    # Router de comandos
    if cmd in ("menu", "start", "hola", "inicio"):
        reply = build_menu()

    elif cmd == "libs":
        status_lines = [
            f"{'OK' if osint_ip else 'NO'}  osint_ip_lookup",
            f"{'OK' if osint_hdr else 'NO'}  osint_http_headers",
            f"{'OK' if osint_scr else 'NO'}  osint_web_scraping",
            f"{'OK' if ctf_enc else 'NO'}  ctf_encoding",
            f"{'OK' if ctf_hash else 'NO'}  ctf_hashing",
            f"{'OK' if ctf_sql else 'NO'}  ctf_sql_patterns",
        ]
        reply = "Estado de modulos:\n\n" + "\n".join(status_lines)

    elif cmd == "ip" and arg:
        reply = osint_ip.format_for_bot(arg) if osint_ip else _unavailable("osint_ip_lookup")

    elif cmd == "headers" and arg:
        reply = osint_hdr.check(arg) if osint_hdr else _unavailable("osint_http_headers")

    elif cmd == "scrape" and arg:
        reply = osint_scr.scrape(arg) if osint_scr else _unavailable("osint_web_scraping")

    elif cmd == "b64enc" and arg:
        reply = f"Base64: {ctf_enc.b64_encode(arg)}" if ctf_enc else _unavailable("ctf_encoding")

    elif cmd == "b64dec" and arg:
        reply = f"Decodificado: {ctf_enc.b64_decode(arg)}" if ctf_enc else _unavailable("ctf_encoding")

    elif cmd == "rot13" and arg:
        reply = f"ROT13: {ctf_enc.rot13(arg)}" if ctf_enc else _unavailable("ctf_encoding")

    elif cmd == "hash" and arg:
        if ctf_hash:
            h = ctf_hash.all_hashes(arg)
            reply = f"Hashes:\nMD5:    {h['md5']}\nSHA1:   {h['sha1']}\nSHA256: {h['sha256']}"
        else:
            reply = _unavailable("ctf_hashing")

    elif cmd == "sqli":
        if ctf_sql:
            payloads = ctf_sql.get_payloads()
            reply = "SQL Payloads (CTF):\n" + "\n".join(payloads) + "\nSolo entornos autorizados."
        else:
            reply = _unavailable("ctf_sql_patterns")

    elif cmd == "analyze" and arg:
        if ctf_enc:
            result = ctf_enc.analyze(arg)
            reply = f"Analisis:\nLongitud: {result['length']}\nBase64: {'Si' if result['likely_b64'] else 'No'}\nHex: {'Si' if result['likely_hex'] else 'No'}\nJWT: {'Si' if result['likely_jwt'] else 'No'}\nMD5: {result['md5']}"
        else:
            reply = _unavailable("ctf_encoding")

    else:
        reply = "Enviá 'menu' para ver los comandos disponibles."

    msg.body(reply)
    return str(response)


if __name__ == "__main__":
    logger.info(f"Bot WhatsApp CTF+OSINT iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
`;

// ─── Componente de sección colapsable ─────────────────────────────
function Section({
  title, icon, badge, children, defaultOpen = false
}: {
  title: string; icon: React.ReactNode; badge?: string; children: React.ReactNode; defaultOpen?: boolean
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
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-normal">
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

// ─── Página principal CTF/OSINT ───────────────────────────────────
export default function CtfOsint() {
  const { lang } = useLanguage();
  const [platform, setPlatform] = useState<"telegram" | "whatsapp">("telegram");
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>(
    Object.fromEntries(TOOLS.map(t => [t.id, true]))
  );

  const toggle = (id: string) => setEnabledTools(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredTools = TOOLS.filter(t => t.platforms.includes(platform));
  const osintTools = filteredTools.filter(t => t.cat === "osint");
  const ctfTools   = filteredTools.filter(t => t.cat === "ctf");

  const enabledCount = filteredTools.filter(t => enabledTools[t.id]).length;

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
              {T(lang, "Panel CTF / OSINT", "CTF / OSINT Panel")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {T(lang, "⚠️ Solo para uso educativo, CTF y entornos autorizados", "⚠️ For educational, CTF and authorized environments only")}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-lg">
          {T(lang,
            "Panel dedicado para bots de seguridad informática. Configurá las herramientas activas y descargá la plantilla lista para usar con el sistema de bibliotecas.",
            "Dedicated panel for cybersecurity bots. Configure active tools and download the ready-to-use template with the library system."
          )}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
        <ShieldAlert className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
            {T(lang, "Uso Responsable", "Responsible Use")}
          </p>
          <p className="text-muted-foreground">
            {T(lang,
              "Las herramientas de este panel son para investigación, CTF (Capture The Flag) y auditorías en entornos autorizados. Nunca las uses contra sistemas sin permiso explícito del propietario.",
              "The tools in this panel are for research, CTF (Capture The Flag) and audits in authorized environments. Never use them against systems without explicit permission from the owner."
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Panel izquierdo: Configuración ─────────────────────── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Plataforma */}
          <div className="border border-border rounded-lg p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {T(lang, "Plataforma", "Platform")}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(["telegram", "whatsapp"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                    platform === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {p === "telegram" ? <Bot className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  {p === "telegram" ? "Telegram" : "WhatsApp"}
                </button>
              ))}
            </div>
          </div>

          {/* Herramientas OSINT */}
          <div className="border border-blue-500/30 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20 text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Search className="h-3.5 w-3.5" /> OSINT
            </div>
            <div className="divide-y divide-border">
              {osintTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => toggle(tool.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-muted/30 ${
                    enabledTools[tool.id] ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {enabledTools[tool.id]
                    ? <ToggleRight className="h-4 w-4 text-green-400 flex-shrink-0" />
                    : <ToggleLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <span className="text-muted-foreground flex-shrink-0">{tool.icon}</span>
                  <span className="text-left">{tool.label[lang as "es" | "en"]}</span>
                </button>
              ))}
              {osintTools.length === 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground">{T(lang, "No hay herramientas OSINT para esta plataforma.", "No OSINT tools for this platform.")}</p>
              )}
            </div>
          </div>

          {/* Herramientas CTF */}
          <div className="border border-red-500/30 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5" /> CTF
            </div>
            <div className="divide-y divide-border">
              {ctfTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => toggle(tool.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-muted/30 ${
                    enabledTools[tool.id] ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {enabledTools[tool.id]
                    ? <ToggleRight className="h-4 w-4 text-green-400 flex-shrink-0" />
                    : <ToggleLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <span className="text-muted-foreground flex-shrink-0">{tool.icon}</span>
                  <span className="text-left">{tool.label[lang as "es" | "en"]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="border border-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{enabledCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {T(lang, `de ${filteredTools.length} herramientas activas`, `of ${filteredTools.length} tools active`)}
            </p>
          </div>
        </div>

        {/* ─── Panel derecho: Código y guía ───────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Info del bot */}
          <div className={`border rounded-lg p-5 ${platform === "telegram" ? "border-blue-500/30 bg-blue-500/5" : "border-green-500/30 bg-green-500/5"}`}>
            <div className="flex items-center gap-3 mb-3">
              {platform === "telegram"
                ? <Bot className="h-6 w-6 text-blue-400" />
                : <MessageSquare className="h-6 w-6 text-green-400" />}
              <div>
                <h2 className="font-bold text-lg">
                  {platform === "telegram"
                    ? T(lang, "Telegram CTF+OSINT Bot", "Telegram CTF+OSINT Bot")
                    : T(lang, "WhatsApp CTF+OSINT Bot", "WhatsApp CTF+OSINT Bot")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {T(lang,
                    "Plantilla con sistema de bibliotecas modular. Requiere lib_loader.py y bot_config.py",
                    "Template with modular library system. Requires lib_loader.py and bot_config.py"
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: T(lang, "Herramientas activas", "Active tools"), value: `${enabledCount}/${filteredTools.length}` },
                { label: T(lang, "Sistema de libs", "Library system"), value: T(lang, "Incluido", "Included") },
                { label: T(lang, "Menú dinámico", "Dynamic menu"), value: T(lang, "Sí", "Yes") },
                { label: T(lang, "Fallback a nube", "Cloud fallback"), value: T(lang, "Configurable", "Configurable") },
              ].map((stat, i) => (
                <div key={i} className="bg-background/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-semibold mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pasos de instalación */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="font-semibold text-sm mb-3">{T(lang, "Pasos para usar esta plantilla", "Steps to use this template")}</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                T(lang, "Descargá bot_config.py y lib_loader.py desde la sección Bibliotecas", "Download bot_config.py and lib_loader.py from the Libraries section"),
                T(lang, "Creá la carpeta libs/ y copiá los archivos de bibliotecas que necesites", "Create the libs/ folder and copy the library files you need"),
                T(lang, "Instalá las dependencias: pip install -r requirements_extended.txt", "Install dependencies: pip install -r requirements_extended.txt"),
                T(lang, "Configurá tu .env con los tokens de Telegram o Twilio", "Configure your .env with Telegram or Twilio tokens"),
                T(lang, "Editá bot_config.py para activar/desactivar los módulos que querés", "Edit bot_config.py to enable/disable the modules you want"),
                T(lang, "Ejecutá el bot: python mi_bot_ctf_osint.py", "Run the bot: python mi_bot_ctf_osint.py"),
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Código del bot */}
          <Section
            title={platform === "telegram"
              ? T(lang, "Código: Telegram CTF+OSINT Bot", "Code: Telegram CTF+OSINT Bot")
              : T(lang, "Código: WhatsApp CTF+OSINT Bot", "Code: WhatsApp CTF+OSINT Bot")}
            icon={<Code2 className="h-4 w-4 text-primary" />}
            badge={T(lang, "Con sistema de libs", "With lib system")}
            defaultOpen={true}
          >
            <p className="text-sm text-muted-foreground mb-3">
              {T(lang,
                "El menú del bot se genera dinámicamente según los módulos que tengas activos en bot_config.py.",
                "The bot menu is generated dynamically based on the modules you have active in bot_config.py."
              )}
            </p>
            <CodeBlock
              code={platform === "telegram" ? TELEGRAM_CTF_OSINT_PY : WHATSAPP_CTF_OSINT_PY}
              language="python"
              filename={platform === "telegram" ? "telegram_ctf_osint_libs.py" : "whatsapp_ctf_osint_libs.py"}
            />
          </Section>
        </div>
      </div>
    </Layout>
  );
}
