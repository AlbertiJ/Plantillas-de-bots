import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import { Badge } from "@/components/ui/badge";

export default function Deployment() {
  const { t, lang } = useLanguage();

  const localScript = `#!/bin/bash
# ============================================================
# ${lang === "es" ? "ENTORNO LOCAL DE PRUEBAS" : "LOCAL TESTING ENVIRONMENT"}
# ${lang === "es" ? "Ejecuta este script para instalar todo y arrancar el bot localmente." : "Run this script to install everything and start the bot locally."}
# ============================================================

# MODIFY: ${lang === "es" ? "Cambia 'telegram_bot.py' por el archivo de tu bot" : "Change 'telegram_bot.py' to your bot file"}
BOT_FILE="telegram_bot.py"

# ${lang === "es" ? "Crear entorno virtual si no existe" : "Create virtual environment if it doesn't exist"}
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "${lang === "es" ? "Entorno virtual creado." : "Virtual environment created."}"
fi

# ${lang === "es" ? "Activar el entorno virtual" : "Activate the virtual environment"}
source venv/bin/activate  # Mac/Linux
# venv\\Scripts\\activate   # Windows ${lang === "es" ? "(descomenta esta línea en Windows)" : "(uncomment this line on Windows)"}

# ${lang === "es" ? "Instalar dependencias" : "Install dependencies"}
pip install -r requirements.txt

# MODIFY: ${lang === "es" ? "Ajusta la variable de entorno si tu archivo .env se llama diferente" : "Adjust env var if your .env file has a different name"}
export $(cat .env | xargs)

echo "${lang === "es" ? "Bot iniciando en modo LOCAL..." : "Starting bot in LOCAL mode..."}"
python $BOT_FILE`;

  const procfile = `# Procfile — ${lang === "es" ? "para Railway, Render o Heroku" : "for Railway, Render or Heroku"}
# MODIFY: ${lang === "es" ? "Cambia 'telegram_bot.py' por el archivo principal de tu bot" : "Change 'telegram_bot.py' to your bot's main file"}
worker: python telegram_bot.py

# ${lang === "es" ? "Si es un bot de WhatsApp (Flask), usa gunicorn:" : "If it's a WhatsApp bot (Flask), use gunicorn:"}
# web: gunicorn app:app --workers 2 --timeout 60`;

  const systemdService = `# /etc/systemd/system/mybot.service
# MODIFY: ${lang === "es" ? "Cambia 'tu_usuario' y la ruta al directorio de tu proyecto" : "Change 'your_user' and the path to your project directory"}

[Unit]
Description=Telegram Bot Service
After=network.target

[Service]
Type=simple
# MODIFY: ${lang === "es" ? "Reemplaza 'tu_usuario' con tu usuario del sistema" : "Replace 'your_user' with your system user"}
User=your_user
# MODIFY: ${lang === "es" ? "Ruta completa al directorio de tu bot" : "Full path to your bot directory"}
WorkingDirectory=/home/your_user/my_bot
# MODIFY: ${lang === "es" ? "Ruta al Python del entorno virtual" : "Path to the virtual environment's Python"}
ExecStart=/home/your_user/my_bot/venv/bin/python telegram_bot.py
# MODIFY: ${lang === "es" ? "Cambia la ruta al archivo .env con tus credenciales" : "Change the path to the .env file with your credentials"}
EnvironmentFile=/home/your_user/my_bot/.env
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# ${lang === "es" ? "Comandos para habilitar y arrancar:" : "Commands to enable and start:"}
# sudo systemctl daemon-reload
# sudo systemctl enable mybot
# sudo systemctl start mybot
# sudo systemctl status mybot`;

  const dockerfile = `# Dockerfile — ${lang === "es" ? "Construye una imagen para producción" : "Build an image for production"}
# MODIFY: ${lang === "es" ? "Cambia la versión de Python si necesitas otra" : "Change Python version if needed"}
FROM python:3.11-slim

WORKDIR /app

# MODIFY: ${lang === "es" ? "Asegúrate de tener requirements.txt actualizado antes de construir" : "Make sure your requirements.txt is updated before building"}
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# MODIFY: ${lang === "es" ? "Cambia 'telegram_bot.py' por el archivo principal de tu bot" : "Change 'telegram_bot.py' to your bot's main file"}
CMD ["python", "telegram_bot.py"]

# ${lang === "es" ? "Construir y correr con:" : "Build and run with:"}
# docker build -t my-bot .
# docker run --env-file .env my-bot`;

  const railwayToml = `# railway.toml — ${lang === "es" ? "Configuración para Railway.app" : "Configuration for Railway.app"}
[build]
builder = "NIXPACKS"

[deploy]
# MODIFY: ${lang === "es" ? "Cambia el comando según el tipo de bot" : "Change the command based on bot type"}
startCommand = "python telegram_bot.py"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
# ${lang === "es" ? "Railway leerá las variables de entorno desde su panel de control" : "Railway reads environment variables from its dashboard"}`;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("deployTitle")}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm sm:text-base">
            {t("deploySubtitle")}
          </p>
        </div>

        {/* Local Testing */}
        <section className="space-y-4 border rounded-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{t("deployLocalTitle")}</h2>
            <Badge variant="secondary">{lang === "es" ? "Gratis" : "Free"}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{t("deployLocalDesc")}</p>

          <div>
            <h3 className="font-medium mb-2 text-sm">{t("deployDownloadTitle")}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {lang === "es"
                ? "Descarga este script de arranque, ponlo en la carpeta de tu bot y ejecútalo."
                : "Download this startup script, place it in your bot folder, and run it."}
            </p>
            <CodeBlock filename="start_local.sh" code={localScript} />
          </div>

          <div className="bg-muted/50 rounded-md p-3 sm:p-4 text-sm space-y-1">
            <p className="font-medium">{lang === "es" ? "Requisitos para prueba local:" : "Local testing requirements:"}</p>
            <ul className="text-muted-foreground space-y-1 text-xs sm:text-sm list-disc list-inside">
              <li>Python 3.9+</li>
              <li>pip</li>
              <li>{lang === "es" ? "Archivo .env con tus tokens" : ".env file with your tokens"}</li>
              <li>requirements.txt</li>
              <li>{lang === "es" ? "Tu computadora encendida mientras el bot corre" : "Your computer on while the bot runs"}</li>
            </ul>
          </div>
        </section>

        {/* Cloud Production */}
        <section className="space-y-6 border border-primary/30 rounded-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{t("deployCloudTitle")}</h2>
            <Badge>{lang === "es" ? "Producción 24/7" : "24/7 Production"}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{t("deployCloudDesc")}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-base">{t("deployRailwayTitle")}</h3>
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                {(lang === "es" ? [
                  "1. Sube tu código a GitHub",
                  "2. Crea una cuenta en railway.app",
                  "3. Conecta tu repositorio de GitHub",
                  "4. Agrega las variables de entorno en 'Variables'",
                  "5. Railway detecta Python automáticamente y despliega",
                  "Costo: plan Starter ~$5 USD/mes para uso continuo",
                ] : [
                  "1. Push your code to GitHub",
                  "2. Create an account at railway.app",
                  "3. Connect your GitHub repository",
                  "4. Add environment variables in 'Variables' tab",
                  "5. Railway auto-detects Python and deploys",
                  "Cost: Starter plan ~$5 USD/month for continuous use",
                ]).map((s, i) => (
                  <p key={i} className={i === 5 ? "text-primary font-medium" : ""}>{s}</p>
                ))}
              </div>
              <CodeBlock filename="railway.toml" code={railwayToml} />
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-base">{t("deployVpsTitle")}</h3>
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                {(lang === "es" ? [
                  "1. Crea un VPS en DigitalOcean, Linode o Vultr",
                  "2. Conéctate por SSH y clona tu repositorio",
                  "3. Crea el archivo de servicio systemd (abajo)",
                  "4. Habilita y arranca el servicio",
                  "El bot se reinicia automáticamente si falla",
                  "Costo: VPS básico desde ~$4-6 USD/mes",
                ] : [
                  "1. Create a VPS on DigitalOcean, Linode or Vultr",
                  "2. Connect via SSH and clone your repository",
                  "3. Create the systemd service file (below)",
                  "4. Enable and start the service",
                  "The bot restarts automatically if it crashes",
                  "Cost: Basic VPS from ~$4-6 USD/month",
                ]).map((s, i) => (
                  <p key={i} className={i === 5 ? "text-primary font-medium" : ""}>{s}</p>
                ))}
              </div>
              <CodeBlock filename="mybot.service" code={systemdService} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-base mb-3">{t("deployProcfileTitle")}</h3>
              <CodeBlock filename="Procfile" code={procfile} />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-3">{t("deployDockerTitle")}</h3>
              <CodeBlock filename="Dockerfile" code={dockerfile} />
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 sm:p-4">
            <p className="font-medium text-sm mb-2">
              {lang === "es" ? "Comparativa de opciones cloud:" : "Cloud options comparison:"}
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs sm:text-sm w-full">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-1 pr-4">{lang === "es" ? "Plataforma" : "Platform"}</th>
                    <th className="text-left py-1 pr-4">{lang === "es" ? "Costo" : "Cost"}</th>
                    <th className="text-left py-1">{lang === "es" ? "Ideal para" : "Ideal for"}</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {[
                    ["Railway", "~$5/mes", lang === "es" ? "Principiantes, despliegue fácil" : "Beginners, easy deploy"],
                    ["Render", lang === "es" ? "Gratis (con límites)" : "Free (with limits)", lang === "es" ? "Pruebas y proyectos pequeños" : "Testing and small projects"],
                    ["DigitalOcean VPS", "~$4-6/mes", lang === "es" ? "Control total, producción seria" : "Full control, serious production"],
                    ["AWS/GCP/Azure", lang === "es" ? "Variable" : "Variable", lang === "es" ? "Empresas, alta escala" : "Enterprise, high scale"],
                  ].map(([p, c, i]) => (
                    <tr key={p} className="border-b border-border/40">
                      <td className="py-1.5 pr-4 font-medium">{p}</td>
                      <td className="py-1.5 pr-4 text-primary">{c}</td>
                      <td className="py-1.5 text-muted-foreground">{i}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
