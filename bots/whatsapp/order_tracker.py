#!/usr/bin/env python3
"""
order_tracker.py — Rastreador de pedidos WhatsApp
MODIFICAR: personalizar ORDER_STATES y agregar notificaciones de cambio de estado.
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

import sqlite3, uuid
from pathlib import Path

DB_PATH = Path(__file__).parent / "orders.db"
# MODIFICAR: personalizar los estados según tu flujo de negocio
ORDER_STATES = ["pendiente", "confirmado", "preparando", "enviado", "entregado", "cancelado"]

def init_db():
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY, phone TEXT, description TEXT,
            status TEXT DEFAULT 'pendiente', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)""")

def create_order(phone, desc):
    oid = str(uuid.uuid4())[:8].upper()
    with sqlite3.connect(DB_PATH) as con:
        con.execute("INSERT INTO orders (id, phone, description) VALUES (?,?,?)", (oid, phone, desc))
    return oid

def get_order(oid):
    with sqlite3.connect(DB_PATH) as con:
        row = con.execute("SELECT id, phone, description, status, created_at FROM orders WHERE id=?", (oid,)).fetchone()
    return {"id": row[0], "phone": row[1], "desc": row[2], "status": row[3], "created_at": row[4]} if row else None

def get_user_orders(phone):
    with sqlite3.connect(DB_PATH) as con:
        return con.execute("SELECT id, description, status FROM orders WHERE phone=? ORDER BY created_at DESC LIMIT 5", (phone,)).fetchall()

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    if msg.get("type") != "text": continue
                    sender = msg["from"]
                    parts  = msg["text"]["body"].strip().split(None, 1)
                    cmd    = parts[0].lower()
                    args   = parts[1] if len(parts) > 1 else ""
                    if cmd == "!nuevo-pedido":
                        oid = create_order(sender, args or "Sin descripción")
                        send_message(sender, f"Pedido creado!\nID: #{oid}\nEstado: pendiente")
                    elif cmd == "!pedido":
                        order = get_order(args.strip().lstrip("#").upper()) if args else None
                        if order:
                            send_message(sender, f"Pedido #{order['id']}\nDescripción: {order['desc']}\nEstado: {order['status']}")
                        else:
                            send_message(sender, "Pedido no encontrado.")
                    elif cmd == "!mis-pedidos":
                        orders = get_user_orders(sender)
                        send_message(sender, ("\n".join(f"#{o[0]}: {o[1][:30]} - {o[2]}" for o in orders)) if orders else "Sin pedidos.")
                    else:
                        send_message(sender, "Comandos:\n!nuevo-pedido <desc>\n!pedido <ID>\n!mis-pedidos")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=PORT, debug=False)
