# bots/ctf-osint/wa_02_headers_tech.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot WhatsApp — HTTP Headers Inspector + Tech Fingerprinting
# Ejecución: python bots/ctf-osint/wa_02_headers_tech.py
# IDEA FUTURA: puntuar seguridad de las cabeceras (A-F score)

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
    "server": {"apache":"Apache","nginx":"Nginx","iis":"IIS","cloudflare":"Cloudflare"},
    "x-powered-by": {"php":"PHP","asp.net":"ASP.NET","express":"Express.js","next.js":"Next.js"},
}
SECURITY_HEADERS = ["Strict-Transport-Security","X-Content-Type-Options","X-Frame-Options","Content-Security-Policy"]


def analyze_headers(url: str) -> str:
    if not url.startswith(("http://","https://")):
        url = "https://" + url
    try:
        r = requests.get(url, timeout=10, allow_redirects=True, headers={"User-Agent":"CTF-Bot/1.0"})
        lines = [f"Headers de {url} [HTTP {r.status_code}]\n"]
        tech_found = []
        for header, sigs in TECH_SIGNATURES.items():
            val = r.headers.get(header, "").lower()
            for sig, name in sigs.items():
                if sig in val: tech_found.append(name)
        if tech_found: lines.append(f"Tecnología: {', '.join(tech_found)}")
        lines.append("\nSeguridad:")
        for h in SECURITY_HEADERS:
            lines.append(f"  {'OK' if h in r.headers else 'NO'}  {h}")
        for h in ["Server","X-Powered-By","X-Generator"]:
            if h in r.headers: lines.append(f"{h}: {r.headers[h][:60]}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error: {e}"


@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip().lower()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd, arg = parts[0], parts[1] if len(parts) > 1 else ""
    if cmd in ("menu","inicio"):
        msg.body("headers <url>  — Analizar cabeceras HTTP\n⚠️ Solo uso autorizado.")
    elif cmd == "headers" and arg:
        msg.body(analyze_headers(arg)[:1600])
    else:
        msg.body("Enviá 'menu' para ver comandos.")
    return str(resp)


def main():
    logger.info(f"Bot Headers/Tech iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
