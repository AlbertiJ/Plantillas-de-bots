# --- Build stage ---
FROM python:3.12-slim AS builder

# Instalar build tools para compilar wheels nativas (bcrypt, psutil)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copiar requirements primero para cachear capas
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# --- Runtime stage ---
FROM python:3.12-slim AS runtime

# Metadata
LABEL maintainer="Juan Alberti <juan.alberti@gba.gob.ar>" \
      version="1.0.1" \
      description="Plantillas de bots - FastAPI panel for Telegram/CTF/OSINT bots"

# Crear usuario no-root (UID 1000)
RUN groupadd -r -g 1000 pdb && \
    useradd -r -u 1000 -g pdb -d /app -s /sbin/nologin pdb

WORKDIR /app

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /home/pdb/.local

# Asegurar que pip/user bin está en PATH y los site-packages son visibles
ENV PATH=/home/pdb/.local/bin:$PATH \
    PYTHONPATH=/home/pdb/.local/lib/python3.12/site-packages \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Copiar el resto del proyecto
COPY --chown=pdb:pdb . /app/

# Crear directorios de datos con permisos correctos
RUN mkdir -p /app/data/credentials /app/data/bots /app/data/activity && \
    chown -R pdb:pdb /app/data

USER pdb

# Exponer el puerto
EXPOSE 8000

# Healthcheck: docker hace GET cada 30s, 3 fallos = restart
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, sys; \
        sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:8000/api/status/health', timeout=3).status == 200 else sys.exit(1)"

# Comando por defecto: arrancar uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
