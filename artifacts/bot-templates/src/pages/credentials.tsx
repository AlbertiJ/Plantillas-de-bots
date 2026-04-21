import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import { AlertTriangle } from "lucide-react";

export default function Credentials() {
  const { t, lang } = useLanguage();

  const envFile = `# .env — ${lang === "es" ? "Archivo de variables de entorno" : "Environment variables file"}
# MODIFY: ${lang === "es" ? "Reemplaza los valores con tus credenciales reales" : "Replace with your real credentials"}
# ${lang === "es" ? "NUNCA subas este archivo a GitHub/GitLab" : "NEVER upload this file to GitHub/GitLab"}

# --- Telegram ---
# MODIFY: ${lang === "es" ? "Obtén este token hablando con @BotFather en Telegram" : "Get this token by talking to @BotFather on Telegram"}
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ

# --- WhatsApp (Twilio) ---
# MODIFY: ${lang === "es" ? "Encuentra el SID en tu panel de Twilio > Account Info" : "Find the SID in your Twilio Console > Account Info"}
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# MODIFY: ${lang === "es" ? "Encuentra el Auth Token en tu panel de Twilio > Account Info" : "Find the Auth Token in your Twilio Console > Account Info"}
TWILIO_AUTH_TOKEN=your_auth_token_here
# MODIFY: ${lang === "es" ? "Número del Sandbox de Twilio (o tu número de producción)" : "Twilio Sandbox number (or your production number)"}
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# --- OpenAI (opcional) ---
# MODIFY: ${lang === "es" ? "Obtén esta clave en platform.openai.com/api-keys" : "Get this key at platform.openai.com/api-keys"}
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# --- General ---
PORT=5000`;

  const gitignore = `# .gitignore
# MODIFY: ${lang === "es" ? "Agrega aquí cualquier otro archivo con datos sensibles" : "Add any other files with sensitive data here"}
.env
.env.local
.env.production
*.env
venv/
__pycache__/
*.pyc
*.pyo`;

  const configPy = `# config.py — ${lang === "es" ? "Módulo central para cargar credenciales" : "Central module for loading credentials"}
import os
from dotenv import load_dotenv

# ${lang === "es" ? "Carga el archivo .env automáticamente al importar este módulo" : "Loads .env file automatically when this module is imported"}
load_dotenv()

# MODIFY: ${lang === "es" ? "Agrega aquí todas las variables que tu bot necesita" : "Add all variables your bot needs here"}
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

# ${lang === "es" ? "Validación al arrancar: falla rápido si falta algo importante" : "Startup validation: fail fast if something important is missing"}
# MODIFY: ${lang === "es" ? "Ajusta qué variables son obligatorias para tu bot" : "Adjust which variables are required for your bot"}
def validate_config():
    required = {
        "TELEGRAM_BOT_TOKEN": TELEGRAM_TOKEN,
        # "TWILIO_ACCOUNT_SID": TWILIO_SID,  # ${lang === "es" ? "Descomenta si usas WhatsApp" : "Uncomment if using WhatsApp"}
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise ValueError(f"${lang === "es" ? "Variables faltantes en .env" : "Missing .env variables"}: {', '.join(missing)}")

validate_config()`;

  const usageExample = `# ${lang === "es" ? "Uso en tu bot — importa desde config.py" : "Usage in your bot — import from config.py"}
from config import TELEGRAM_TOKEN

# MODIFY: ${lang === "es" ? "Nunca escribas el token directamente aquí" : "Never write the token directly here"}
# MAL (NEVER):  token = "123456:ABCdef..."
# BIEN (GOOD):  token = TELEGRAM_TOKEN

application = Application.builder().token(TELEGRAM_TOKEN).build()`;

  const railwayEnv = `# ${lang === "es" ? "Variables en Railway / Render / Heroku" : "Variables on Railway / Render / Heroku"}
# ${lang === "es" ? "NO uses un archivo .env en la nube. Configura cada variable en el panel:" : "Do NOT use a .env file in the cloud. Set each variable in the dashboard:"}

# Railway: Panel > tu proyecto > Variables > Add Variable
# Render:  Panel > tu servicio > Environment > Add Environment Variable
# Heroku:  Panel > tu app > Settings > Config Vars

# ${lang === "es" ? "El código lee las variables exactamente igual que en local:" : "The code reads the variables exactly the same as locally:"}
TELEGRAM_BOT_TOKEN = "tu_token_aqui"
TWILIO_ACCOUNT_SID = "tu_sid_aqui"
# ${lang === "es" ? "etc... (no incluir comillas, solo el valor)" : "etc... (no quotes, just the value)"}`;

  const vpsEnv = `# ${lang === "es" ? "Variables en un VPS (Linux)" : "Variables on a VPS (Linux)"}
# MODIFY: ${lang === "es" ? "Opción 1: Archivo .env en el servidor (no en el repo)" : "Option 1: .env file on the server (not in the repo)"}
# ${lang === "es" ? "Crea el archivo en el servidor:" : "Create the file on the server:"}
nano /home/user/my_bot/.env
# ${lang === "es" ? "Agrega las variables, guarda y cierra" : "Add variables, save and close"}

# MODIFY: ${lang === "es" ? "Opción 2: Variables en el archivo de servicio systemd" : "Option 2: Variables in the systemd service file"}
# ${lang === "es" ? "En /etc/systemd/system/mybot.service, sección [Service]:" : "In /etc/systemd/system/mybot.service, section [Service]:"}
# EnvironmentFile=/home/user/my_bot/.env

# MODIFY: ${lang === "es" ? "Opción 3: Variables de entorno del sistema" : "Option 3: System environment variables"}
# ${lang === "es" ? "Agrega al final de /etc/environment o al .bashrc del usuario:" : "Add to /etc/environment or user's .bashrc:"}
export TELEGRAM_BOT_TOKEN="tu_token"`;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("credTitle")}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm sm:text-base">
            {t("credSubtitle")}
          </p>
        </div>

        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">
              {lang === "es"
                ? "Regla de oro: NUNCA escribas tokens directamente en tu código"
                : "Golden rule: NEVER write tokens directly in your code"}
            </p>
            <p className="text-muted-foreground mt-1">
              {lang === "es"
                ? "Si subes un token a GitHub, aunque sea por error y lo borres después, los bots de seguridad lo detectan en segundos. Rota el token inmediatamente si esto ocurre."
                : "If you push a token to GitHub, even by mistake and delete it after, security bots detect it within seconds. Rotate the token immediately if this happens."}
            </p>
          </div>
        </div>

        {/* Local */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t("credLocalTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("credLocalDesc")}</p>
          <CodeBlock filename=".env" code={envFile} />

          <div>
            <h3 className="font-medium mb-2 text-sm">{t("credGitignoreTitle")}</h3>
            <CodeBlock filename=".gitignore" code={gitignore} />
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">{t("credLoadTitle")}</h3>
            <CodeBlock filename="config.py" code={configPy} />
            <CodeBlock filename="bot.py" code={usageExample} />
          </div>
        </section>

        {/* Cloud */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t("credCloudTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("credCloudDesc")}</p>

          <div>
            <h3 className="font-medium mb-2 text-sm">{t("credRailwayTitle")}</h3>
            <CodeBlock filename="railway_env.txt" code={railwayEnv} />
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">{t("credVpsTitle")}</h3>
            <CodeBlock filename="vps_env.sh" code={vpsEnv} />
          </div>
        </section>

        <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-sm space-y-2">
          <p className="font-medium">
            {lang === "es" ? "Resumen de buenas prácticas:" : "Best practices summary:"}
          </p>
          <ul className="text-muted-foreground space-y-1.5 list-disc list-inside text-xs sm:text-sm">
            {(lang === "es" ? [
              "Usa .env localmente y variables de entorno en producción",
              "Agrega .env a .gitignore ANTES de escribir ningún secreto",
              "Crea un módulo config.py para centralizar la carga de credenciales",
              "Valida al arrancar que todas las variables necesarias estén presentes",
              "Rota los tokens regularmente o si sospechas que fueron expuestos",
              "Usa variables diferentes para desarrollo, pruebas y producción",
            ] : [
              "Use .env locally and environment variables in production",
              "Add .env to .gitignore BEFORE writing any secrets",
              "Create a config.py module to centralize credential loading",
              "Validate at startup that all required variables are present",
              "Rotate tokens regularly or if you suspect they were exposed",
              "Use different variables for development, testing, and production",
            ]).map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
