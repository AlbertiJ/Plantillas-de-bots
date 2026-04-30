#!/usr/bin/env python3
"""
scheduler_apscheduler.py — Bot con recordatorios automáticos WhatsApp
MODIFICAR: usar una DB para persistencia entre reinicios si es necesario.
Requiere: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN
pip install flask requests apscheduler
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

from apscheduler.schedulers.background import BackgroundScheduler
import datetime

scheduler = BackgroundScheduler()
scheduler.start()
reminders: dict[str, list] = {}
rid_counter = {"n": 0}

def send_reminder(phone: str, text: str, rid: int):
    send_message(phone, f"Recordatorio #{rid}: {text}")

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
                    if cmd == "!recordar" and len(parts) >= 3:
                        try:
                            mins    = int(parts[1])
                            text    = parts[2]
                            rid_counter["n"] += 1
                            rid     = rid_counter["n"]
                            run_at  = datetime.datetime.now() + datetime.timedelta(minutes=mins)
                            scheduler.add_job(send_reminder, "date", run_date=run_at,
                                args=[sender, text, rid], id=f"rem_{sender}_{rid}")
                            reminders.setdefault(sender, []).append({"id": rid, "text": text, "at": run_at.strftime("%H:%M")})
                            send_message(sender, f"Recordatorio #{rid} en {mins} min ({run_at.strftime('%H:%M')})")
                        except ValueError:
                            send_message(sender, "Uso: !recordar <minutos> <mensaje>")
                    elif cmd == "!mis-recordatorios":
                        rems = reminders.get(sender, [])
                        send_message(sender, ("\n".join(f"#{r['id']} a {r['at']}: {r['text']}" for r in rems)) if rems else "Sin recordatorios.")
                    elif cmd == "!cancelar" and len(parts) >= 2:
                        try:
                            scheduler.remove_job(f"rem_{sender}_{parts[1]}")
                            send_message(sender, f"Recordatorio #{parts[1]} cancelado.")
                        except Exception:
                            send_message(sender, f"No encontré ese recordatorio.")
                    else:
                        send_message(sender, "Comandos:\n!recordar <min> <msg>\n!mis-recordatorios\n!cancelar <id>")
    except Exception as e:
        logger.error("Error: %s", e)
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
