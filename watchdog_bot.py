#!/usr/bin/env python3
"""
watchdog_bot.py — Watchdog 24/7: reinicia automáticamente bots caídos
MODIFICAR: ajustar MAX_RESTARTS_PER_HOUR y RESTART_DELAY según la estabilidad del bot.
Variables de entorno:
  BOT_SCRIPT            — Ruta al script Python del bot a supervisar (requerida)
  RESTART_DELAY         — Segundos a esperar antes de reiniciar (default: 5)
  MAX_RESTARTS_PER_HOUR — Máximo de reinicios por hora (default: 10)
  TELEGRAM_BOT_TOKEN    — (Opcional) Token para notificaciones Telegram
  WATCHDOG_NOTIFY_CHAT  — (Opcional) Chat ID para notificaciones
"""
import os, sys, subprocess, time, datetime, logging

# MODIFICAR: configurar estas variables en .env
BOT_SCRIPT            = os.getenv("BOT_SCRIPT", "")
RESTART_DELAY         = int(os.getenv("RESTART_DELAY", "5"))
MAX_RESTARTS_PER_HOUR = int(os.getenv("MAX_RESTARTS_PER_HOUR", "10"))
TG_TOKEN              = os.getenv("TELEGRAM_BOT_TOKEN", "")
NOTIFY_CHAT           = os.getenv("WATCHDOG_NOTIFY_CHAT", "")

logging.basicConfig(format="%(asctime)s [WATCHDOG] %(levelname)s %(message)s",
    level=logging.INFO, handlers=[logging.StreamHandler(sys.stdout)])
logger = logging.getLogger("watchdog")

def notify_telegram(text: str) -> None:
    """Envía notificación Telegram si está configurado."""
    if not TG_TOKEN or not NOTIFY_CHAT:
        return
    try:
        import urllib.request, json
        url  = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
        data = json.dumps({"chat_id": NOTIFY_CHAT, "text": text}).encode()
        urllib.request.urlopen(urllib.request.Request(url, data=data,
            headers={"Content-Type": "application/json"}), timeout=5)
    except Exception as e:
        logger.warning("Notificación Telegram fallida: %s", e)

def run_watchdog() -> None:
    if not BOT_SCRIPT:
        logger.error("BOT_SCRIPT no configurado. Ejemplo: BOT_SCRIPT=bots/telegram/echo_bot.py")
        sys.exit(1)
    if not os.path.exists(BOT_SCRIPT):
        logger.error("El archivo %s no existe.", BOT_SCRIPT)
        sys.exit(1)

    restart_times: list[float] = []
    total_restarts = 0
    logger.info("Watchdog iniciado para: %s", BOT_SCRIPT)
    notify_telegram(f"Watchdog iniciado\nBot: {BOT_SCRIPT}")

    while True:
        logger.info("Iniciando: python3 %s", BOT_SCRIPT)
        start_time = time.time()
        try:
            proc = subprocess.Popen([sys.executable, BOT_SCRIPT], stdout=sys.stdout, stderr=sys.stderr)
            proc.wait()
            exit_code   = proc.returncode
            uptime_secs = int(time.time() - start_time)
        except Exception as e:
            logger.error("Error al lanzar proceso: %s", e)
            exit_code, uptime_secs = -1, 0

        total_restarts += 1
        now = time.time()
        restart_times = [t for t in restart_times if now - t < 3600]
        restart_times.append(now)

        logger.warning("Proceso terminó (código %d, uptime %ds). Reinicios última hora: %d/%d",
            exit_code, uptime_secs, len(restart_times), MAX_RESTARTS_PER_HOUR)

        # MODIFICAR: agregar lógica según el código de salida
        if exit_code == 0:
            logger.info("Proceso terminó normalmente. Watchdog detenido.")
            notify_telegram("Bot terminó normalmente. Watchdog detenido.")
            break

        if len(restart_times) >= MAX_RESTARTS_PER_HOUR:
            msg = f"WATCHDOG: Límite {MAX_RESTARTS_PER_HOUR} reinicios/hora.\nBot: {BOT_SCRIPT}\nDeteniendo."
            logger.error(msg)
            notify_telegram(msg)
            sys.exit(1)

        notify_telegram(f"Bot reiniciado (#{total_restarts})\nUptime anterior: {uptime_secs}s")
        logger.info("Esperando %ds antes de reiniciar...", RESTART_DELAY)
        time.sleep(RESTART_DELAY)

if __name__ == "__main__":
    run_watchdog()
