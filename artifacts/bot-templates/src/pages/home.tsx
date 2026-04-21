import React from "react";
import { Link } from "wouter";
import { Bot, MessageSquare, ArrowRight, Code, Terminal, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Python Bot Templates
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            The fastest way to go from zero to a working Python bot. A developer's cheat sheet that respects your time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                Telegram Bots
              </CardTitle>
              <CardDescription>
                Templates using the python-telegram-bot library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2"><Code className="h-4 w-4" /> Basic Echo & Command bots</li>
                <li className="flex items-center gap-2"><Code className="h-4 w-4" /> Inline Keyboards & Callbacks</li>
                <li className="flex items-center gap-2"><Code className="h-4 w-4" /> File downloads & Polls</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/telegram">
                <Button className="w-full group" data-testid="link-home-telegram">
                  View Telegram Templates
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                WhatsApp Bots
              </CardTitle>
              <CardDescription>
                Templates using Twilio API and Flask webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2"><Code className="h-4 w-4" /> Flask Webhook integration</li>
                <li className="flex items-center gap-2"><Code className="h-4 w-4" /> Media handling (Images/Docs)</li>
                <li className="flex items-center gap-2"><Code className="h-4 w-4" /> OpenAI / ChatGPT integration</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/whatsapp">
                <Button className="w-full group" data-testid="link-home-whatsapp">
                  View WhatsApp Templates
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-2">Quick Start Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="bg-muted p-3 rounded-full h-fit">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">1. Environment</h3>
                <p className="text-sm text-muted-foreground">Python 3.9+, pip, and an IDE. A virtual environment is highly recommended.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-muted p-3 rounded-full h-fit">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">2. Credentials</h3>
                <p className="text-sm text-muted-foreground">Telegram Bot Token from BotFather, or Twilio Account SID and Auth Token.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-muted p-3 rounded-full h-fit">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">3. Dependencies</h3>
                <p className="text-sm text-muted-foreground">Install the required packages using pip. Check the setup guide for specifics.</p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <Link href="/setup">
              <Button variant="outline" data-testid="link-home-setup">Read the full setup guide</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
