"""
Deteccion automatica de idioma para WhatsApp (Twilio + Flask).

Detecta el idioma del usuario por palabras clave y responde en el mismo
idioma. Soporta espanol, ingles y portugues. Cachea el idioma detectado
por usuario para no re-detectar en cada mensaje.

Uso:
    python bots/whatsapp/auto_language_detect.py
"""

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

from bots.shared.env import get_env
from bots.shared.logger import get_logger

logger = get_logger(__name__)

app = Flask(__name__)

# MODIFICAR: agrega mas idiomas y palabras clave para una deteccion mas precisa.
LANGUAGE_KEYWORDS = {
    "es": ["hola", "gracias", "ayuda", "como", "que", "buenas", "buen dia", "buenas noches"],
    "en": ["hello", "thanks", "help", "how", "what", "good morning", "good night", "hey"],
    "pt": ["ola", "obrigado", "ajuda", "como", "que", "bom dia", "boa tarde"],
}

# MODIFICAR: personaliza las respuestas para cada idioma.
RESPONSES = {
    "es": {
        "greeting": "Hola! Hablo espanol. En que te puedo ayudar?",
        "fallback": "Lo siento, no entendi eso.",
    },
    "en": {
        "greeting": "Hello! I speak English. How can I help you?",
        "fallback": "Sorry, I didn't understand that.",
    },
    "pt": {
        "greeting": "Ola! Eu falo portugues. Como posso ajudar?",
        "fallback": "Desculpe, nao entendi isso.",
    },
}

# MODIFICAR: en produccion guarda esta cache en una DB para no perderla
# al reiniciar el proceso.
user_language_cache: dict[str, str] = {}


def detect_language(text: str) -> str:
    text_lower = text.lower()
    scores = {lang: 0 for lang in LANGUAGE_KEYWORDS}
    for lang, keywords in LANGUAGE_KEYWORDS.items():
        for word in keywords:
            if word in text_lower:
                scores[lang] += 1
    best = max(scores, key=scores.get)
    # MODIFICAR: ajusta el umbral minimo para mayor precision de deteccion.
    return best if scores[best] > 0 else "en"


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming_msg = request.values.get("Body", "").strip()
    sender = request.values.get("From", "")

    detected_lang = user_language_cache.get(sender) or detect_language(incoming_msg)
    user_language_cache[sender] = detected_lang
    logger.info("Idioma detectado para %s: %s", sender, detected_lang)

    resp_dict = RESPONSES.get(detected_lang, RESPONSES["en"])

    resp = MessagingResponse()
    msg = resp.message()
    msg.body(resp_dict["greeting"])

    return str(resp)


if __name__ == "__main__":
    port = int(get_env("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
