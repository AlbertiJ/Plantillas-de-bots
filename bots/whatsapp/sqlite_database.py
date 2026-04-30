#!/usr/bin/env python3
"""
sqlite_database.py — Bot WhatsApp con persistencia SQLite
MODIFICAR: agregar más tablas en init_db() según tus necesidades.
Requiere: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN
pip install flask requests
"""
import logging, os, requests
from flask import Flask, request, jsonify

PHONE_ID     = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "mi_token_secreto")
ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
PORT         = int(os.getenv("PORT", "5000"))
WA_API_URL   = f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages"
app = Flask(__name__)
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

def send_message(to: str, text: str) -> dict:
    """MODIFICAR: agregar más tipos de mensajes (imagen, template, etc.)"""
    if not ACCESS_TOKEN or not PHONE_ID:
        logger.error("ACCESS_TOKEN o PHONE_ID no configurados")
        return {}
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text[:4000]}}
    r = requests.post(WA_API_URL, headers=headers, json=payload, timeout=10)
    return r.json()

@app.route("/webhook", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge", ""), 200
    return "Token inválido", 403

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "wa_user_data.db"

def init_db():
    # MODIFICAR: agregar más tablas
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS user_data (
            phone TEXT, key TEXT, value TEXT, PRIMARY KEY (phone, key))""")
        con.commit()

def db_save(phone, key, val):
    with sqlite3.connect(DB_PATH) as con:
        con.execute("INSERT OR REPLACE INTO user_data VALUES (?,?,?)", (phone, key, val))
        con.commit()

def db_get(phone, key):
    with sqlite3.connect(DB_PATH) as con:
        row = con.execute("SELECT value FROM user_data WHERE phone=? AND key=?", (phone, key)).fetchone()
    return row[0] if row else None

def db_list(phone):
    with sqlite3.connect(DB_PATH) as con:
        return con.execute("SELECT key, value FROM user_data WHERE phone=?", (phone,)).fetchall()

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender = msg["from"]
                    parts  = msg["text"]["body"].strip().split(None, 2)
                    cmd    = parts[0].lower() if parts else ""
                    if cmd == "!guardar" and len(parts) >= 3:
                        db_save(sender, parts[1], parts[2])
                        send_message(sender, f"Guardado: {parts[1]} = {parts[2]}")
                    elif cmd == "!obtener" and len(parts) >= 2:
                        val = db_get(sender, parts[1])
                        send_message(sender, f"{parts[1]} = {val}" if val else f"'{parts[1]}' no encontrado")
                    elif cmd == "!mis-datos":
                        rows = db_list(sender)
                        send_message(sender, ("\n".join(f"- {k}: {v}" for k,v in rows)) if rows else "Sin datos.")
                    else:
                        send_message(sender, "Comandos:\n!guardar clave valor\n!obtener clave\n!mis-datos")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=PORT, debug=False)
