import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import { RefreshCw, Terminal, Zap, Clock, ShieldCheck } from "lucide-react";

const M = (lang: string, es: string, en: string) => lang === "es" ? es : en;

const WATCHDOG_PY = `# watchdog_bot.py
# ╔══════════════════════════════════════════════════════════════╗
# ║           IMPLEMENTACIÓN DEL CÓDIGO                          ║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Replit-bot         ║
# ╠══════════════════════════════════════════════════════════════╣
# ║  DISCLAIMER — Código Abierto. Uso bajo tu responsabilidad.   ║
# ╚══════════════════════════════════════════════════════════════╝
# ─────────────────────────────────────────────────────────────
# PROPÓSITO: Watchdog — Modo 24/7 local con reinicio automático
#   Monitorea el proceso del bot y lo reinicia si falla.
#   Opcionalmente notifica por Telegram cuando hay un reinicio.
# Ejecución: python watchdog_bot.py
# IDEA FUTURA: dashboard web simple para ver estado y logs en vivo
# IDEA FUTURA: alertas por email + Telegram con stack trace del error
# ─────────────────────────────────────────────────────────────

import os
import sys
import time
import subprocess
import signal
import logging
from datetime import datetime
from bots.shared.env import require_env, get_env
from bots.shared.logger import get_logger

logger = get_logger("watchdog")

# ─── Configuración ────────────────────────────────────────────
# MODIFICAR: ruta al script principal de tu bot
BOT_SCRIPT = get_env("BOT_SCRIPT", "main.py")

# MODIFICAR: segundos antes de reiniciar tras un fallo
RESTART_DELAY = int(get_env("RESTART_DELAY", "5"))

# MODIFICAR: máximo de reinicios por hora antes de abortar (0 = sin límite)
MAX_RESTARTS_PER_HOUR = int(get_env("MAX_RESTARTS_PER_HOUR", "10"))

# MODIFICAR: token de Telegram para notificaciones del watchdog (opcional)
NOTIFY_TOKEN = get_env("WATCHDOG_NOTIFY_TOKEN", "")
NOTIFY_CHAT  = get_env("WATCHDOG_NOTIFY_CHAT", "")

# ─── Estado interno ───────────────────────────────────────────
restarts_this_hour: list[float] = []
current_process: subprocess.Popen | None = None


def notify_telegram(message: str) -> None:
    """
    Envía una notificación a Telegram cuando el bot se reinicia.
    MODIFICAR: no es obligatorio — si no configurás las vars, no notifica.
    """
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
        logger.warning(f"No se pudo notificar por Telegram: {e}")


def count_recent_restarts() -> int:
    """Cuenta los reinicios de la última hora."""
    now = time.time()
    # MODIFICAR: cambiá 3600 si querés una ventana de tiempo diferente
    cutoff = now - 3600
    global restarts_this_hour
    restarts_this_hour = [t for t in restarts_this_hour if t > cutoff]
    return len(restarts_this_hour)


def launch_bot() -> subprocess.Popen:
    """Lanza el bot en un subproceso."""
    logger.info(f"Lanzando: {sys.executable} {BOT_SCRIPT}")
    return subprocess.Popen(
        [sys.executable, BOT_SCRIPT],
        # MODIFICAR: si tu bot necesita variables de entorno extras, agregalas aquí
        env={**os.environ},
        stdout=sys.stdout,
        stderr=sys.stderr,
    )


def handle_signal(signum, frame):
    """Maneja CTRL+C / SIGTERM: apaga el bot limpiamente."""
    logger.info("Señal de cierre recibida. Apagando watchdog y bot...")
    global current_process
    if current_process and current_process.poll() is None:
        current_process.terminate()
        try:
            current_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            current_process.kill()
    logger.info("Watchdog detenido correctamente.")
    sys.exit(0)


def run():
    """
    Loop principal del watchdog.
    IDEA FUTURA: guardar logs de cada reinicio en un archivo watchdog.log
    """
    global current_process

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    logger.info(f"Watchdog iniciado para: {BOT_SCRIPT}")
    logger.info(f"Delay entre reinicios: {RESTART_DELAY}s — Max reinicios/hora: {MAX_RESTARTS_PER_HOUR or 'sin limite'}")
    notify_telegram(f"✅ Watchdog iniciado\\nBot: <code>{BOT_SCRIPT}</code>\\n{datetime.now().strftime('%H:%M:%S')}")

    restart_count = 0

    while True:
        current_process = launch_bot()
        start_time = time.time()

        # Esperar a que el proceso termine
        exit_code = current_process.wait()
        uptime = int(time.time() - start_time)

        # Si corrió más de 30 minutos, resetear contador de reinicios
        # MODIFICAR: ajustá este umbral según el comportamiento de tu bot
        if uptime > 1800:
            restart_count = 0
            restarts_this_hour.clear()
            logger.info(f"Uptime largo ({uptime}s) — contador de reinicios reseteado")

        restart_count += 1
        restarts_this_hour.append(time.time())
        recent = count_recent_restarts()

        logger.warning(
            f"Bot terminó con código {exit_code} — uptime {uptime}s — "
            f"reinicio #{restart_count} — {recent} en la última hora"
        )

        # Verificar límite de reinicios
        if MAX_RESTARTS_PER_HOUR > 0 and recent >= MAX_RESTARTS_PER_HOUR:
            msg = (
                f"🚨 Watchdog ABORTANDO\\n"
                f"Se alcanzó el límite de {MAX_RESTARTS_PER_HOUR} reinicios/hora.\\n"
                f"Revisá los logs manualmente."
            )
            logger.error(msg.replace("\\n", " "))
            notify_telegram(msg)
            sys.exit(1)

        # Notificar reinicio
        notify_telegram(
            f"⚠️ Bot reiniciado (#{restart_count})\\n"
            f"Código de salida: <code>{exit_code}</code>\\n"
            f"Uptime previo: {uptime}s\\n"
            f"Esperando {RESTART_DELAY}s..."
        )

        logger.info(f"Esperando {RESTART_DELAY}s antes de reiniciar...")
        time.sleep(RESTART_DELAY)


if __name__ == "__main__":
    run()
`;

const SYSTEMD_SERVICE = `# /etc/systemd/system/bot-watchdog.service
# Servicio systemd para correr el watchdog 24/7 en Linux/VPS
# MODIFICAR: reemplazá los paths y el usuario por los de tu servidor

[Unit]
Description=Bot Watchdog — Reinicio automático del bot
After=network.target
Wants=network-online.target

[Service]
Type=simple
# MODIFICAR: usuario del sistema con el que corre el bot
User=tu_usuario

# MODIFICAR: directorio raíz del proyecto
WorkingDirectory=/home/tu_usuario/Replit-bot

# MODIFICAR: ruta exacta al Python del entorno virtual (o sistema)
ExecStart=/usr/bin/python3 watchdog_bot.py

# Reiniciar el servicio si falla (el watchdog mismo, no el bot)
Restart=on-failure
RestartSec=15

# Variables de entorno — MODIFICAR: ajustá los valores
Environment=BOT_SCRIPT=main.py
Environment=RESTART_DELAY=5
Environment=MAX_RESTARTS_PER_HOUR=10

# Cargar .env si usás archivo de entorno separado
EnvironmentFile=/home/tu_usuario/Replit-bot/.env

# Logging — los logs van a journald
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bot-watchdog

[Install]
WantedBy=multi-user.target
`;

const WINDOWS_BAT = `:: watchdog_windows.bat
:: ─────────────────────────────────────────────────────────────
:: PROPÓSITO: Watchdog para Windows — reinicio automático del bot
:: MODIFICAR: ajusta las rutas según tu instalación
:: ─────────────────────────────────────────────────────────────

@echo off
setlocal

:: MODIFICAR: script principal de tu bot
set BOT_SCRIPT=main.py

:: MODIFICAR: segundos de espera entre reinicios
set RESTART_DELAY=5

echo [WATCHDOG] Iniciando modo 24/7 para %BOT_SCRIPT%
echo [WATCHDOG] Presiona CTRL+C para detener

:loop
echo [WATCHDOG] Lanzando bot... %date% %time%
python %BOT_SCRIPT%
echo [WATCHDOG] Bot terminó. Reiniciando en %RESTART_DELAY% segundos...
timeout /t %RESTART_DELAY% /nobreak >nul
goto loop
`;

const ENV_WATCHDOG = `# Variables de entorno para el watchdog
# Agregalas a tu .env o a los Secrets de Replit

# Script principal a monitorear
BOT_SCRIPT=main.py

# Segundos antes de reiniciar tras un fallo
RESTART_DELAY=5

# Máximo de reinicios por hora (0 = sin límite)
MAX_RESTARTS_PER_HOUR=10

# Notificaciones por Telegram (opcional — dejá vacío para deshabilitar)
WATCHDOG_NOTIFY_TOKEN=     # Token de un bot de Telegram para notificaciones
WATCHDOG_NOTIFY_CHAT=      # Tu chat ID de Telegram donde recibir las alertas
`;

export default function Watchdog() {
  const { lang } = useLanguage();

  const steps = [
    {
      icon: <Terminal className="h-4 w-4" />,
      title: M(lang, "Descargá el watchdog", "Download the watchdog"),
      desc: M(lang, "Copiá watchdog_bot.py al directorio raíz de tu proyecto, junto a main.py.", "Copy watchdog_bot.py to the root of your project, next to main.py."),
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: M(lang, "Configurá tu .env", "Configure your .env"),
      desc: M(lang, "Agregá las variables del watchdog a tu .env. Las notificaciones de Telegram son opcionales.", "Add the watchdog variables to your .env. Telegram notifications are optional."),
    },
    {
      icon: <RefreshCw className="h-4 w-4" />,
      title: M(lang, "Ejecutá el watchdog", "Run the watchdog"),
      desc: M(lang, "En lugar de python main.py, corré python watchdog_bot.py. Él se encarga del resto.", "Instead of python main.py, run python watchdog_bot.py. It handles the rest."),
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: M(lang, "En VPS: configurá systemd", "On VPS: configure systemd"),
      desc: M(lang, "Para 24/7 real en Linux, usá el servicio systemd incluido. Sobrevive reinicios del servidor.", "For real 24/7 on Linux, use the included systemd service. Survives server reboots."),
    },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <RefreshCw className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {M(lang, "Fase 6 — Modo 24/7 con Watchdog", "Phase 6 — 24/7 Mode with Watchdog")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {M(lang, "Reinicio automático · Notificaciones Telegram · systemd para VPS · Batch para Windows", "Auto-restart · Telegram notifications · systemd for VPS · Batch for Windows")}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-lg">
          {M(lang,
            "El watchdog monitorea tu bot y lo reinicia automáticamente si falla. Incluye notificaciones opcionales por Telegram y soporte para systemd (Linux/VPS) y batch script (Windows).",
            "The watchdog monitors your bot and restarts it automatically if it crashes. Includes optional Telegram notifications and support for systemd (Linux/VPS) and batch script (Windows)."
          )}
        </p>
      </div>

      {/* Pasos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="border border-border rounded-lg p-4 flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-sm mb-1">
                {step.icon} {step.title}
              </div>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Funcionalidades clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: <RefreshCw className="h-4 w-4 text-green-400" />, label: M(lang, "Reinicio automático", "Auto-restart"), sub: M(lang, "Configurable", "Configurable") },
          { icon: <Clock className="h-4 w-4 text-blue-400" />, label: M(lang, "Límite por hora", "Hourly limit"), sub: "MAX_RESTARTS_PER_HOUR" },
          { icon: <Zap className="h-4 w-4 text-yellow-400" />, label: M(lang, "Notificaciones", "Notifications"), sub: M(lang, "Telegram opcional", "Telegram optional") },
          { icon: <ShieldCheck className="h-4 w-4 text-purple-400" />, label: M(lang, "Señales SIGTERM", "SIGTERM signals"), sub: M(lang, "Apagado limpio", "Clean shutdown") },
        ].map((f, i) => (
          <div key={i} className="border border-border rounded-lg p-3 text-center">
            <div className="flex justify-center mb-1">{f.icon}</div>
            <p className="text-xs font-semibold">{f.label}</p>
            <p className="text-xs text-muted-foreground">{f.sub}</p>
          </div>
        ))}
      </div>

      {/* Variables de entorno */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">{M(lang, "Variables de entorno", "Environment variables")}</h2>
        <CodeBlock code={ENV_WATCHDOG} language="bash" filename=".env (agregar)" />
      </div>

      {/* Watchdog principal */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">watchdog_bot.py</h2>
        <CodeBlock code={WATCHDOG_PY} language="python" filename="watchdog_bot.py" />
      </div>

      {/* systemd */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">
          {M(lang, "Para Linux/VPS — servicio systemd", "For Linux/VPS — systemd service")}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          {M(lang,
            "Con systemd el watchdog arranca automáticamente cuando reiniciás el servidor. Copiá el archivo y ejecutá los comandos de abajo.",
            "With systemd the watchdog starts automatically when you reboot the server. Copy the file and run the commands below."
          )}
        </p>
        <CodeBlock code={SYSTEMD_SERVICE} language="ini" filename="bot-watchdog.service" />
        <div className="mt-3">
          <CodeBlock
            code={`# Comandos para activar el servicio
sudo cp bot-watchdog.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bot-watchdog
sudo systemctl start bot-watchdog

# Ver estado y logs
sudo systemctl status bot-watchdog
sudo journalctl -u bot-watchdog -f`}
            language="bash"
            filename="activar_servicio.sh"
          />
        </div>
      </div>

      {/* Windows */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3">
          {M(lang, "Para Windows — Batch script", "For Windows — Batch script")}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          {M(lang,
            "Versión simplificada para Windows. Doble click en el .bat para iniciar en modo 24/7 local.",
            "Simplified version for Windows. Double-click the .bat file to start in 24/7 local mode."
          )}
        </p>
        <CodeBlock code={WINDOWS_BAT} language="batch" filename="watchdog_windows.bat" />
      </div>
    </Layout>
  );
}
