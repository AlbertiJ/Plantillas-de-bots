# bots/ctf-osint/wa_01_ip_geo.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot WhatsApp — IP Lookup + GeoIP (Flask + Twilio)
# Ejecución: python bots/ctf-osint/wa_01_ip_geo.py
# IDEA FUTURA: agregar lookup de ASN y detección de VPN/proxy/Tor

import requests
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))  # MODIFICAR: puerto del servidor Flask
app = Flask(__name__)


def lookup_ip(target: str) -> str:
    try:
        r = requests.get(
            f"http://ip-api.com/json/{target}?fields=status,message,country,regionName,city,isp,query",
            timeout=10
        )
        data = r.json()
        if data.get("status") != "success":
            return f"Error: {data.get('message', 'sin respuesta')}"
        return (
            f"IP: {data['query']}\n"
            f"País: {data['country']}\n"
            f"Región: {data['regionName']}\n"
            f"Ciudad: {data['city']}\n"
            f"ISP: {data['isp']}"
        )
    except Exception as e:
        logger.error(f"lookup_ip error: {e}")
        return f"Error: {e}"


@app.route("/whatsapp", methods=["POST"])
def webhook():
    # MODIFICAR: la URL debe coincidir con la configurada en Twilio Sandbox
    body = request.values.get("Body", "").strip().lower()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd, arg = parts[0], parts[1] if len(parts) > 1 else ""

    if cmd in ("menu", "inicio", "start"):
        msg.body("Bot IP/GeoIP — WhatsApp\n\nip <target>  — IP Lookup\n\n⚠️ Solo uso educativo.")
    elif cmd == "ip" and arg:
        logger.info(f"IP lookup: {arg}")
        msg.body(lookup_ip(arg))
    else:
        msg.body("Enviá 'menu' para ver los comandos.")
    return str(resp)


def main():
    logger.info(f"Bot IP/GeoIP WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)  # MODIFICAR: debug=False en producción


if __name__ == "__main__":
    main()
