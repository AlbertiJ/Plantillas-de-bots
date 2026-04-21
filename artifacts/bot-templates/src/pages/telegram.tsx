import React from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const templates = [
  {
    id: "echo",
    name: "Basic Echo Bot",
    description: "The simplest possible bot. It listens to incoming text messages and replies with the exact same text.",
    code: `import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when the command /start is issued."""
    await update.message.reply_text("Hi! I am an echo bot. Send me any message and I'll echo it back.")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Echo the user message."""
    await update.message.reply_text(update.message.text)

def main():
    """Start the bot."""
    # Create the Application and pass it your bot's token.
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("No TELEGRAM_BOT_TOKEN found in .env")
        
    application = Application.builder().token(token).build()

    # on different commands - answer in Telegram
    application.add_handler(CommandHandler("start", start))

    # on non command i.e message - echo the message on Telegram
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    # Run the bot until the user presses Ctrl-C
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`
  },
  {
    id: "commands",
    name: "Command Handler",
    description: "Handles specific commands like /help, /about, and /settings with dedicated functions.",
    code: `import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Enable logging
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

load_dotenv()

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Welcome! Use /help to see available commands.")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """
Available Commands:
/start - Initialize the bot
/help - Show this help message
/about - Info about this bot
/ping - Check if bot is alive
    """
    await update.message.reply_text(help_text)

async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("I am a demonstration bot built with python-telegram-bot v20+.")

async def ping_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Pong! 🏓")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # Register command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("about", about_command))
    application.add_handler(CommandHandler("ping", ping_command))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`
  },
  {
    id: "inline-keyboard",
    name: "Inline Keyboard & Callbacks",
    description: "Sends a message with buttons attached to it and handles when the user clicks those buttons.",
    code: `import os
import logging
from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

load_dotenv()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sends a message with three inline buttons attached."""
    keyboard = [
        [
            InlineKeyboardButton("Option 1", callback_data="1"),
            InlineKeyboardButton("Option 2", callback_data="2"),
        ],
        [InlineKeyboardButton("Option 3", callback_data="3")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text("Please choose an option:", reply_markup=reply_markup)

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Parses the CallbackQuery and updates the message text."""
    query = update.callback_query
    
    # CallbackQueries need to be answered, even if no notification to the user is needed
    # Some clients may have trouble otherwise. See https://core.telegram.org/bots/api#callbackquery
    await query.answer()

    await query.edit_message_text(text=f"Selected option: {query.data}")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_callback))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`
  },
  {
    id: "poll",
    name: "Poll / Quiz Creator",
    description: "Creates polls or quizzes and listens for user answers.",
    code: `import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, PollAnswerHandler, ContextTypes

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

async def poll(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sends a predefined poll."""
    questions = ["Python", "JavaScript", "Go", "Rust"]
    message = await context.bot.send_poll(
        update.effective_chat.id,
        "Which is your favorite programming language?",
        questions,
        is_anonymous=False,
        allows_multiple_answers=True,
    )
    
    # Save some info about the poll the bot_data for later use
    payload = {
        message.poll.id: {
            "questions": questions,
            "message_id": message.message_id,
            "chat_id": update.effective_chat.id,
            "answers": 0,
        }
    }
    context.bot_data.update(payload)

async def receive_poll_answer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Summarize a users poll vote"""
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
            
    logger.info(f"User {answer.user.id} selected {answer_string}")
    answered_poll["answers"] += 1

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("poll", poll))
    application.add_handler(PollAnswerHandler(receive_poll_answer))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`
  },
  {
    id: "files",
    name: "File Downloader",
    description: "Receives photos or documents sent by users and saves them locally.",
    code: `import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Create downloads directory if it doesn't exist
os.makedirs("downloads", exist_ok=True)

async def download_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Downloads a photo sent to the bot."""
    # Telegram sends photos in different sizes. The last one is the largest.
    photo_file = await update.message.photo[-1].get_file()
    
    file_path = f"downloads/photo_{update.message.message_id}.jpg"
    await photo_file.download_to_drive(file_path)
    
    logger.info(f"Downloaded photo to {file_path}")
    await update.message.reply_text(f"Photo received and saved as {file_path}")

async def download_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Downloads a document sent to the bot."""
    document = update.message.document
    doc_file = await document.get_file()
    
    file_path = f"downloads/{document.file_name}"
    await doc_file.download_to_drive(file_path)
    
    logger.info(f"Downloaded document to {file_path}")
    await update.message.reply_text(f"Document '{document.file_name}' received and saved.")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    application = Application.builder().token(token).build()

    # Handle photos
    application.add_handler(MessageHandler(filters.PHOTO, download_photo))
    
    # Handle documents
    application.add_handler(MessageHandler(filters.Document.ALL, download_document))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()`
  }
];

export default function TelegramBots() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telegram Bot Templates</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Production-ready templates using the official <code>python-telegram-bot</code> library v20+. These use the modern async/await syntax.
          </p>
        </div>

        <Tabs defaultValue={templates[0].id} className="w-full">
          <TabsList className="w-full overflow-x-auto flex-wrap h-auto justify-start bg-transparent p-0 mb-6 border-b border-border rounded-none">
            {templates.map((template) => (
              <TabsTrigger 
                key={template.id} 
                value={template.id}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                data-testid={`tab-${template.id}`}
              >
                {template.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {templates.map((template) => (
            <TabsContent key={template.id} value={template.id} className="mt-0 focus-visible:ring-0">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">{template.name}</h2>
                <p className="text-muted-foreground">{template.description}</p>
              </div>
              <CodeBlock 
                filename={`${template.id}_bot.py`}
                code={template.code} 
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
