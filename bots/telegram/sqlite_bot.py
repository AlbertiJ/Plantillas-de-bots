#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot con Base de Datos SQLite – Telegram
========================================
Persiste datos de usuarios en una base de datos SQLite local.
Ideal como plantilla para bots que necesitan guardar información.

Instalación:
    pip install python-telegram-bot python-dotenv

Variables de entorno (.env):
    TELEGRAM_BOT_TOKEN  – Token del bot (obligatorio)
    DB_PATH             – Ruta de la base de datos (default: data/bot.db)
"""

import os
import sqlite3
import logging
from pathlib import Path
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

# ── MODIFICAR ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")  # MODIFICAR: pegá tu token
DB_PATH = os.getenv("DB_PATH", "data/bot.db")              # MODIFICAR: ruta de la base de datos
# ───────────────────────────────────────────────────────────────────────────────

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS user_data (
        user_id INTEGER NOT NULL,
        key     TEXT    NOT NULL,
        value   TEXT    NOT NULL,
        PRIMARY KEY (user_id, key)
    )""")
    conn.commit()
    return conn


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🗄️ Bot SQLite activo.\n\n"
        "Comandos:\n"
        "/save <clave> <valor> – Guardar un valor\n"
        "/get <clave>          – Recuperar un valor\n"
        "/list                 – Ver todos tus datos\n"
        "/delete <clave>       – Eliminar un valor\n"
        f"\nBase de datos: {DB_PATH}"
    )


async def cmd_save(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Guarda un par clave-valor. Uso: /save nombre Juan"""
    if not ctx.args or len(ctx.args) < 2:
        await update.message.reply_text("Uso: /save <clave> <valor>")
        return
    key = ctx.args[0]
    value = " ".join(ctx.args[1:])
    user_id = update.effective_user.id
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO user_data (user_id, key, value) VALUES (?, ?, ?)",
            (user_id, key, value)
        )
    await update.message.reply_text(f"✅ Guardado: {key} = {value}")


async def cmd_get(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Recupera un valor. Uso: /get nombre"""
    if not ctx.args:
        await update.message.reply_text("Uso: /get <clave>")
        return
    key = ctx.args[0]
    user_id = update.effective_user.id
    with get_conn() as conn:
        row = conn.execute(
            "SELECT value FROM user_data WHERE user_id=? AND key=?", (user_id, key)
        ).fetchone()
    if row:
        await update.message.reply_text(f"🔍 {key} = {row['value']}")
    else:
        await update.message.reply_text(f"No se encontró la clave '{key}'.")


async def cmd_list(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Lista todos los datos del usuario."""
    user_id = update.effective_user.id
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT key, value FROM user_data WHERE user_id=?", (user_id,)
        ).fetchall()
    if not rows:
        await update.message.reply_text("No tenés datos guardados.")
        return
    lines = [f"• {r['key']}: {r['value']}" for r in rows]
    await update.message.reply_text("📋 Tus datos:\n" + "\n".join(lines))


async def cmd_delete(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Elimina un valor. Uso: /delete nombre"""
    if not ctx.args:
        await update.message.reply_text("Uso: /delete <clave>")
        return
    key = ctx.args[0]
    user_id = update.effective_user.id
    with get_conn() as conn:
        changed = conn.execute(
            "DELETE FROM user_data WHERE user_id=? AND key=?", (user_id, key)
        ).rowcount
    if changed:
        await update.message.reply_text(f"🗑️ '{key}' eliminado.")
    else:
        await update.message.reply_text(f"No se encontró '{key}'.")


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("ERROR: Definí TELEGRAM_BOT_TOKEN en el archivo .env")
        return
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("save", cmd_save))
    app.add_handler(CommandHandler("get", cmd_get))
    app.add_handler(CommandHandler("list", cmd_list))
    app.add_handler(CommandHandler("delete", cmd_delete))
    print(f"SQLite Bot iniciado. Base de datos: {DB_PATH}")
    app.run_polling()


if __name__ == "__main__":
    main()
