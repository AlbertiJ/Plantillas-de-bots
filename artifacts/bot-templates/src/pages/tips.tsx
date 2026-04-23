import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";

export default function Tips() {
  const { t, lang } = useLanguage();

  const M = (es: string, en: string) => lang === "es" ? es : en;

  const envExample = `# .env — ${M("nunca subir a git", "never commit to git")}
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token`;

  const configPy = `import os
from dotenv import load_dotenv

load_dotenv()

# ${M("MODIFICAR: agrega aquí todas las variables que tu bot necesita", "MODIFY: add all variables your bot needs here")}
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_TOKEN:
    raise ValueError("${M("Falta TELEGRAM_BOT_TOKEN en el .env", "Missing TELEGRAM_BOT_TOKEN in .env")}")`;

  const loggerPy = `import logging

# ${M("MODIFICAR: cambia el level según lo que necesites (DEBUG, INFO, WARNING, ERROR)", "MODIFY: change level as needed (DEBUG, INFO, WARNING, ERROR)")}
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    # ${M("MODIFICAR: agrega un FileHandler para guardar logs en archivo también", "MODIFY: add a FileHandler to also save logs to a file")}
    # handlers=[logging.StreamHandler(), logging.FileHandler("bot.log")]
)
logger = logging.getLogger(__name__)

# ${M("MODIFICAR: usa el logger en lugar de print() en todo tu código", "MODIFY: use the logger instead of print() throughout your code")}
logger.info("${M("Bot iniciado correctamente", "Bot started successfully")}")
logger.error("${M("Error al conectar a la API", "Failed to connect to API")}")`;

  const rateLimitPy = `import time
from collections import defaultdict

# ${M("MODIFICAR: ajusta MAX_REQUESTS y WINDOW_SECONDS según tu caso", "MODIFY: adjust MAX_REQUESTS and WINDOW_SECONDS for your case")}
MAX_REQUESTS = 5  # ${M("máximo de mensajes", "max messages")}
WINDOW_SECONDS = 60  # ${M("en este período", "in this period")}

user_requests = defaultdict(list)

def is_rate_limited(user_id: str) -> bool:
    now = time.time()
    # ${M("Limpia solicitudes antiguas fuera de la ventana de tiempo", "Clean up old requests outside the time window")}
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < WINDOW_SECONDS]

    if len(user_requests[user_id]) >= MAX_REQUESTS:
        return True

    user_requests[user_id].append(now)
    return False

# ${M("Uso en un handler de Telegram", "Usage in a Telegram handler")}
async def my_handler(update, context):
    user_id = str(update.effective_user.id)
    if is_rate_limited(user_id):
        # ${M("MODIFICAR: personaliza el mensaje de límite de tasa", "MODIFY: personalize the rate limit message")}
        await update.message.reply_text("${M("Demasiados mensajes. Espera un momento.", "Too many messages. Please wait a moment.")}")
        return
    # ${M("... lógica normal del bot ...", "... normal bot logic ...")}"`;

  const errorHandlerPy = `from telegram.ext import Application

# ${M("MODIFICAR: personaliza cómo manejas diferentes tipos de errores", "MODIFY: customize how you handle different error types")}
async def error_handler(update, context):
    logger.error(f"${M("Error:", "Error:")} {context.error}")

    # ${M("MODIFICAR: envía alertas a un canal de Telegram de admin cuando hay errores críticos", "MODIFY: send alerts to an admin Telegram channel on critical errors")}
    # await context.bot.send_message(chat_id=ADMIN_CHAT_ID, text=f"Error: {context.error}")

application = Application.builder().token(TOKEN).build()
# ${M("Registra el manejador de errores global", "Register the global error handler")}
application.add_error_handler(error_handler)`;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("tipsTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{t("tipsSubtitle")}</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t("tipsEnvTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("tipsEnvDesc")}</p>
          <CodeBlock filename=".env" language="bash" code={envExample} />
          <CodeBlock filename="config.py" code={configPy} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t("tipsLogTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("tipsLogDesc")}</p>
          <CodeBlock filename="logger.py" code={loggerPy} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">
            {M("Rate Limiting (Límite de Solicitudes)", "Rate Limiting")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {M(
              "Evita que usuarios malintencionados o con errores saturen tu bot con mensajes.",
              "Prevent malicious or buggy users from flooding your bot with messages."
            )}
          </p>
          <CodeBlock filename="rate_limiter.py" code={rateLimitPy} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">
            {M("Manejo Global de Errores", "Global Error Handling")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {M(
              "Registra un manejador de errores global para que el bot no muera silenciosamente cuando algo falla.",
              "Register a global error handler so the bot doesn't die silently when something fails."
            )}
          </p>
          <CodeBlock filename="error_handler.py" code={errorHandlerPy} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t("tipsDeployTitle")}</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              {
                title: "Railway / Render",
                desc: M(
                  "El más fácil para bots polling. Conecta tu repo de GitHub y agrega un Procfile. Buenas opciones gratuitas.",
                  "Easiest for polling bots. Connect your GitHub repo and add a Procfile. Good free tiers."
                ),
              },
              {
                title: "VPS (DigitalOcean, Linode)",
                desc: M(
                  "Corre con systemd o Docker. Máximo control al menor costo de escala. Requiere conocimientos básicos de Linux.",
                  "Run with systemd or Docker. Most control and cheapest scaling. Requires basic Linux knowledge."
                ),
              },
              {
                title: "Serverless (AWS Lambda)",
                desc: M(
                  "Ideal para bots de WhatsApp (webhook). Pagas solo por solicitud. Puede tener cold start.",
                  "Ideal for WhatsApp bots (webhook). Pay only per request. Can have cold start delays."
                ),
              },
            ].map((opt) => (
              <div key={opt.title} className="border rounded-lg p-3 sm:p-4 bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">{opt.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{opt.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
