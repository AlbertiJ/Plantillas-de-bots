import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";

export default function SetupGuide() {
  const { t, lang } = useLanguage();

  const M = (es: string, en: string) => lang === "es" ? es : en;

  const venvSetup = `# ${M("Crear y activar entorno virtual (recomendado)", "Create and activate virtual environment (recommended)")}
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\\Scripts\\activate   # Windows

# ${M("Instalar librería y dotenv", "Install library and dotenv")}
pip install python-telegram-bot[job-queue] python-dotenv`;

  const telegramReqs = `python-telegram-bot[job-queue]==20.7
python-dotenv==1.0.0
APScheduler==3.10.4  # ${M("Opcional: para tareas programadas", "Optional: for scheduled tasks")}`;

  const ngrokCmd = `# ${M("En una terminal separada", "In a separate terminal")}
ngrok http 5000`;

  const waInstall = `pip install flask twilio python-dotenv apscheduler openai`;

  const waReqs = `Flask==3.0.0
twilio==8.11.0
python-dotenv==1.0.0
gunicorn==21.2.0  # ${M("Para despliegue en producción", "For production deployment")}
APScheduler==3.10.4
openai==1.12.0`;

  const telegramSteps = t("setupTelegramSteps").split("|");
  const waSteps = t("setupWaSteps").split("|");

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("setupTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{t("setupSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Telegram Column */}
          <div className="space-y-5">
            <h2 className="text-xl font-semibold border-b pb-2">{t("setupTelegramTitle")}</h2>

            <div className="space-y-3">
              <h3 className="font-medium text-sm sm:text-base">{t("setupStep1")}</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground">
                {telegramSteps.map((step, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: step.replace(/@BotFather/, '<strong>@BotFather</strong>').replace(/\/newbot/, '<code>/newbot</code>') }} />
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-sm sm:text-base mb-2">{t("setupStep2")}</h3>
              <CodeBlock language="bash" code={venvSetup} />
            </div>

            <div>
              <h3 className="font-medium text-sm sm:text-base mb-1">{t("setupStep3")}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                {M("Guarda esto como", "Save this as")} <code>requirements.txt</code>
              </p>
              <CodeBlock filename="requirements.txt" code={telegramReqs} />
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-xs sm:text-sm">
              <p className="font-medium mb-1">{M("Verificar que el bot responde:", "Verify the bot responds:")}</p>
              <code className="text-muted-foreground">python telegram_bot.py</code>
              <p className="text-muted-foreground mt-1">
                {M("Abre Telegram y envía /start a tu bot. Deberías recibir respuesta.", "Open Telegram and send /start to your bot. You should get a response.")}
              </p>
            </div>
          </div>

          {/* WhatsApp Column */}
          <div className="space-y-5">
            <h2 className="text-xl font-semibold border-b pb-2">{t("setupWhatsAppTitle")}</h2>

            <div>
              <h3 className="font-medium text-sm sm:text-base">{t("setupWaStep1")}</h3>
              <ol className="list-decimal list-inside space-y-2 mt-2 text-xs sm:text-sm text-muted-foreground">
                {waSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-sm sm:text-base mb-1">{t("setupWaStep2")}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                {M(
                  "Twilio necesita una URL pública para enviar webhooks. Usa ngrok en desarrollo local.",
                  "Twilio needs a public URL to send webhooks. Use ngrok for local development."
                )}
              </p>
              <CodeBlock language="bash" code={ngrokCmd} />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {M(
                  "Copia la URL HTTPS de ngrok y pégala en la configuración del Sandbox de Twilio, añadiendo /whatsapp al final.",
                  "Copy the ngrok HTTPS URL and paste it into your Twilio Sandbox settings, appending /whatsapp."
                )}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-sm sm:text-base mb-2">{t("setupWaStep3")}</h3>
              <CodeBlock language="bash" code={waInstall} />
            </div>

            <div>
              <h3 className="font-medium text-sm sm:text-base mb-2">{t("setupWaStep4")}</h3>
              <CodeBlock filename="requirements.txt" code={waReqs} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
