# bots/ctf-osint/wa_05_ctf_toolkit.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot WhatsApp — CTF Toolkit all-in-one (IP, Hash, Encoding, SQLi)
# Ejecución: python bots/ctf-osint/wa_05_ctf_toolkit.py
# IDEA FUTURA: sistema de "sessions" para recordar contexto por usuario

import base64, hashlib, codecs, urllib.parse, requests
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
PORT = int(get_env("PORT", "5000"))
app = Flask(__name__)
DISCLAIMER = "⚠️ Solo CTF y entornos con permiso explícito del propietario."
SQLI_QUICK = ["' OR 1=1--","' OR '1'='1","admin'--","' UNION SELECT NULL,NULL--","' AND SLEEP(5)--"]

MENU = f"""CTF Toolkit All-in-One — WhatsApp

OSINT:  ip <target>
HASH:   hash <texto> | identify <hash>
ENCODE: b64enc/b64dec/hex/unhex/rot13 <texto>
CTF:    sqli

{DISCLAIMER}"""

# MODIFICAR: activá o desactivá módulos según lo que necesite tu CTF
ENABLED = {"ip": True, "hash": True, "encode": True, "sqli": True}

def process(cmd: str, arg: str) -> str:
    if cmd == "ip" and arg and ENABLED["ip"]:
        try:
            r = requests.get(f"http://ip-api.com/json/{arg}?fields=status,country,city,isp,query", timeout=8).json()
            if r.get("status") == "success":
                return f"IP: {r['query']}\nPaís: {r['country']}\nCiudad: {r['city']}\nISP: {r['isp']}"
            return f"Error: {r.get('message','sin respuesta')}"
        except Exception as e: return f"Error: {e}"
    if cmd == "hash" and arg and ENABLED["hash"]:
        enc = arg.encode()
        return f"MD5:    {hashlib.md5(enc).hexdigest()}\nSHA1:   {hashlib.sha1(enc).hexdigest()}\nSHA256: {hashlib.sha256(enc).hexdigest()}"
    if cmd == "identify" and arg and ENABLED["hash"]:
        clean = arg.strip()
        if not all(c in "0123456789abcdefABCDEF" for c in clean): return "No parece un hash hexadecimal"
        return {32:"MD5",40:"SHA-1",64:"SHA-256",128:"SHA-512"}.get(len(clean),f"Desconocido ({len(clean)} chars)")
    if ENABLED["encode"]:
        try:
            if cmd == "b64enc" and arg: return f"Base64: {base64.b64encode(arg.encode()).decode()}"
            if cmd == "b64dec" and arg: return f"Decoded: {base64.b64decode(arg).decode('utf-8',errors='replace')}"
            if cmd == "hex" and arg: return f"HEX: {arg.encode().hex()}"
            if cmd == "unhex" and arg: return f"Texto: {bytes.fromhex(arg).decode('utf-8',errors='replace')}"
            if cmd == "rot13" and arg: return f"ROT13: {codecs.encode(arg,'rot_13')}"
        except Exception as e: return f"Error: {e}"
    if cmd == "sqli" and ENABLED["sqli"]:
        return "SQLi Payloads:\n" + "\n".join(f"{i+1}. {p}" for i,p in enumerate(SQLI_QUICK)) + f"\n\n{DISCLAIMER}"
    return "Comando no reconocido. Enviá 'menu'."

@app.route("/whatsapp", methods=["POST"])
def webhook():
    body = request.values.get("Body", "").strip()
    resp = MessagingResponse()
    msg = resp.message()
    parts = body.split(" ", 1)
    cmd, arg = parts[0].lower(), parts[1] if len(parts)>1 else ""
    if cmd in ("menu","inicio","start","hola"): msg.body(MENU)
    else: msg.body(process(cmd,arg)[:1600])
    return str(resp)

def main():
    logger.info(f"CTF Toolkit All-in-One WhatsApp iniciado en puerto {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)

if __name__ == "__main__":
    main()
