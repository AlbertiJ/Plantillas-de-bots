# watchdog_bot.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Watchdog — Modo 24/7 local con reinicio automático
# Ejecución: python watchdog_bot.py
# IDEA FUTURA: dashboard web simple para ver estado y logs en vivo

import os, sys, time, subprocess, signal
from datetime import datetime
from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger("watchdog")

BOT_SCRIPT = get_env("BOT_SCRIPT", "main.py")              # MODIFICAR: script principal
RESTART_DELAY = int(get_env("RESTART_DELAY", "5"))         # MODIFICAR: segundos entre reinicios
MAX_RESTARTS_PER_HOUR = int(get_env("MAX_RESTARTS_PER_HOUR", "10"))
NOTIFY_TOKEN = get_env("WATCHDOG_NOTIFY_TOKEN", "")        # MODIFICAR: token Telegram (opcional)
NOTIFY_CHAT  = get_env("WATCHDOG_NOTIFY_CHAT", "")

restarts_this_hour: list[float] = []
current_process: subprocess.Popen | None = None


def notify_telegram(message: str) -> None:
    """Notifica por Telegram. MODIFICAR: no obligatorio, dejá vacío para deshabilitar."""
    if not NOTIFY_TOKEN or not NOTIFY_CHAT:
        return
    try:
        import requests
        requests.post(
            f"https://api.telegram.org/bot{NOTIFY_TOKEN}/sendMessage",
            json={"chat_id": NOTIFY_CHAT, "text": message, "parse_mode": "HTML"},
            timeout=5
        )
    except Exception as e:
        logger.warning(f"No se pudo notificar: {e}")


def count_recent_restarts() -> int:
    now = time.time()
    global restarts_this_hour
    restarts_this_hour = [t for t in restarts_this_hour if t > now - 3600]
    return len(restarts_this_hour)


def handle_signal(signum, frame):
    logger.info("Señal de cierre recibida. Apagando watchdog...")
    global current_process
    if current_process and current_process.poll() is None:
        current_process.terminate()
        try: current_process.wait(timeout=10)
        except subprocess.TimeoutExpired: current_process.kill()
    sys.exit(0)


def run():
    global current_process
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    logger.info(f"Watchdog iniciado para: {BOT_SCRIPT}")
    notify_telegram(f"✅ Watchdog iniciado\nBot: <code>{BOT_SCRIPT}</code>\n{datetime.now().strftime('%H:%M:%S')}")

    restart_count = 0

    while True:
        current_process = subprocess.Popen([sys.executable, BOT_SCRIPT], env={**os.environ})
        start_time = time.time()
        exit_code = current_process.wait()
        uptime = int(time.time() - start_time)

        if uptime > 1800:  # MODIFICAR: umbral para resetear contador de reinicios
            restart_count = 0
            restarts_this_hour.clear()

        restart_count += 1
        restarts_this_hour.append(time.time())
        recent = count_recent_restarts()

        logger.warning(f"Bot terminó (código {exit_code}) — uptime {uptime}s — reinicio #{restart_count}")

        if MAX_RESTARTS_PER_HOUR > 0 and recent >= MAX_RESTARTS_PER_HOUR:
            msg = f"🚨 Watchdog ABORTANDO — límite de {MAX_RESTARTS_PER_HOUR} reinicios/hora alcanzado."
            logger.error(msg)
            notify_telegram(msg)
            sys.exit(1)

        notify_telegram(f"⚠️ Bot reiniciado (#{restart_count})\nCódigo: <code>{exit_code}</code>\nUptime: {uptime}s")
        logger.info(f"Esperando {RESTART_DELAY}s antes de reiniciar...")
        time.sleep(RESTART_DELAY)


if __name__ == "__main__":
    run()
