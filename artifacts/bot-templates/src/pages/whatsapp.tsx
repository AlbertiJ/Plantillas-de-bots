import React from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const templates = [
  {
    id: "echo",
    name: "Basic Webhook (Flask)",
    description: "The foundation for WhatsApp bots. A Flask server that receives incoming webhooks from Twilio and replies.",
    code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """Respond to incoming calls with a simple text message."""
    # Get the message the user sent
    incoming_msg = request.values.get("Body", "").strip()
    
    # Get the sender's phone number
    sender = request.values.get("From", "")
    
    print(f"Received message from {sender}: {incoming_msg}")
    
    # Start our TwiML response
    resp = MessagingResponse()
    
    # Add a message
    msg = resp.message()
    msg.body(f"I received your message: '{incoming_msg}'")
    
    return str(resp)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Run securely on local port. In production use gunicorn/waitress
    app.run(host="0.0.0.0", port=port, debug=True)`
  },
  {
    id: "commands",
    name: "Command Routing",
    description: "Routes incoming text to different functions based on commands or keywords.",
    code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

def handle_hello(sender):
    return "Hello there! How can I help you today?"

def handle_help(sender):
    return "Available commands:\n- hello: Say hi\n- status: Check system status\n- help: Show this menu"

def handle_status(sender):
    return "All systems operational! ✅"

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip().lower()
    sender = request.values.get("From", "")
    
    resp = MessagingResponse()
    msg = resp.message()
    
    # Simple routing logic
    if incoming_msg in ["hello", "hi", "hey"]:
        response_text = handle_hello(sender)
    elif incoming_msg == "help":
        response_text = handle_help(sender)
    elif incoming_msg == "status":
        response_text = handle_status(sender)
    else:
        response_text = "I didn't understand that command. Send 'help' for options."
        
    msg.body(response_text)
    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`
  },
  {
    id: "media",
    name: "Media Messages",
    description: "How to send images, documents, or audio files back to the user.",
    code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip().lower()
    
    # Check if user sent media
    num_media = int(request.values.get("NumMedia", 0))
    if num_media > 0:
        media_url = request.values.get("MediaUrl0")
        media_type = request.values.get("MediaContentType0")
        print(f"User sent a file: {media_url} of type {media_type}")
    
    resp = MessagingResponse()
    msg = resp.message()
    
    if "dog" in incoming_msg:
        msg.body("Here's a cute dog!")
        # Add media URL to send an image
        msg.media("https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400")
    elif "doc" in incoming_msg:
        msg.body("Here's the PDF you requested.")
        # Can be PDF, doc, etc.
        msg.media("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
    else:
        msg.body("Send 'dog' for a picture, or 'doc' for a PDF document.")
        
    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`
  },
  {
    id: "scheduler",
    name: "Auto-Reply Scheduler",
    description: "Sends automated messages proactively using Twilio Client and APScheduler, outside of the webhook cycle.",
    code: `import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from twilio.rest import Client
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

# Twilio setup
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
twilio_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
client = Client(account_sid, auth_token)

def send_daily_reminder():
    """Send a proactive message to users"""
    # In reality, fetch from database
    users = ["whatsapp:+1234567890"] 
    
    for user_number in users:
        try:
            message = client.messages.create(
                body="Daily Reminder: Don't forget to log your hours today!",
                from_=twilio_number,
                to=user_number
            )
            print(f"Sent reminder to {user_number}. SID: {message.sid}")
        except Exception as e:
            print(f"Failed to send to {user_number}: {e}")

if __name__ == "__main__":
    # Start the scheduler
    scheduler = BackgroundScheduler()
    
    # Run once a day at 9:00 AM
    scheduler.add_job(send_daily_reminder, 'cron', hour=9, minute=0)
    
    # For testing: run in 10 seconds
    run_date = datetime.now() + timedelta(seconds=10)
    scheduler.add_job(send_daily_reminder, 'date', run_date=run_date)
    
    scheduler.start()
    
    print("Scheduler started. Press Ctrl+C to exit.")
    
    try:
        # Keep the main thread alive
        while True:
            pass
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()`
  },
  {
    id: "chatgpt",
    name: "ChatGPT Integration",
    description: "Forwards user messages to OpenAI API and streams the response back to WhatsApp.",
    code: `import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
import openai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
openai.api_key = os.getenv("OPENAI_API_KEY")

# Simple in-memory memory for conversation context
# In production, use Redis or a database keyed by phone number
conversations = {}

def get_chatgpt_response(sender, message):
    if sender not in conversations:
        conversations[sender] = [
            {"role": "system", "content": "You are a helpful WhatsApp assistant. Keep answers concise."}
        ]
        
    conversations[sender].append({"role": "user", "content": message})
    
    # Keep context window small to save tokens
    if len(conversations[sender]) > 10:
        conversations[sender] = [conversations[sender][0]] + conversations[sender][-9:]
        
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=conversations[sender],
            max_tokens=250
        )
        
        reply = response.choices[0].message.content.strip()
        conversations[sender].append({"role": "assistant", "content": reply})
        return reply
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "Sorry, I'm having trouble thinking right now."

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")
    
    resp = MessagingResponse()
    msg = resp.message()
    
    if incoming_msg.lower() == "/reset":
        conversations[sender] = []
        msg.body("Conversation history cleared.")
    else:
        ai_reply = get_chatgpt_response(sender, incoming_msg)
        msg.body(ai_reply)
        
    return str(resp)

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))`
  }
];

export default function WhatsAppBots() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Bot Templates</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            These templates use the Twilio Messaging API. Since WhatsApp requires business verification for native API access, Twilio is the standard developer path.
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
                filename={`app.py`}
                code={template.code} 
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
