import React from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";

export default function SetupGuide() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Setup Guides</h1>
          <p className="text-muted-foreground mt-2">
            Step-by-step instructions to get your development environment ready for bot building.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Telegram Column */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2 border-b pb-2">
              Telegram Setup
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">1. Get a Bot Token</h3>
                <ol className="list-decimal list-inside space-y-2 mt-2 text-muted-foreground text-sm">
                  <li>Open Telegram and search for <strong>@BotFather</strong></li>
                  <li>Send the command <code>/newbot</code></li>
                  <li>Follow prompts to choose a name and username</li>
                  <li>BotFather will give you an HTTP API Token. Keep this secret!</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium text-lg">2. Install Dependencies</h3>
                <CodeBlock 
                  language="bash"
                  code={`# Create and activate virtual environment (optional)
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\\Scripts\\activate     # Windows

# Install the library and dotenv
pip install python-telegram-bot[job-queue] python-dotenv`}
                />
              </div>

              <div>
                <h3 className="font-medium text-lg">3. Requirements File</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-2">Save this as <code>requirements.txt</code></p>
                <CodeBlock 
                  filename="requirements.txt"
                  code={`python-telegram-bot[job-queue]==20.7
python-dotenv==1.0.0`}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Column */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2 border-b pb-2">
              WhatsApp (Twilio) Setup
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">1. Twilio Sandbox</h3>
                <ol className="list-decimal list-inside space-y-2 mt-2 text-muted-foreground text-sm">
                  <li>Create a free <a href="https://twilio.com" className="text-primary hover:underline">Twilio</a> account</li>
                  <li>Go to Messaging &gt; Try it out &gt; Send a WhatsApp message</li>
                  <li>Follow instructions to join the Sandbox (send "join {`something`}" to their number)</li>
                  <li>Copy your Account SID and Auth Token from the console dashboard</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium text-lg">2. Expose Local Server</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-2">
                  Twilio needs a public URL to send webhooks to. Use ngrok for local development.
                </p>
                <CodeBlock 
                  language="bash"
                  code={`# In a separate terminal
ngrok http 5000`}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Copy the HTTPS url ngrok provides and paste it into the "When a message comes in" field in your Twilio Sandbox settings, appending <code>/whatsapp</code> to it.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-lg">3. Install Dependencies</h3>
                <CodeBlock 
                  language="bash"
                  code={`pip install flask twilio python-dotenv`}
                />
              </div>

              <div>
                <h3 className="font-medium text-lg">4. Requirements File</h3>
                <CodeBlock 
                  filename="requirements.txt"
                  code={`Flask==3.0.0
twilio==8.11.0
python-dotenv==1.0.0
gunicorn==21.2.0  # For production deployment`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
