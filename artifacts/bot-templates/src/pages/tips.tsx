import React from "react";
import { Layout } from "@/components/layout";
import { CodeBlock } from "@/components/code-block";

export default function Tips() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Best Practices & Tips</h1>
          <p className="text-muted-foreground mt-2">
            Write robust, production-ready bot code.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Environment Variables</h2>
          <p className="text-muted-foreground">
            Never hardcode tokens or API keys in your Python files. Use a <code>.env</code> file and the <code>python-dotenv</code> package.
          </p>
          <CodeBlock 
            filename=".env"
            language="bash"
            code={`TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...`}
          />
          <CodeBlock
            filename="config.py"
            code={`import os
from dotenv import load_load

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_TOKEN:
    raise ValueError("No TELEGRAM_BOT_TOKEN provided")`}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Logging</h2>
          <p className="text-muted-foreground">
            Use the built-in <code>logging</code> module instead of <code>print()</code> statements. It provides timestamps, log levels, and can write to files.
          </p>
          <CodeBlock
            filename="logger.py"
            code={`import logging

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Usage:
logger.info("Bot started successfully")
logger.error("Failed to connect to API")`}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Deployment Options</h2>
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-lg">Railway / Render</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Easiest for polling bots. Just link your GitHub repo and provide a Procfile or python command. Great free tiers.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-lg">VPS (DigitalOcean, Linode)</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Run via systemd or Docker. Provides the most control and cheapest scaling. Requires basic Linux knowledge.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-lg">Serverless (AWS Lambda, Vercel)</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Ideal for Webhook-based bots (like Twilio WhatsApp). Pay only per request. Can have cold start delays.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
