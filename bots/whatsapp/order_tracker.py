"""
Rastreador de pedidos para WhatsApp (Twilio + Flask + SQLite).

Sistema de seguimiento de pedidos: los usuarios consultan el estado de
su pedido enviando el numero (ej: ORD-001) o piden la lista escribiendo
'mis pedidos'.

Uso:
    python bots/whatsapp/order_tracker.py
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
DB_PATH = "orders.db"


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # MODIFICAR: ajusta la estructura de la tabla segun tu sistema de pedidos.
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            customer_phone TEXT,
            status TEXT,
            description TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    # MODIFICAR: reemplaza estos datos de muestra con los reales de tu sistema
    # (o cargalos desde una API externa al iniciar).
    sample_orders = [
        ("ORD-001", "whatsapp:+1234567890", "En camino", "Zapatos deportivos"),
        ("ORD-002", "whatsapp:+0987654321", "Entregado", "Libro de Python"),
        ("ORD-003", "whatsapp:+1111111111", "Procesando", "Teclado mecanico"),
    ]
    c.executemany(
        "INSERT OR IGNORE INTO orders (order_id, customer_phone, status, description) "
        "VALUES (?, ?, ?, ?)",
        sample_orders,
    )
    conn.commit()
    conn.close()


def get_order(order_id: str) -> tuple | None:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # MODIFICAR: agrega mas campos a la consulta si necesitas mas datos del pedido.
    c.execute(
        "SELECT order_id, status, description, updated_at FROM orders WHERE order_id = ?",
        (order_id.upper(),),
    )
    order = c.fetchone()
    conn.close()
    return order


def get_my_orders(phone: str) -> list[tuple]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # MODIFICAR: puedes filtrar por estado tambien.
    c.execute(
        "SELECT order_id, status, description FROM orders WHERE customer_phone = ?",
        (phone,),
    )
    orders = c.fetchall()
    conn.close()
    return orders


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    # MODIFICAR: ajusta los comandos segun el idioma de tus usuarios.
    if incoming_msg.lower() in ["mis pedidos", "my orders", "pedidos"]:
        orders = get_my_orders(sender)
        if orders:
            lines = [f"- {o[0]}: {o[1]} ({o[2]})" for o in orders]
            msg.body("Tus pedidos:\n" + "\n".join(lines))
        else:
            msg.body("No encontre pedidos asociados a tu numero.")

    elif incoming_msg.upper().startswith("ORD-") or incoming_msg.isdigit():
        # MODIFICAR: ajusta el formato del numero de pedido segun tu sistema.
        order = get_order(incoming_msg)
        if order:
            msg.body(
                f"Pedido {order[0]}\n"
                f"Estado: {order[1]}\n"
                f"Producto: {order[2]}\n"
                f"Actualizado: {order[3]}"
            )
        else:
            msg.body(f"No encontre el pedido {incoming_msg.upper()}")
    else:
        msg.body(
            "Envia tu numero de pedido (ej: ORD-001) o escribe 'mis pedidos' "
            "para ver todos."
        )

    return str(resp)


if __name__ == "__main__":
    init_db()
    logger.info("Base de pedidos inicializada en %s", DB_PATH)
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
