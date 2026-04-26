"""
Programador de mensajes para WhatsApp (APScheduler + Twilio).

Envia mensajes proactivos en horarios definidos (ej: recordatorio diario).
No es un webhook, es un proceso aparte que corre en segundo plano.

Uso:
    python bots/whatsapp/scheduler_apscheduler.py
    # Mantener corriendo (Ctrl+C para salir).

Requisitos en .env:
    TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN
    TWILIO_WHATSAPP_NUMBER (ej: whatsapp:+14155238886)
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from apscheduler.schedulers.background import BackgroundScheduler
from twilio.rest import Client

from bots.shared.env import get_env, require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

# MODIFICAR: estas variables vienen de tu archivo .env.
account_sid = require_env("TWILIO_ACCOUNT_SID")
auth_token = require_env("TWILIO_AUTH_TOKEN")
# MODIFICAR: en produccion cambia por tu numero WhatsApp Business verificado.
twilio_number = get_env("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
client = Client(account_sid, auth_token)


def send_daily_reminder() -> None:
    # MODIFICAR: en produccion obten esta lista desde tu base de datos.
    users = ["whatsapp:+1234567890"]

    for user_number in users:
        try:
            # MODIFICAR: personaliza el mensaje del recordatorio.
            message = client.messages.create(
                body="Recordatorio diario: no olvides registrar tus horas hoy!",
                from_=twilio_number,
                to=user_number,
            )
            logger.info("Enviado a %s. SID: %s", user_number, message.sid)
        except Exception as e:
            logger.error("Error al enviar a %s: %s", user_number, e)


if __name__ == "__main__":
    scheduler = BackgroundScheduler()

    # MODIFICAR: cambia la hora a la que quieres enviar el mensaje diario.
    scheduler.add_job(send_daily_reminder, "cron", hour=9, minute=0)

    # MODIFICAR: elimina esta linea en produccion. Solo sirve para probar
    # que el envio funciona 10 segundos despues de iniciar el script.
    run_date = datetime.now() + timedelta(seconds=10)
    scheduler.add_job(send_daily_reminder, "date", run_date=run_date)

    scheduler.start()
    logger.info("Programador iniciado. Ctrl+C para salir.")

    try:
        while True:
            pass
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Programador detenido.")
