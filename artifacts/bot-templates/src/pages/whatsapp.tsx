import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/language";

export default function WhatsAppBots() {
  const { t, lang } = useLanguage();

  const M = (es: string, en: string) => lang === "es" ? es : en;

  const templates = [
    {
      id: "echo",
      name: M("Webhook Básico (Flask)", "Basic Webhook (Flask)"),
      description: M(
        "La base de todos los bots de WhatsApp. Un servidor Flask que recibe webhooks de Twilio y responde.",
        "The foundation for all WhatsApp bots. A Flask server that receives webhooks from Twilio and replies."
      ),
      code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ${M("MODIFICAR: cambia la ruta '/whatsapp' si quieres usar otra URL para el webhook", "MODIFY: change the '/whatsapp' route if you want to use a different webhook URL")}
@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    # ${M("MODIFICAR: 'Body' contiene el texto del mensaje. Puedes agregar validación aquí", "MODIFY: 'Body' contains the message text. You can add validation here")}
    incoming_msg = request.values.get("Body", "").strip()
    # ${M("MODIFICAR: 'From' tiene el número del usuario en formato 'whatsapp:+XXXX'", "MODIFY: 'From' has the user's number in 'whatsapp:+XXXX' format")}
    sender = request.values.get("From", "")

    print(f"${M("Mensaje de", "Message from")} {sender}: {incoming_msg}")

    resp = MessagingResponse()
    msg = resp.message()
    # ${M("MODIFICAR: cambia esta respuesta por la lógica real de tu bot", "MODIFY: replace this response with your bot's real logic")}
    msg.body(f"${M("Recibí tu mensaje:", "I received your message:")} '{incoming_msg}'")

    return str(resp)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # ${M("MODIFICAR: debug=False en producción. En producción usa gunicorn o waitress", "MODIFY: debug=False in production. In production use gunicorn or waitress")}
    app.run(host="0.0.0.0", port=port, debug=True)`,
    },
    {
      id: "commands",
      name: M("Enrutador de Comandos", "Command Routing"),
      description: M(
        "Dirige los mensajes a diferentes funciones según comandos o palabras clave.",
        "Routes incoming messages to different functions based on commands or keywords."
      ),
      code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

# ${M("MODIFICAR: personaliza el mensaje de saludo con el nombre de tu servicio", "MODIFY: personalize the greeting with your service name")}
def handle_hello(sender):
    return "${M("Hola! ¿En qué te puedo ayudar hoy?", "Hello! How can I help you today?")}"

# ${M("MODIFICAR: actualiza la lista de comandos para reflejar los que ofreces", "MODIFY: update the command list to reflect what you offer")}
def handle_help(sender):
    return "${M("Comandos disponibles:\n- hola: Saludo\n- estado: Estado del sistema\n- ayuda: Este menú", "Available commands:\n- hello: Say hi\n- status: System status\n- help: This menu")}"

# ${M("MODIFICAR: aquí puedes verificar APIs externas, bases de datos, etc.", "MODIFY: here you can check external APIs, databases, etc.")}
def handle_status(sender):
    return "${M("Todos los sistemas operativos!", "All systems operational!")}"

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    # ${M("MODIFICAR: agrega más comandos al if/elif según lo que tu bot deba hacer", "MODIFY: add more commands to the if/elif based on what your bot should do")}
    incoming_msg = request.values.get("Body", "").strip().lower()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    if incoming_msg in ["hola", "hello", "hi", "hey"]:
        response_text = handle_hello(sender)
    elif incoming_msg in ["ayuda", "help"]:
        response_text = handle_help(sender)
    elif incoming_msg in ["estado", "status"]:
        response_text = handle_status(sender)
    else:
        # ${M("MODIFICAR: cambia el mensaje de fallback por uno que tenga sentido para tu bot", "MODIFY: change the fallback message to one that makes sense for your bot")}
        response_text = "${M("No entendí ese comando. Envía 'ayuda' para ver opciones.", "I didn't understand that. Send 'help' for options.")}"

    msg.body(response_text)
    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
    {
      id: "media",
      name: M("Mensajes Multimedia", "Media Messages"),
      description: M(
        "Cómo enviar y recibir imágenes, documentos y archivos de audio.",
        "How to send and receive images, documents, and audio files."
      ),
      code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip().lower()

    # ${M("MODIFICAR: NumMedia indica cuántos archivos envió el usuario", "MODIFY: NumMedia indicates how many files the user sent")}
    num_media = int(request.values.get("NumMedia", 0))
    if num_media > 0:
        # ${M("MODIFICAR: puedes descargar este archivo con requests.get(media_url)", "MODIFY: you can download this file with requests.get(media_url)")}
        media_url = request.values.get("MediaUrl0")
        media_type = request.values.get("MediaContentType0")
        print(f"${M("Archivo recibido:", "File received:")} {media_url} - {media_type}")

    resp = MessagingResponse()
    msg = resp.message()

    if "imagen" in incoming_msg or "image" in incoming_msg:
        msg.body("${M("Aquí tienes una imagen:", "Here is an image:")}")
        # ${M("MODIFICAR: cambia esta URL por la imagen que quieras enviar (debe ser pública)", "MODIFY: change this URL to the image you want to send (must be publicly accessible)")}
        msg.media("https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400")
    elif "pdf" in incoming_msg or "doc" in incoming_msg:
        msg.body("${M("Aquí está el documento:", "Here is the document:")}")
        # ${M("MODIFICAR: cambia por la URL de tu PDF o documento. Debe ser accesible públicamente", "MODIFY: change to your PDF or document URL. Must be publicly accessible")}
        msg.media("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
    else:
        msg.body("${M("Envía 'imagen' para una foto o 'pdf' para un documento.", "Send 'image' for a photo or 'pdf' for a document.")}")

    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
    {
      id: "scheduler",
      name: M("Programador de Mensajes", "Message Scheduler"),
      description: M(
        "Envía mensajes automáticos de forma proactiva usando APScheduler y el cliente de Twilio.",
        "Sends automated messages proactively using APScheduler and the Twilio client."
      ),
      code: `import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from twilio.rest import Client
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

# ${M("MODIFICAR: estas variables vienen de tu archivo .env", "MODIFY: these variables come from your .env file")}
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
# ${M("MODIFICAR: en producción cambia por tu número de WhatsApp Business verificado", "MODIFY: in production change to your verified WhatsApp Business number")}
twilio_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
client = Client(account_sid, auth_token)

def send_daily_reminder():
    # ${M("MODIFICAR: en producción obtén esta lista desde tu base de datos", "MODIFY: in production get this list from your database")}
    users = ["whatsapp:+1234567890"]

    for user_number in users:
        try:
            # ${M("MODIFICAR: personaliza el mensaje del recordatorio", "MODIFY: personalize the reminder message")}
            message = client.messages.create(
                body="${M("Recordatorio diario: no olvides registrar tus horas hoy!", "Daily Reminder: Don't forget to log your hours today!")}",
                from_=twilio_number,
                to=user_number
            )
            print(f"${M("Enviado a", "Sent to")} {user_number}. SID: {message.sid}")
        except Exception as e:
            print(f"${M("Error al enviar a", "Failed to send to")} {user_number}: {e}")

if __name__ == "__main__":
    scheduler = BackgroundScheduler()

    # ${M("MODIFICAR: cambia la hora a la que quieres enviar el mensaje diario", "MODIFY: change the hour you want to send the daily message")}
    scheduler.add_job(send_daily_reminder, 'cron', hour=9, minute=0)

    # ${M("MODIFICAR: elimina esta línea en producción. Solo sirve para probar", "MODIFY: remove this line in production. Only for testing")}
    run_date = datetime.now() + timedelta(seconds=10)
    scheduler.add_job(send_daily_reminder, 'date', run_date=run_date)

    scheduler.start()
    print("${M("Programador iniciado. Ctrl+C para salir.", "Scheduler started. Ctrl+C to exit.")}")

    try:
        while True:
            pass
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()`,
    },
    {
      id: "chatgpt",
      name: M("Integración ChatGPT", "ChatGPT Integration"),
      description: M(
        "Reenvía mensajes del usuario a la API de OpenAI y devuelve la respuesta al chat.",
        "Forwards user messages to OpenAI API and sends the AI response back."
      ),
      code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
import openai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
openai.api_key = os.getenv("OPENAI_API_KEY")

# ${M("MODIFICAR: en producción usa Redis o una DB indexada por número de teléfono", "MODIFY: in production use Redis or a DB indexed by phone number")}
conversations = {}

def get_chatgpt_response(sender, message):
    if sender not in conversations:
        conversations[sender] = [
            # ${M("MODIFICAR: el system prompt define el comportamiento y personalidad del bot", "MODIFY: the system prompt defines the bot's behavior and personality")}
            {"role": "system", "content": "${M("Eres un asistente de WhatsApp útil y conciso.", "You are a helpful and concise WhatsApp assistant.")}"}
        ]

    conversations[sender].append({"role": "user", "content": message})

    # ${M("MODIFICAR: ajusta el límite de mensajes para controlar el costo de tokens", "MODIFY: adjust the message limit to control token cost")}
    if len(conversations[sender]) > 10:
        conversations[sender] = [conversations[sender][0]] + conversations[sender][-9:]

    try:
        response = openai.chat.completions.create(
            # ${M("MODIFICAR: puedes usar 'gpt-4o' para mejor calidad (más costoso)", "MODIFY: you can use 'gpt-4o' for better quality (higher cost)")}
            model="gpt-3.5-turbo",
            messages=conversations[sender],
            # ${M("MODIFICAR: ajusta max_tokens según la longitud de respuesta que necesitas", "MODIFY: adjust max_tokens based on the response length you need")}
            max_tokens=250
        )

        reply = response.choices[0].message.content.strip()
        conversations[sender].append({"role": "assistant", "content": reply})
        return reply
    except Exception as e:
        print(f"${M("Error de OpenAI:", "OpenAI API error:")} {e}")
        return "${M("Lo siento, tengo problemas para responder ahora.", "Sorry, I'm having trouble responding right now.")}"

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    # ${M("MODIFICAR: agrega más comandos especiales además de /reset", "MODIFY: add more special commands besides /reset")}
    if incoming_msg.lower() == "/reset":
        conversations[sender] = []
        msg.body("${M("Historial de conversación borrado.", "Conversation history cleared.")}")
    else:
        ai_reply = get_chatgpt_response(sender, incoming_msg)
        msg.body(ai_reply)

    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
    {
      id: "sqlite",
      name: M("Bot con Base de Datos", "Database Bot (SQLite)"),
      description: M(
        "Guarda información de los usuarios en una base de datos SQLite para recordar preferencias y datos.",
        "Saves user information in a SQLite database to remember preferences and data."
      ),
      code: `import os
import sqlite3
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# ${M("MODIFICAR: cambia 'bot.db' por el nombre que quieras para tu base de datos", "MODIFY: change 'bot.db' to whatever you want to name your database")}
DB_PATH = "bot.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ${M("MODIFICAR: ajusta las columnas de la tabla según los datos que necesitas guardar", "MODIFY: adjust the table columns based on the data you need to save")}
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            phone TEXT PRIMARY KEY,
            name TEXT,
            message_count INTEGER DEFAULT 0,
            last_seen TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_or_create_user(phone):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ${M("MODIFICAR: agrega más campos si necesitas guardar más información del usuario", "MODIFY: add more fields if you need to save more user information")}
    c.execute("INSERT OR IGNORE INTO users (phone, message_count) VALUES (?, 0)", (phone,))
    c.execute("UPDATE users SET message_count = message_count + 1, last_seen = datetime('now') WHERE phone = ?", (phone,))
    conn.commit()
    c.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    user = c.fetchone()
    conn.close()
    return user

def set_user_name(phone, name):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ${M("MODIFICAR: extiende esto para actualizar cualquier otro campo del usuario", "MODIFY: extend this to update any other user field")}
    c.execute("UPDATE users SET name = ? WHERE phone = ?", (name, phone))
    conn.commit()
    conn.close()

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    user = get_or_create_user(sender)
    # ${M("user[0]=phone, user[1]=name, user[2]=message_count, user[3]=last_seen", "user[0]=phone, user[1]=name, user[2]=message_count, user[3]=last_seen")}
    name = user[1] or "${M("amigo/a", "friend")}"
    count = user[2]

    resp = MessagingResponse()
    msg = resp.message()

    if incoming_msg.lower().startswith("mi nombre es ") or incoming_msg.lower().startswith("my name is "):
        # ${M("MODIFICAR: ajusta el prefijo de comando según el idioma de tu bot", "MODIFY: adjust the command prefix based on your bot's language")}
        new_name = incoming_msg.split(" ", 3)[-1]
        set_user_name(sender, new_name)
        msg.body(f"${M("Genial, te recordaré como", "Great, I'll remember you as")} {new_name}!")
    elif incoming_msg.lower() in ["stats", "estadísticas"]:
        msg.body(f"${M("Hola", "Hello")} {name}! ${M("Llevas", "You have sent")} {count} ${M("mensajes en total.", "messages total.")}")
    else:
        msg.body(f"${M("Hola", "Hi")} {name}! ${M("Mensaje #", "Message #")}{count}.")

    return str(resp)

if __name__ == "__main__":
    init_db()
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
    {
      id: "multiuser",
      name: M("Bot de Grupo", "Group & Multi-user Bot"),
      description: M(
        "Gestiona mensajes de grupos de WhatsApp e identifica a los participantes.",
        "Manages WhatsApp group messages and identifies participants."
      ),
      code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

# ${M("MODIFICAR: agrega aquí los números de los administradores del bot", "MODIFY: add admin phone numbers here")}
ADMIN_NUMBERS = ["whatsapp:+1234567890"]

# ${M("MODIFICAR: adapta los comandos de administrador según tus necesidades", "MODIFY: adapt admin commands based on your needs")}
ADMIN_COMMANDS = {
    "/broadcast": "${M("Enviar mensaje a todos", "Send message to all")}",
    "/stats": "${M("Ver estadísticas del grupo", "View group statistics")}",
}

# ${M("MODIFICAR: mantén un registro de todos los usuarios que han interactuado", "MODIFY: keep track of all users who have interacted")}
known_users = set()

def is_admin(sender):
    # ${M("MODIFICAR: puedes almacenar los admins en una DB en lugar de hardcodearlos aquí", "MODIFY: you can store admins in a DB instead of hardcoding them here")}
    return sender in ADMIN_NUMBERS

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")
    # ${M("MODIFICAR: 'ProfileName' tiene el nombre del contacto en WhatsApp", "MODIFY: 'ProfileName' has the contact's WhatsApp display name")}
    profile_name = request.values.get("ProfileName", "${M("Usuario", "User")}")

    known_users.add(sender)

    resp = MessagingResponse()
    msg = resp.message()

    if is_admin(sender) and incoming_msg.startswith("/"):
        # ${M("MODIFICAR: agrega la lógica real de administración aquí", "MODIFY: add real admin logic here")}
        if incoming_msg == "/stats":
            msg.body(f"${M("Usuarios conocidos:", "Known users:")} {len(known_users)}")
        elif incoming_msg.startswith("/broadcast "):
            broadcast_msg = incoming_msg[11:]
            # ${M("MODIFICAR: itera sobre tu DB de usuarios para enviar a todos", "MODIFY: iterate over your user DB to broadcast to everyone")}
            msg.body(f"${M("Broadcast enviado:", "Broadcast sent:")} {broadcast_msg}")
        else:
            msg.body(f"${M("Comandos de admin:", "Admin commands:")} {', '.join(ADMIN_COMMANDS.keys())}")
    else:
        # ${M("MODIFICAR: aquí va la lógica normal para usuarios regulares", "MODIFY: regular user logic goes here")}
        msg.body(f"${M("Hola", "Hello")} {profile_name}! ${M("Somos", "We are")} {len(known_users)} ${M("usuarios.", "users.")}")

    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
    {
      id: "autodetect",
      name: M("Detección Automática de Idioma", "Auto Language Detection"),
      description: M(
        "Detecta el idioma del usuario y responde en el mismo idioma automáticamente.",
        "Detects the user's language and responds in that same language automatically."
      ),
      code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ${M("MODIFICAR: agrega más idiomas y palabras clave para una detección más precisa", "MODIFY: add more languages and keywords for more accurate detection")}
LANGUAGE_KEYWORDS = {
    "es": ["hola", "gracias", "ayuda", "como", "que", "como estas", "buenas", "buen dia", "buenas noches"],
    "en": ["hello", "thanks", "help", "how", "what", "how are you", "good morning", "good night", "hey"],
    "pt": ["ola", "obrigado", "ajuda", "como", "que", "bom dia", "boa tarde"],
}

# ${M("MODIFICAR: personaliza las respuestas para cada idioma", "MODIFY: personalize the responses for each language")}
RESPONSES = {
    "es": {
        "greeting": "Hola! Hablo español. ¿En qué te puedo ayudar?",
        "fallback": "Lo siento, no entendí eso.",
        "unknown": "No reconocí tu idioma, pero intento responder en inglés.",
    },
    "en": {
        "greeting": "Hello! I speak English. How can I help you?",
        "fallback": "Sorry, I didn't understand that.",
        "unknown": "I detected your language. Responding in English.",
    },
    "pt": {
        "greeting": "Olá! Eu falo português. Como posso ajudar?",
        "fallback": "Desculpe, não entendi isso.",
        "unknown": "Detectei seu idioma. Respondendo em português.",
    },
}

# ${M("MODIFICAR: memoriza el idioma del usuario en una DB para no re-detectar cada vez", "MODIFY: remember the user's language in a DB to avoid re-detecting every time")}
user_language_cache = {}

def detect_language(text):
    text_lower = text.lower()
    scores = {lang: 0 for lang in LANGUAGE_KEYWORDS}
    for lang, keywords in LANGUAGE_KEYWORDS.items():
        for word in keywords:
            if word in text_lower:
                scores[lang] += 1
    best = max(scores, key=scores.get)
    # ${M("MODIFICAR: ajusta el umbral mínimo para mayor precisión de detección", "MODIFY: adjust the minimum threshold for better detection accuracy")}
    return best if scores[best] > 0 else "en"

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    detected_lang = user_language_cache.get(sender) or detect_language(incoming_msg)
    user_language_cache[sender] = detected_lang

    resp_dict = RESPONSES.get(detected_lang, RESPONSES["en"])

    resp = MessagingResponse()
    msg = resp.message()
    msg.body(resp_dict["greeting"])

    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
    {
      id: "ordertracker",
      name: M("Rastreador de Pedidos", "Order Tracker"),
      description: M(
        "Sistema de seguimiento de pedidos. Los usuarios pueden consultar el estado de su pedido enviando su número de seguimiento.",
        "Order tracking system. Users can check the status of their order by sending their tracking number."
      ),
      code: `import os
import sqlite3
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
DB_PATH = "orders.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ${M("MODIFICAR: ajusta la estructura de la tabla según tu sistema de pedidos", "MODIFY: adjust the table structure according to your order system")}
    c.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            customer_phone TEXT,
            status TEXT,
            description TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    # ${M("Datos de ejemplo — en producción carga desde tu API o DB real", "Sample data — in production load from your real API or DB")}
    # ${M("MODIFICAR: reemplaza estos datos de muestra con los reales de tu sistema", "MODIFY: replace these sample records with real data from your system")}
    sample_orders = [
        ("ORD-001", "whatsapp:+1234567890", "${M("En camino", "In transit")}", "${M("Zapatos deportivos", "Sports shoes")}"),
        ("ORD-002", "whatsapp:+0987654321", "${M("Entregado", "Delivered")}", "${M("Libro de Python", "Python book")}"),
        ("ORD-003", "whatsapp:+1111111111", "${M("Procesando", "Processing")}", "${M("Teclado mecánico", "Mechanical keyboard")}"),
    ]
    c.executemany(
        "INSERT OR IGNORE INTO orders (order_id, customer_phone, status, description) VALUES (?, ?, ?, ?)",
        sample_orders
    )
    conn.commit()
    conn.close()

def get_order(order_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ${M("MODIFICAR: agrega más campos a la consulta si necesitas más datos del pedido", "MODIFY: add more fields to the query if you need more order data")}
    c.execute("SELECT order_id, status, description, updated_at FROM orders WHERE order_id = ?", (order_id.upper(),))
    order = c.fetchone()
    conn.close()
    return order

def get_my_orders(phone):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ${M("MODIFICAR: puedes filtrar por estado también: 'WHERE customer_phone = ? AND status != ?'", "MODIFY: you can also filter by status: 'WHERE customer_phone = ? AND status != ?'")}
    c.execute("SELECT order_id, status, description FROM orders WHERE customer_phone = ?", (phone,))
    orders = c.fetchall()
    conn.close()
    return orders

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    resp = MessagingResponse()
    msg = resp.message()

    # ${M("MODIFICAR: ajusta los comandos según el idioma de tus usuarios", "MODIFY: adjust commands based on your users' language")}
    if incoming_msg.lower() in ["mis pedidos", "my orders", "pedidos"]:
        orders = get_my_orders(sender)
        if orders:
            lines = [f"• {o[0]}: {o[1]} ({o[2]})" for o in orders]
            msg.body("${M("Tus pedidos:\n", "Your orders:\n")}" + "\n".join(lines))
        else:
            msg.body("${M("No encontré pedidos asociados a tu número.", "No orders found for your number.")}")

    elif incoming_msg.upper().startswith("ORD-") or incoming_msg.isdigit():
        # ${M("MODIFICAR: ajusta el formato del número de pedido según tu sistema", "MODIFY: adjust the order number format to match your system")}
        order = get_order(incoming_msg)
        if order:
            msg.body(f"${M("Pedido", "Order")} {order[0]}\n${M("Estado:", "Status:")} {order[1]}\n${M("Producto:", "Product:")} {order[2]}\n${M("Actualizado:", "Updated:")} {order[3]}")
        else:
            msg.body(f"${M("No encontré el pedido", "Order not found:")} {incoming_msg.upper()}")

    else:
        msg.body("${M("Envía tu número de pedido (ej: ORD-001) o escribe 'mis pedidos' para ver todos.", "Send your order number (e.g. ORD-001) or type 'my orders' to see all.")}")

    return str(resp)

if __name__ == "__main__":
    init_db()
    app.run(port=int(os.environ.get("PORT", 5000)))`,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("whatsappTitle")}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm sm:text-base">
            {t("whatsappSubtitle")}
          </p>
        </div>

        <Tabs defaultValue={templates[0].id} className="w-full">
          <TabsList className="w-full overflow-x-auto flex-nowrap h-auto justify-start bg-transparent p-0 mb-4 border-b border-border rounded-none gap-0">
            {templates.map((template) => (
              <TabsTrigger
                key={template.id}
                value={template.id}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                data-testid={`tab-wa-${template.id}`}
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
              <CodeBlock filename="app.py" code={template.code} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
