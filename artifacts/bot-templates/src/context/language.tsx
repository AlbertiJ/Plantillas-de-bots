import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "es" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  en: {
    appTitle: "Bot Templates",
    navHome: "Home",
    navTelegram: "Telegram Bots",
    navWhatsApp: "WhatsApp Bots",
    navSetup: "Setup Guide",
    navTips: "Best Practices",
    navDeploy: "24/7 Deployment",
    navCredentials: "Credentials",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    langToggle: "ES",

    homeTitle: "Python Bot Templates",
    homeSubtitle: "The fastest way to go from zero to a working Python bot. A developer's cheat sheet that respects your time.",
    homeTelegramTitle: "Telegram Bots",
    homeTelegramDesc: "Templates using the python-telegram-bot library.",
    homeWhatsAppTitle: "WhatsApp Bots",
    homeWhatsAppDesc: "Templates using Twilio API and Flask webhooks.",
    homeFeature1: "Basic Echo & Command bots",
    homeFeature2: "Inline Keyboards & Callbacks",
    homeFeature3: "File downloads & Polls",
    homeWaFeature1: "Flask Webhook integration",
    homeWaFeature2: "Media handling (Images/Docs)",
    homeWaFeature3: "OpenAI / ChatGPT integration",
    homeViewTelegram: "View Telegram Templates",
    homeViewWhatsApp: "View WhatsApp Templates",
    homeChecklist: "Quick Start Checklist",
    homeStep1Title: "1. Environment",
    homeStep1Desc: "Python 3.9+, pip, and an IDE. A virtual environment is highly recommended.",
    homeStep2Title: "2. Credentials",
    homeStep2Desc: "Telegram Bot Token from BotFather, or Twilio Account SID and Auth Token.",
    homeStep3Title: "3. Dependencies",
    homeStep3Desc: "Install the required packages using pip. Check the setup guide for specifics.",
    homeReadSetup: "Read the full setup guide",

    telegramTitle: "Telegram Bot Templates",
    telegramSubtitle: "Production-ready templates using the official python-telegram-bot library v20+. These use the modern async/await syntax.",

    whatsappTitle: "WhatsApp Bot Templates",
    whatsappSubtitle: "These templates use the Twilio Messaging API. Since WhatsApp requires business verification for native API access, Twilio is the standard developer path.",

    setupTitle: "Setup Guides",
    setupSubtitle: "Step-by-step instructions to get your development environment ready for bot building.",
    setupTelegramTitle: "Telegram Setup",
    setupWhatsAppTitle: "WhatsApp (Twilio) Setup",
    setupStep1: "1. Get a Bot Token",
    setupStep2: "2. Install Dependencies",
    setupStep3: "3. Requirements File",
    setupWaStep1: "1. Twilio Sandbox",
    setupWaStep2: "2. Expose Local Server",
    setupWaStep3: "3. Install Dependencies",
    setupWaStep4: "4. Requirements File",
    setupTelegramSteps: "Open Telegram and search for @BotFather|Send the command /newbot|Follow prompts to choose a name and username|BotFather will give you an HTTP API Token. Keep this secret!",
    setupWaSteps: "Create a free Twilio account|Go to Messaging > Try it out > Send a WhatsApp message|Follow instructions to join the Sandbox|Copy your Account SID and Auth Token from the console dashboard",

    tipsTitle: "Best Practices & Tips",
    tipsSubtitle: "Write robust, production-ready bot code.",
    tipsEnvTitle: "Environment Variables",
    tipsEnvDesc: "Never hardcode tokens or API keys in your Python files. Use a .env file and the python-dotenv package.",
    tipsLogTitle: "Logging",
    tipsLogDesc: "Use the built-in logging module instead of print() statements. It provides timestamps, log levels, and can write to files.",
    tipsDeployTitle: "Deployment Options",

    deployTitle: "24/7 Deployment",
    deploySubtitle: "Keep your bots running continuously. This guide covers local testing environments and cloud production setups.",
    deployLocalTitle: "Local Testing Environment",
    deployLocalDesc: "Run your bot on your own machine for development and testing. Everything stays local — no cloud costs.",
    deployCloudTitle: "Cloud Production (24/7)",
    deployCloudDesc: "Deploy to the cloud so your bot runs continuously without your computer being on. Ideal for paid production use.",
    deployDownloadTitle: "Download & Run Locally",
    deployDownloadDesc: "Use this setup to test your bot on your machine before going live.",
    deployProcfileTitle: "Procfile (for Railway/Render/Heroku)",
    deploySystemdTitle: "Linux Systemd Service (VPS)",
    deployDockerTitle: "Docker Container",
    deployRailwayTitle: "Railway (Recommended for Beginners)",
    deployRenderTitle: "Render",
    deployVpsTitle: "VPS with systemd",

    credTitle: "Credential Management",
    credSubtitle: "Your API tokens and keys must NEVER be hardcoded in your Python files. Here's how to manage them securely, both locally and in the cloud.",
    credLocalTitle: "Local Development (.env file)",
    credLocalDesc: "Store secrets in a .env file. This file should NEVER be committed to git.",
    credCloudTitle: "Cloud / Production (Environment Variables)",
    credCloudDesc: "In cloud platforms, set environment variables in their dashboard. Your code reads them the same way.",
    credGitignoreTitle: "Always add .env to .gitignore",
    credLoadTitle: "Loading credentials in Python",
    credRailwayTitle: "Railway / Render / Heroku",
    credVpsTitle: "VPS / Server",

    modifyHint: "MODIFY",
    copyCode: "Copy Code",
    copied: "Copied",
  },
  es: {
    appTitle: "Plantillas de Bots",
    navHome: "Inicio",
    navTelegram: "Bots Telegram",
    navWhatsApp: "Bots WhatsApp",
    navSetup: "Guía de Instalación",
    navTips: "Buenas Prácticas",
    navDeploy: "Despliegue 24/7",
    navCredentials: "Credenciales",
    lightMode: "Modo Claro",
    darkMode: "Modo Oscuro",
    langToggle: "EN",

    homeTitle: "Plantillas de Bots en Python",
    homeSubtitle: "La forma más rápida de pasar de cero a un bot funcional en Python. Una guía de referencia que respeta tu tiempo.",
    homeTelegramTitle: "Bots de Telegram",
    homeTelegramDesc: "Plantillas usando la librería python-telegram-bot.",
    homeWhatsAppTitle: "Bots de WhatsApp",
    homeWhatsAppDesc: "Plantillas usando la API de Twilio y webhooks con Flask.",
    homeFeature1: "Bots de eco y comandos básicos",
    homeFeature2: "Teclados inline y callbacks",
    homeFeature3: "Descarga de archivos y encuestas",
    homeWaFeature1: "Integración de webhook con Flask",
    homeWaFeature2: "Manejo de multimedia (Imágenes/Docs)",
    homeWaFeature3: "Integración con OpenAI / ChatGPT",
    homeViewTelegram: "Ver Plantillas de Telegram",
    homeViewWhatsApp: "Ver Plantillas de WhatsApp",
    homeChecklist: "Lista de Inicio Rápido",
    homeStep1Title: "1. Entorno",
    homeStep1Desc: "Python 3.9+, pip y un IDE. Se recomienda usar un entorno virtual.",
    homeStep2Title: "2. Credenciales",
    homeStep2Desc: "Token del Bot de Telegram desde BotFather, o Account SID y Auth Token de Twilio.",
    homeStep3Title: "3. Dependencias",
    homeStep3Desc: "Instala los paquetes necesarios con pip. Consulta la guía de instalación para más detalles.",
    homeReadSetup: "Leer la guía completa de instalación",

    telegramTitle: "Plantillas de Bots para Telegram",
    telegramSubtitle: "Plantillas listas para producción usando la librería oficial python-telegram-bot v20+. Usan sintaxis moderna async/await.",

    whatsappTitle: "Plantillas de Bots para WhatsApp",
    whatsappSubtitle: "Estas plantillas usan la API de Mensajería de Twilio. Como WhatsApp requiere verificación comercial para acceso nativo a la API, Twilio es el camino estándar para desarrolladores.",

    setupTitle: "Guías de Configuración",
    setupSubtitle: "Instrucciones paso a paso para preparar tu entorno de desarrollo para construir bots.",
    setupTelegramTitle: "Configuración de Telegram",
    setupWhatsAppTitle: "Configuración de WhatsApp (Twilio)",
    setupStep1: "1. Obtener un Token de Bot",
    setupStep2: "2. Instalar Dependencias",
    setupStep3: "3. Archivo de Requisitos",
    setupWaStep1: "1. Sandbox de Twilio",
    setupWaStep2: "2. Exponer el Servidor Local",
    setupWaStep3: "3. Instalar Dependencias",
    setupWaStep4: "4. Archivo de Requisitos",
    setupTelegramSteps: "Abre Telegram y busca @BotFather|Envía el comando /newbot|Sigue las instrucciones para elegir nombre y usuario|BotFather te dará un Token de API HTTP. ¡Mantenlo en secreto!",
    setupWaSteps: "Crea una cuenta gratuita de Twilio|Ve a Mensajería > Pruébalo > Envía un mensaje de WhatsApp|Sigue las instrucciones para unirte al Sandbox|Copia tu Account SID y Auth Token del panel de control",

    tipsTitle: "Buenas Prácticas y Consejos",
    tipsSubtitle: "Escribe código de bot robusto, listo para producción.",
    tipsEnvTitle: "Variables de Entorno",
    tipsEnvDesc: "Nunca escribas tokens o claves API directamente en tus archivos Python. Usa un archivo .env y el paquete python-dotenv.",
    tipsLogTitle: "Logging (Registros)",
    tipsLogDesc: "Usa el módulo logging integrado en lugar de sentencias print(). Proporciona marcas de tiempo, niveles de log y puede escribir en archivos.",
    tipsDeployTitle: "Opciones de Despliegue",

    deployTitle: "Despliegue 24/7",
    deploySubtitle: "Mantén tus bots corriendo continuamente. Esta guía cubre entornos de prueba local y configuraciones de producción en la nube.",
    deployLocalTitle: "Entorno de Prueba Local",
    deployLocalDesc: "Ejecuta tu bot en tu propia máquina para desarrollo y pruebas. Todo se mantiene local — sin costos en la nube.",
    deployCloudTitle: "Producción en la Nube (24/7)",
    deployCloudDesc: "Despliega en la nube para que tu bot corra continuamente sin necesidad de tener tu computadora encendida. Ideal para uso en producción de pago.",
    deployDownloadTitle: "Descargar y Ejecutar Localmente",
    deployDownloadDesc: "Usa esta configuración para probar tu bot en tu máquina antes de ponerlo en producción.",
    deployProcfileTitle: "Procfile (para Railway/Render/Heroku)",
    deploySystemdTitle: "Servicio Systemd de Linux (VPS)",
    deployDockerTitle: "Contenedor Docker",
    deployRailwayTitle: "Railway (Recomendado para Principiantes)",
    deployRenderTitle: "Render",
    deployVpsTitle: "VPS con systemd",

    credTitle: "Gestión de Credenciales",
    credSubtitle: "Tus tokens y claves API NUNCA deben estar escritos directamente en tus archivos Python. Aquí se explica cómo gestionarlos de forma segura, tanto localmente como en la nube.",
    credLocalTitle: "Desarrollo Local (archivo .env)",
    credLocalDesc: "Guarda los secretos en un archivo .env. Este archivo NUNCA debe subirse a git.",
    credCloudTitle: "Nube / Producción (Variables de Entorno)",
    credCloudDesc: "En plataformas en la nube, configura las variables de entorno en su panel de control. Tu código las lee de la misma forma.",
    credGitignoreTitle: "Siempre agrega .env a .gitignore",
    credLoadTitle: "Cargar credenciales en Python",
    credRailwayTitle: "Railway / Render / Heroku",
    credVpsTitle: "VPS / Servidor",

    modifyHint: "MODIFICAR",
    copyCode: "Copiar Código",
    copied: "Copiado",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) || "es";
  });

  const updateLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
  };

  const t = (key: string) => translations[lang][key] ?? translations["en"][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang: updateLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
