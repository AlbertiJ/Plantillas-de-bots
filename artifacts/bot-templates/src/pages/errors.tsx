import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { useLanguage } from "@/context/language";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ErrorItem {
  id: string;
  platform: "telegram" | "whatsapp" | "general";
  title: string;
  symptom: string;
  cause: string;
  fix: string;
  code?: string;
  codeFile?: string;
}

function ErrorCard({ error }: { error: ErrorItem }) {
  const [open, setOpen] = useState(false);

  const platformColor = {
    telegram: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
    general: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  }[error.platform];

  const platformLabel = {
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    general: "General",
  }[error.platform];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${platformColor}`}>
          {platformLabel}
        </span>
        <span className="font-medium text-sm flex-1">{error.title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/20">
          <div className="pt-3 space-y-2 text-sm">
            <div>
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{error.symptom.split(":")[0]}:</span>
              <p className="mt-0.5">{error.symptom.split(":").slice(1).join(":").trim()}</p>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{error.cause.split(":")[0]}:</span>
              <p className="mt-0.5">{error.cause.split(":").slice(1).join(":").trim()}</p>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{error.fix.split(":")[0]}:</span>
              <p className="mt-0.5">{error.fix.split(":").slice(1).join(":").trim()}</p>
            </div>
          </div>
          {error.code && (
            <CodeBlock filename={error.codeFile || "fix.py"} code={error.code} />
          )}
        </div>
      )}
    </div>
  );
}

export default function CommonErrors() {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<"all" | "telegram" | "whatsapp" | "general">("all");

  const M = (es: string, en: string) => lang === "es" ? es : en;

  const errors: ErrorItem[] = [
    {
      id: "invalid-token",
      platform: "telegram",
      title: M("Token de Telegram inválido", "Invalid Telegram Token"),
      symptom: M("Síntoma: El bot arranca pero no responde a ningún mensaje, o muestra 'Unauthorized'.", "Symptom: The bot starts but doesn't respond, or shows 'Unauthorized'."),
      cause: M("Causa: El token en tu .env está mal copiado, tiene espacios extra, o fue revocado por BotFather.", "Cause: The token in your .env is incorrectly copied, has extra spaces, or was revoked by BotFather."),
      fix: M("Solución: Ve a @BotFather en Telegram, envía /mybots, selecciona tu bot y usa 'API Token' para obtener uno nuevo. Cópialo exactamente.", "Fix: Go to @BotFather on Telegram, send /mybots, select your bot and use 'API Token' to get a new one. Copy it exactly."),
      code: `# ${M("Verificar que el token está cargado correctamente", "Verify the token is loaded correctly")}
import os
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("TELEGRAM_BOT_TOKEN")
print(f"${M("Token cargado:", "Token loaded:")} '{token}'")
# ${M("Si muestra 'None', el .env no está siendo leído o la variable tiene otro nombre", "If it shows 'None', the .env isn't being read or the variable has a different name")}`,
      codeFile: "debug_token.py",
    },
    {
      id: "polling-conflict",
      platform: "telegram",
      title: M("Conflicto de instancias múltiples", "Multiple Instances Conflict"),
      symptom: M("Síntoma: Error 'Conflict: terminated by other getUpdates request'. El bot responde de forma errática o doble.", "Symptom: Error 'Conflict: terminated by other getUpdates request'. Bot responds erratically or double."),
      cause: M("Causa: Tenés más de una instancia del bot corriendo al mismo tiempo con el mismo token.", "Cause: You have more than one instance of the bot running simultaneously with the same token."),
      fix: M("Solución: Cerrá todas las terminales donde corra el bot. En Linux/Mac buscá el proceso con 'ps aux | grep python' y matalo con 'kill PID'.", "Fix: Close all terminals running the bot. On Linux/Mac find the process with 'ps aux | grep python' and kill it with 'kill PID'."),
    },
    {
      id: "webhook-not-received",
      platform: "whatsapp",
      title: M("Twilio no llega el webhook", "Twilio webhook not received"),
      symptom: M("Síntoma: Enviás un mensaje de WhatsApp pero Flask no recibe nada en la consola.", "Symptom: You send a WhatsApp message but Flask receives nothing in the console."),
      cause: M("Causa: La URL del webhook en Twilio no apunta a tu servidor local, o ngrok está desconectado.", "Cause: The webhook URL in Twilio doesn't point to your local server, or ngrok is disconnected."),
      fix: M("Solución: Verificá que ngrok está corriendo ('ngrok http 5000'), copiá la URL HTTPS nueva y actualizala en Twilio Sandbox > When a message comes in.", "Fix: Verify ngrok is running ('ngrok http 5000'), copy the new HTTPS URL and update it in Twilio Sandbox > When a message comes in."),
      code: `# ${M("Agregar log de cada webhook recibido para debuggear", "Add log of each webhook received for debugging")}
@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    print("${M("Webhook recibido!", "Webhook received!")}")
    print(f"${M("Datos:", "Data:")} {dict(request.values)}")
    # ... ${M("resto del código", "rest of the code")}`,
      codeFile: "debug_webhook.py",
    },
    {
      id: "twilio-free-limit",
      platform: "whatsapp",
      title: M("Límite del Sandbox de Twilio gratis", "Twilio Free Sandbox Limit"),
      symptom: M("Síntoma: El bot funciona para tu número pero no para otros. Reciben error '63007' o nada.", "Symptom: Bot works for your number but not others. They receive error '63007' or nothing."),
      cause: M("Causa: El Sandbox de Twilio requiere que cada usuario se una manualmente enviando un mensaje de activación.", "Cause: Twilio Sandbox requires each user to manually join by sending an activation message."),
      fix: M("Solución: Cada usuario debe enviar 'join <tu-sandbox-word>' al número del Sandbox de Twilio. Esto solo aplica en modo de prueba, no en producción con número verificado.", "Fix: Each user must send 'join <your-sandbox-word>' to the Twilio Sandbox number. This only applies in test mode, not in production with a verified number."),
    },
    {
      id: "env-not-loaded",
      platform: "general",
      title: M("Variables de .env no se cargan", ".env variables not loading"),
      symptom: M("Síntoma: os.getenv('MI_VARIABLE') devuelve None aunque el .env existe.", "Symptom: os.getenv('MY_VARIABLE') returns None even though .env exists."),
      cause: M("Causa: Se llama a os.getenv() antes de load_dotenv(), o el .env está en una carpeta diferente.", "Cause: os.getenv() is called before load_dotenv(), or the .env is in a different folder."),
      fix: M("Solución: Asegurate de llamar load_dotenv() al principio del archivo, antes de leer cualquier variable.", "Fix: Make sure to call load_dotenv() at the top of the file, before reading any variables."),
      code: `# CORRECTO: load_dotenv() primero
from dotenv import load_dotenv
import os

load_dotenv()  # ${M("SIEMPRE antes de os.getenv()", "ALWAYS before os.getenv()")}
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# ${M("Si el .env está en otra carpeta:", "If .env is in a different folder:")}
# load_dotenv("/ruta/absoluta/a/tu/.env")
# load_dotenv(dotenv_path="../.env")`,
      codeFile: "fix_dotenv.py",
    },
    {
      id: "module-not-found",
      platform: "general",
      title: M("ModuleNotFoundError al arrancar", "ModuleNotFoundError on startup"),
      symptom: M("Síntoma: 'ModuleNotFoundError: No module named telegram' o similar.", "Symptom: 'ModuleNotFoundError: No module named telegram' or similar."),
      cause: M("Causa: Instalaste el paquete fuera del entorno virtual, o el entorno virtual no está activado.", "Cause: You installed the package outside the virtual environment, or the virtual environment isn't activated."),
      fix: M("Solución: Activá el entorno virtual primero (source venv/bin/activate en Mac/Linux, venv\\Scripts\\activate en Windows) y luego instalá con pip install.", "Fix: Activate the virtual environment first (source venv/bin/activate on Mac/Linux, venv\\Scripts\\activate on Windows) and then install with pip install."),
      code: `# ${M("Verificar qué Python está en uso", "Verify which Python is in use")}
import sys
print(sys.executable)
# ${M("Debe mostrar la ruta dentro de tu venv, no el Python del sistema", "Should show the path inside your venv, not system Python")}
# ${M("Ejemplo correcto:", "Correct example:")} /home/user/mybot/venv/bin/python`,
      codeFile: "check_python.py",
    },
    {
      id: "flask-port",
      platform: "whatsapp",
      title: M("Flask no arranca o puerto ocupado", "Flask won't start or port busy"),
      symptom: M("Síntoma: 'OSError: [Errno 98] Address already in use' al iniciar Flask.", "Symptom: 'OSError: [Errno 98] Address already in use' when starting Flask."),
      cause: M("Causa: Hay otro proceso usando el puerto 5000 (puede ser una instancia anterior de Flask).", "Cause: Another process is using port 5000 (may be a previous Flask instance)."),
      fix: M("Solución: En Mac/Linux: 'lsof -i :5000' para ver qué proceso es, luego 'kill -9 PID'. O cambiar el puerto en el código.", "Fix: On Mac/Linux: 'lsof -i :5000' to see what process it is, then 'kill -9 PID'. Or change the port in code."),
      code: `# ${M("Usar un puerto diferente o leer del entorno", "Use a different port or read from environment")}
import os
# ${M("MODIFICAR: cambia 5000 por otro puerto si hay conflicto", "MODIFY: change 5000 to another port if there's a conflict")}
port = int(os.environ.get("PORT", 5001))
app.run(host="0.0.0.0", port=port, debug=True)`,
      codeFile: "fix_port.py",
    },
    {
      id: "ngrok-expired",
      platform: "whatsapp",
      title: M("URL de ngrok expirada", "Ngrok URL expired"),
      symptom: M("Síntoma: El bot funcionaba pero de repente dejó de recibir mensajes después de varias horas.", "Symptom: Bot was working but suddenly stopped receiving messages after several hours."),
      cause: M("Causa: ngrok gratuito genera una URL nueva cada vez que se reinicia, y expira cada 8 horas aprox.", "Cause: Free ngrok generates a new URL every time it restarts, and expires approximately every 8 hours."),
      fix: M("Solución: Reiniciá ngrok, copiá la nueva URL HTTPS y actualizala en Twilio Sandbox. Para evitar esto en producción, desplegá en Railway o Render.", "Fix: Restart ngrok, copy the new HTTPS URL and update it in Twilio Sandbox. To avoid this in production, deploy to Railway or Render."),
    },
  ];

  const filtered = filter === "all" ? errors : errors.filter(e => e.platform === filter);

  const filterButtons: { key: typeof filter; label: string }[] = [
    { key: "all", label: M("Todos", "All") },
    { key: "telegram", label: "Telegram" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "general", label: "General" },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {M("Errores Comunes y Soluciones", "Common Errors & Solutions")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm sm:text-base">
            {M(
              "Los errores más frecuentes al desarrollar bots en Python, con sus causas y cómo solucionarlos. Hacé clic en cualquiera para expandirlo.",
              "The most common errors when developing Python bots, with their causes and how to fix them. Click any to expand."
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === btn.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(error => (
            <ErrorCard key={error.id} error={error} />
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-sm">
          <p className="font-medium mb-1">
            {M("¿No encontraste tu error?", "Didn't find your error?")}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {M(
              "La mayoría de errores de bots en Python se encuentran en Stack Overflow o en la documentación oficial: python-telegram-bot.readthedocs.io y twilio.com/docs.",
              "Most Python bot errors can be found on Stack Overflow or in the official docs: python-telegram-bot.readthedocs.io and twilio.com/docs."
            )}
          </p>
        </div>
      </div>
    </Layout>
  );
}
