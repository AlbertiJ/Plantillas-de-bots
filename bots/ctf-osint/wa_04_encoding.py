# bots/ctf-osint/wa_04_encoding.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot WhatsApp — Encoding Toolkit (b64, hex, ROT13, URL)
# Ejecución: python bots/ctf-osint/wa_04_encoding.py
# IDEA FUTURA: agregar soporte para Atbash, Vigenere, Caesar con clave

import base64, codecs, urllib.parse
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)
MENU = "Encoding Toolkit\n\nb64enc/b64dec <texto>\nhex/unhex <texto>\nrot13 <texto>\nurl/unurl <texto>\n\n⚠️ Solo uso educativo."

def route_cmd(cmd: str, arg: str) -> str:
    try:
        if cmd == "b64enc": return f"Base64:\n{base64.b64encode(arg.encode()).decode()}"
        if cmd == "b64dec": return f"Decoded:\n{base64.b64decode(arg).decode('utf-8',errors='replace')}"
        if cmd == "hex": return f"HEX:\n{arg.encode().hex()}"
        if cmd == "unhex": return f"Texto:\n{bytes.fromhex(arg).decode('utf-8',errors='replace')}"
        if cmd == "rot13": return f"ROT13:\n{codecs.encode(arg,'rot_13')}"
        if cmd == "url": return f"URL encoded:\n{urllib.parse.quote(arg)}"
        if cmd == "unurl": return f"URL decoded:\n{urllib.parse.unquote(arg)}"
        return "Comando no reconocido. Enviá 'menu'."
    except Exception as e:
        return f"Error: {e}"

@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd, arg = parts[0].lower(), parts[1] if len(parts)>1 else ""
    if cmd in ("menu","inicio"): msg.body(MENU)
    elif arg: msg.body(route_cmd(cmd,arg)[:1600])
    else: msg.body("Enviá 'menu' para ver opciones.")
    return str(resp)

def main():
    logger.info(f"Bot Encoding WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)

if __name__ == "__main__":
    main()
