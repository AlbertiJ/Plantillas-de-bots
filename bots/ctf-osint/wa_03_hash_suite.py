# bots/ctf-osint/wa_03_hash_suite.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot WhatsApp — Hash Suite (generar + identificar)
# Ejecución: python bots/ctf-osint/wa_03_hash_suite.py

import hashlib, re
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)

def all_hashes(text: str) -> str:
    enc = text.encode("utf-8")
    return (f"MD5:    {hashlib.md5(enc).hexdigest()}\n"
            f"SHA1:   {hashlib.sha1(enc).hexdigest()}\n"
            f"SHA256: {hashlib.sha256(enc).hexdigest()}")

def identify_hash(h: str) -> str:
    h = h.strip()
    if not re.match(r'^[a-fA-F0-9]+$', h): return "No parece un hash hexadecimal"
    return {32:"MD5",40:"SHA-1",64:"SHA-256",128:"SHA-512"}.get(len(h), f"Desconocido ({len(h)} chars)")

@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.lower().split(" ", 1)
    cmd, arg = parts[0], (body.split(" ",1)[1] if len(parts)>1 else "")
    if cmd in ("menu","inicio"):
        msg.body("Hash Suite — WhatsApp\n\nhash <texto>     — Todos los hashes\nidentify <hash>  — Identificar tipo\n\n⚠️ Solo uso educativo.")
    elif cmd == "hash" and arg:
        msg.body(f"Hashes de: {arg[:30]}\n\n{all_hashes(arg)}")
    elif cmd == "identify" and arg:
        msg.body(f"Tipo: {identify_hash(arg)}")
    else:
        msg.body("Enviá 'menu' para ver comandos.")
    return str(resp)

def main():
    logger.info(f"Bot Hash Suite WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)

if __name__ == "__main__":
    main()
