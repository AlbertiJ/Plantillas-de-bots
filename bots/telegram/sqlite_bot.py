#!/usr/bin/env python3
"""
sqlite_bot.py — Bot con persistencia SQLite para Telegram
MODIFICAR: agregar más columnas en init_db() y comandos según tus necesidades.
"""
import logging, os, sqlite3
from pathlib import Path
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
DB_PATH = Path(__file__).parent / "bot_data.db"
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)

def init_db():
    # MODIFICAR: agregar tablas o columnas adicionales
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS user_data (
            user_id INTEGER, key TEXT, value TEXT, PRIMARY KEY (user_id, key))""")
        con.commit()

def db_save(uid, key, val):
    with sqlite3.connect(DB_PATH) as con:
        con.execute("INSERT OR REPLACE INTO user_data VALUES (?,?,?)", (uid, key, val))
        con.commit()

def db_get(uid, key):
    with sqlite3.connect(DB_PATH) as con:
        row = con.execute("SELECT value FROM user_data WHERE user_id=? AND key=?", (uid, key)).fetchone()
    return row[0] if row else None

def db_list(uid):
    with sqlite3.connect(DB_PATH) as con:
        return con.execute("SELECT key, value FROM user_data WHERE user_id=?", (uid,)).fetchall()

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "\U0001F5C4 Bot SQLite\n\n/save clave valor\n/get clave\n/list\n/delete clave"
    )

async def save(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if len(ctx.args) < 2:
        await update.message.reply_text("Uso: /save clave valor")
        return
    key, val = ctx.args[0], " ".join(ctx.args[1:])
    db_save(update.effective_user.id, key, val)
    await update.message.reply_text(f"\U0001F4BE Guardado: {key} = {val}")

async def get(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        return
    val = db_get(update.effective_user.id, ctx.args[0])
    await update.message.reply_text(f"{ctx.args[0]} = {val}" if val else f"'{ctx.args[0]}' no encontrado")

async def list_data(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    rows = db_list(update.effective_user.id)
    if not rows:
        await update.message.reply_text("No tenés datos guardados.")
        return
    await update.message.reply_text("\U0001F4CB Datos:\n" + "\n".join(f"- {k}: {v}" for k,v in rows))

async def delete(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        return
    with sqlite3.connect(DB_PATH) as con:
        con.execute("DELETE FROM user_data WHERE user_id=? AND key=?", (update.effective_user.id, ctx.args[0]))
        con.commit()
    await update.message.reply_text(f"\U0001F5D1 Borrado: {ctx.args[0]}")

def main() -> None:
    if not TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    init_db()
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("save", save))
    app.add_handler(CommandHandler("get", get))
    app.add_handler(CommandHandler("list", list_data))
    app.add_handler(CommandHandler("delete", delete))
    app.run_polling()

if __name__ == "__main__":
    main()
