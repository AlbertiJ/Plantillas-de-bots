"""
Bot WhatsApp con base de datos SQLite (Twilio + Flask + sqlite3).

Guarda informacion de los usuarios (nombre, contador de mensajes, ultima
visita) en una base de datos SQLite local. Util como base para bots que
necesitan persistir estado entre conversaciones.

Uso:
    python bots/whatsapp/sqlite_database.py
"""

import sqlite3
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
# MODIFICAR: cambia 'bot.db' por el nombre que quieras para tu base de datos.
DB_PATH = "bot.db"


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # MODIFICAR: ajusta las columnas de la tabla segun los datos que necesitas guardar.
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            phone TEXT PRIMARY KEY,
            name TEXT,
            message_count INTEGER DEFAULT 0,
            last_seen TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def get_or_create_user(phone: str) -> tuple:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # MODIFICAR: agrega mas campos si necesitas guardar mas informacion del usuario.
    c.execute(
        "INSERT OR IGNORE INTO users (phone, message_count) VALUES (?, 0)", (phone,)
    )
    c.execute(
        "UPDATE users SET message_count = message_count + 1, "
        "last_seen = datetime('now') WHERE phone = ?",
        (phone,),
    )
    conn.commit()
    c.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    user = c.fetchone()
    conn.close()
    return user


def set_user_name(phone: str, name: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # MODIFICAR: extiende esto para actualizar cualquier otro campo del usuario.
    c.execute("UPDATE users SET name = ? WHERE phone = ?", (name, phone))
    conn.commit()
    conn.close()


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    user = get_or_create_user(sender)
    # user[0]=phone, user[1]=name, user[2]=message_count, user[3]=last_seen
    name = user[1] or "amigo/a"
    count = user[2]

    resp = MessagingResponse()
    msg = resp.message()

    if incoming_msg.lower().startswith("mi nombre es ") or incoming_msg.lower().startswith("my name is "):
        # MODIFICAR: ajusta el prefijo de comando segun el idioma de tu bot.
        new_name = incoming_msg.split(" ", 3)[-1]
        set_user_name(sender, new_name)
        msg.body(f"Genial, te recordare como {new_name}!")
    elif incoming_msg.lower() in ["stats", "estadisticas", "estadísticas"]:
        msg.body(f"Hola {name}! Llevas {count} mensajes en total.")
    else:
        msg.body(f"Hola {name}! Mensaje #{count}.")

    return str(resp)


if __name__ == "__main__":
    init_db()
    logger.info("Base de datos inicializada en %s", DB_PATH)
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
