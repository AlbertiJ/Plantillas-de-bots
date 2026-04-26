"""
Bot multiusuario / de grupo para WhatsApp (Twilio + Flask).

Identifica a los participantes y permite que ciertos numeros (admins)
ejecuten comandos especiales como /broadcast o /stats.

Uso:
    python bots/whatsapp/group_multiuser.py
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

app = Flask(__name__)

# MODIFICAR: agrega aqui los numeros de los administradores del bot.
ADMIN_NUMBERS = ["whatsapp:+1234567890"]

# MODIFICAR: adapta los comandos de administrador segun tus necesidades.
ADMIN_COMMANDS = {
    "/broadcast": "Enviar mensaje a todos",
    "/stats": "Ver estadisticas del grupo",
}

# MODIFICAR: mantén un registro de todos los usuarios que han interactuado.
# En produccion usa una DB.
known_users: set[str] = set()


def is_admin(sender: str) -> bool:
    # MODIFICAR: puedes almacenar los admins en una DB en lugar de hardcodearlos.
    return sender in ADMIN_NUMBERS


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")
    # MODIFICAR: 'ProfileName' tiene el nombre del contacto en WhatsApp.
    profile_name = request.values.get("ProfileName", "Usuario")

    known_users.add(sender)

    resp = MessagingResponse()
    msg = resp.message()

    if is_admin(sender) and incoming_msg.startswith("/"):
        # MODIFICAR: agrega la logica real de administracion aqui.
        if incoming_msg == "/stats":
            msg.body(f"Usuarios conocidos: {len(known_users)}")
        elif incoming_msg.startswith("/broadcast "):
            broadcast_msg = incoming_msg[len("/broadcast "):]
            # MODIFICAR: itera sobre tu DB de usuarios para enviar a todos.
            logger.info("Broadcast de admin %s: %s", sender, broadcast_msg)
            msg.body(f"Broadcast enviado: {broadcast_msg}")
        else:
            msg.body(f"Comandos de admin: {', '.join(ADMIN_COMMANDS.keys())}")
    else:
        # MODIFICAR: aqui va la logica normal para usuarios regulares.
        msg.body(f"Hola {profile_name}! Somos {len(known_users)} usuarios.")

    return str(resp)


if __name__ == "__main__":
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
