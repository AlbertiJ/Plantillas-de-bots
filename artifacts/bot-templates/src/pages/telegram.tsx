import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/language";

export default function TelegramBots() {
  const { t, lang } = useLanguage();

  const M = (es: string, en: string) => lang === "es" ? es : en;

  const templates = [
    {
      id: "echo",
      name: M("Bot Eco Básico", "Basic Echo Bot"),
      description: M(
        "El bot más simple posible. Escucha mensajes de texto y responde con el mismo texto.",
        "The simplest possible bot. It listens to incoming text messages and replies with the exact same text."
      ),
      code: `import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()

# ${M("MODIFICAR: cambia el mensaje de bienvenida por el tuyo", "MODIFY: change the welcome message to yours")}
# ${M("Puedes agregar tu nombre, logo o descripción del bot aquí", "You can add your name, logo or bot description here")}
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("${M("Hola! Soy un bot de eco. Envíame cualquier mensaje y te lo repito.", "Hi! I am an echo bot. Send me any message and I'll echo it back.")}")

# ${M("MODIFICAR: en lugar de repetir el mensaje, puedes procesarlo, guardarlo o analizarlo", "MODIFY: instead of echoing, you can process, save or analyze the message")}
# ${M("Por ejemplo: guardarlo en una base de datos, traducirlo o clasificarlo", "For example: save it to a database, translate it or classify it")}
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(update.message.text)

def main():
    # ${M("MODIFICAR: la variable TELEGRAM_BOT_TOKEN debe estar en tu archivo .env", "MODIFY: TELEGRAM_BOT_TOKEN must be in your .env file")}
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("${M("No se encontró TELEGRAM_BOT_TOKEN en el archivo .env", "No TELEGRAM_BOT_TOKEN found in .env file")}")

    application = Application.builder().token(token).build()

    # ${M("MODIFICAR: agrega más handlers para responder a diferentes comandos o tipos de mensajes", "MODIFY: add more handlers to respond to different commands or message types")}
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    # ${M("MODIFICAR: allowed_updates controla qué tipos de actualizaciones recibe el bot", "MODIFY: allowed_updates controls which update types the bot receives")}
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`,
    },
    {
      id: "commands",
      name: M("Manejador de Comandos", "Command Handler"),
      description: M(
        "Responde a comandos específicos como /ayuda, /info y /estado.",
        "Handles specific commands like /help, /about, and /status."
      ),
      code: `import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# ${M("MODIFICAR: cambia el nivel de logging (INFO, DEBUG, WARNING, ERROR)", "MODIFY: change the logging level (INFO, DEBUG, WARNING, ERROR)")}
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# ${M("MODIFICAR: personaliza este mensaje de bienvenida con el nombre de tu bot", "MODIFY: personalize this welcome message with your bot's name")}
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("${M("Bienvenido/a! Usa /ayuda para ver los comandos disponibles.", "Welcome! Use /help to see available commands.")}")

# ${M("MODIFICAR: actualiza la lista de comandos para reflejar los que tiene tu bot", "MODIFY: update the command list to reflect what your bot offers")}
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """${M("Comandos disponibles:", "Available Commands:")}
/start - ${M("Iniciar el bot", "Initialize the bot")}
/help - ${M("Mostrar este mensaje", "Show this message")}
/about - ${M("Info sobre este bot", "Info about this bot")}
/ping - ${M("Verificar si el bot está activo", "Check if bot is alive")}"""
    await update.message.reply_text(help_text)

# ${M("MODIFICAR: agrega aquí la descripción real de tu bot, su propósito y creador", "MODIFY: add here the real description of your bot, its purpose and creator")}
async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("${M("Soy un bot de demostración construido con python-telegram-bot v20+.", "I am a demo bot built with python-telegram-bot v20+.")}")

async def ping_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ${M("MODIFICAR: puedes agregar métricas reales como uptime, uso de CPU o estado de DB", "MODIFY: you can add real metrics like uptime, CPU usage or DB status")}
    await update.message.reply_text("Pong!")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # ${M("MODIFICAR: agrega aquí todos los comandos que tu bot soportará", "MODIFY: add all commands your bot will support here")}
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("about", about_command))
    application.add_handler(CommandHandler("ping", ping_command))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`,
    },
    {
      id: "inline-keyboard",
      name: M("Teclado Inline y Callbacks", "Inline Keyboard & Callbacks"),
      description: M(
        "Envía mensajes con botones adjuntos y responde cuando el usuario presiona un botón.",
        "Sends messages with inline buttons and handles when users click those buttons."
      ),
      code: `import os
import logging
from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

load_dotenv()

# ${M("MODIFICAR: cambia los textos y datos de los botones según tu caso de uso", "MODIFY: change button texts and callback data to match your use case")}
# ${M("Puedes crear menús de productos, opciones de idioma, confirmaciones, etc.", "You can create product menus, language options, confirmations, etc.")}
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("${M("Opción 1", "Option 1")}", callback_data="1"),
            InlineKeyboardButton("${M("Opción 2", "Option 2")}", callback_data="2"),
        ],
        # ${M("MODIFICAR: agrega más filas de botones o cambia la distribución", "MODIFY: add more button rows or change the layout")}
        [InlineKeyboardButton("${M("Opción 3", "Option 3")}", callback_data="3")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    # ${M("MODIFICAR: personaliza el texto del mensaje que acompaña a los botones", "MODIFY: personalize the text accompanying the buttons")}
    await update.message.reply_text("${M("Por favor elige una opción:", "Please choose an option:")}", reply_markup=reply_markup)

# ${M("MODIFICAR: agrega lógica real para cada botón en lugar de solo mostrar el ID", "MODIFY: add real logic for each button instead of just showing the ID")}
# ${M("Por ejemplo: guardar preferencia en DB, abrir un menú secundario, etc.", "For example: save preference in DB, open a submenu, etc.")}
async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()  # ${M("Obligatorio responder al callback para no bloquear el cliente", "Required to answer the callback to not block the client")}

    # ${M("MODIFICAR: aquí va la lógica real según el valor de query.data", "MODIFY: put real logic here based on query.data value")}
    await query.edit_message_text(text=f"${M("Seleccionaste la opción:", "You selected option:")} {query.data}")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("start", start))
    # ${M("MODIFICAR: puedes pasar un patrón regex al CallbackQueryHandler para filtrar callbacks", "MODIFY: you can pass a regex pattern to CallbackQueryHandler to filter callbacks")}
    application.add_handler(CallbackQueryHandler(button_callback))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`,
    },
    {
      id: "poll",
      name: M("Encuestas y Quiz", "Poll / Quiz Creator"),
      description: M(
        "Crea encuestas o quizzes y recibe las respuestas de los usuarios.",
        "Creates polls or quizzes and receives user answers."
      ),
      code: `import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, PollAnswerHandler, ContextTypes

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# ${M("MODIFICAR: reemplaza la pregunta y las opciones con tu contenido real", "MODIFY: replace the question and options with your real content")}
# ${M("Puedes cargar preguntas desde un archivo JSON o base de datos", "You can load questions from a JSON file or database")}
async def poll(update: Update, context: ContextTypes.DEFAULT_TYPE):
    questions = ["Python", "JavaScript", "Go", "Rust"]  # ${M("MODIFICAR: tus opciones aquí", "MODIFY: your options here")}
    message = await context.bot.send_poll(
        update.effective_chat.id,
        # ${M("MODIFICAR: cambia la pregunta por la tuya", "MODIFY: change the question to yours")}
        "${M("¿Cuál es tu lenguaje de programación favorito?", "Which is your favorite programming language?")}",
        questions,
        # ${M("MODIFICAR: is_anonymous=True si no quieres saber quién votó qué", "MODIFY: is_anonymous=True if you don't want to know who voted what")}
        is_anonymous=False,
        # ${M("MODIFICAR: allows_multiple_answers=False para respuesta única (quiz)", "MODIFY: allows_multiple_answers=False for single answer (quiz)")}
        allows_multiple_answers=True,
    )

    payload = {
        message.poll.id: {
            "questions": questions,
            "message_id": message.message_id,
            "chat_id": update.effective_chat.id,
            "answers": 0,
        }
    }
    context.bot_data.update(payload)

# ${M("MODIFICAR: aquí puedes guardar los resultados en una DB, enviar notificaciones, etc.", "MODIFY: here you can save results to DB, send notifications, etc.")}
async def receive_poll_answer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    answer = update.poll_answer
    answered_poll = context.bot_data.get(answer.poll_id)

    if not answered_poll:
        return

    try:
        questions = answered_poll["questions"]
    except KeyError:
        return

    selected_options = answer.option_ids
    answer_string = ""
    for question_id in selected_options:
        if question_id != selected_options[-1]:
            answer_string += questions[question_id] + " and "
        else:
            answer_string += questions[question_id]

    # ${M("MODIFICAR: guarda este resultado en tu DB en lugar de solo loguearlo", "MODIFY: save this result to your DB instead of just logging")}
    logger.info(f"${M("Usuario", "User")} {answer.user.id} ${M("seleccionó", "selected")} {answer_string}")
    answered_poll["answers"] += 1

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("poll", poll))
    application.add_handler(PollAnswerHandler(receive_poll_answer))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`,
    },
    {
      id: "files",
      name: M("Descargador de Archivos", "File Downloader"),
      description: M(
        "Recibe fotos o documentos enviados por usuarios y los guarda localmente.",
        "Receives photos or documents sent by users and saves them locally."
      ),
      code: `import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# ${M("MODIFICAR: cambia 'downloads' por la ruta donde quieres guardar los archivos", "MODIFY: change 'downloads' to the path where you want to save files")}
os.makedirs("downloads", exist_ok=True)

async def download_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ${M("Telegram envía fotos en múltiples tamaños. El último es el de mayor resolución", "Telegram sends photos in multiple sizes. The last one is the highest resolution")}
    photo_file = await update.message.photo[-1].get_file()

    # ${M("MODIFICAR: cambia el nombre del archivo o sube directamente a un bucket S3/GCS", "MODIFY: change the filename or upload directly to an S3/GCS bucket")}
    file_path = f"downloads/photo_{update.message.message_id}.jpg"
    await photo_file.download_to_drive(file_path)

    logger.info(f"${M("Foto guardada en", "Downloaded photo to")} {file_path}")
    # ${M("MODIFICAR: personaliza el mensaje de confirmación al usuario", "MODIFY: personalize the confirmation message to the user")}
    await update.message.reply_text(f"${M("Foto recibida y guardada.", "Photo received and saved.")}")

async def download_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    document = update.message.document
    doc_file = await document.get_file()

    file_path = f"downloads/{document.file_name}"
    await doc_file.download_to_drive(file_path)

    # ${M("MODIFICAR: puedes analizar el documento (PDF, Excel) después de descargarlo", "MODIFY: you can analyze the document (PDF, Excel) after downloading")}
    logger.info(f"${M("Documento guardado en", "Downloaded document to")} {file_path}")
    await update.message.reply_text(f"${M("Documento", "Document")} '{document.file_name}' ${M("recibido.", "received.")}")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # ${M("MODIFICAR: agrega más filtros para aceptar solo ciertos tipos de archivos", "MODIFY: add more filters to accept only certain file types")}
    # ${M("Ejemplo: filters.Document.PDF para aceptar solo PDFs", "Example: filters.Document.PDF to accept only PDFs")}
    application.add_handler(MessageHandler(filters.PHOTO, download_photo))
    application.add_handler(MessageHandler(filters.Document.ALL, download_document))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("telegramTitle")}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm sm:text-base">
            {t("telegramSubtitle")}
          </p>
        </div>

        <Tabs defaultValue={templates[0].id} className="w-full">
          <TabsList className="w-full overflow-x-auto flex-nowrap sm:flex-wrap h-auto justify-start bg-transparent p-0 mb-4 border-b border-border rounded-none gap-0">
            {templates.map((template) => (
              <TabsTrigger
                key={template.id}
                value={template.id}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                data-testid={`tab-tg-${template.id}`}
              >
                {template.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {templates.map((template) => (
            <TabsContent key={template.id} value={template.id} className="mt-0 focus-visible:ring-0">
              <div className="mb-3">
                <h2 className="text-lg sm:text-xl font-semibold mb-1">{template.name}</h2>
                <p className="text-muted-foreground text-sm">{template.description}</p>
              </div>
              <CodeBlock filename={`${template.id}_bot.py`} code={template.code} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
