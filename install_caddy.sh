#!/usr/bin/env bash
# ============================================
# install_caddy.sh — Instala Caddy + configura HTTPS
# ============================================
# Para Debian/Ubuntu. Requiere sudo.
# Uso: sudo ./install_caddy.sh yourdomain.com

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "ERROR: ejecutar con sudo"
    exit 1
fi

if [ $# -lt 1 ]; then
    echo "Uso: $0 <yourdomain.com>"
    echo "Ejemplo: $0 bot.example.com"
    exit 1
fi

DOMAIN="$1"

# Sanitizar el dominio: solo letras, digitos, puntos y guiones
# Esto previene inyeccion via sed si el dominio tiene caracteres especiales
if ! echo "$DOMAIN" | grep -qE '^[a-zA-Z0-9.-]+$'; then
    echo "ERROR: dominio invalido. Solo letras, digitos, puntos y guiones."
    exit 1
fi
APP_USER="${APP_USER:-pdb}"
APP_DIR="${APP_DIR:-/opt/plantillas-de-bots}"
Caddy_DIR="/etc/caddy"
DATA_DIR="/var/lib/caddy/.local/share/caddy"

echo "[1/5] Instalando paquetes base..."
apt-get update
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl

echo "[2/5] Agregando repo oficial de Caddy..."
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "[3/5] Creando usuario de la app (si no existe)..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /sbin/nologin -d "$APP_DIR" "$APP_USER"
fi
mkdir -p "$APP_DIR" "$DATA_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R caddy:caddy "$DATA_DIR"

echo "[4/5] Configurando Caddyfile para $DOMAIN..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/Caddyfile.bare" "$Caddy_DIR/Caddyfile"
# Reemplazar el dominio de ejemplo con el real
sed -i "s/yourdomain.com/$DOMAIN/g" "$Caddy_DIR/Caddyfile"

# Validar config
caddy validate --config "$Caddy_DIR/Caddyfile" --adapter caddyfile

echo "[5/5] Reiniciando Caddy..."
systemctl enable caddy
systemctl restart caddy

echo
echo "OK. Caddy instalado y configurado para $DOMAIN."
echo "Verificar: curl -I https://$DOMAIN/api/status/health"
echo "Logs: sudo journalctl -u caddy -f"
