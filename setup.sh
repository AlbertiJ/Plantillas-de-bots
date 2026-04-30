#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  Plantillas de Bots — Setup automático (Mac / Linux)     ║
# ║  Ejecutar UNA SOLA VEZ. Para reinicios usar: ./start.sh  ║
# ╚══════════════════════════════════════════════════════════╝

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

API_PORT=3001
WEB_PORT=5173

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   🤖  Plantillas de Bots en Python           ║${NC}"
echo -e "${BOLD}║   Setup inicial — Mac / Linux                ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Verificar Node.js ──────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js no está instalado.${NC}"
  echo "  Descargalo desde https://nodejs.org/ (v20 o superior)"
  exit 1
fi
NODE_VER=$(node --version)
echo -e "${GREEN}✓${NC} Node.js ${NODE_VER}"

# ── Verificar / instalar pnpm ─────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "  Instalando pnpm..."
  npm install -g pnpm
fi
echo -e "${GREEN}✓${NC} pnpm $(pnpm --version)"

# ── Verificar Python ──────────────────────────────────────
PYTHON_CMD=""
for cmd in python3 python; do
  if command -v "$cmd" &>/dev/null; then
    PYVER=$("$cmd" --version 2>&1)
    PYTHON_CMD="$cmd"
    break
  fi
done
if [ -z "$PYTHON_CMD" ]; then
  echo -e "${YELLOW}⚠ Python no encontrado — los bots Python no se podrán ejecutar${NC}"
  echo "  Descargalo desde https://python.org/ (v3.11 o superior)"
else
  echo -e "${GREEN}✓${NC} ${PYVER}"
fi

echo ""
echo "  Instalando dependencias del panel web..."
pnpm install --silent

if [ -n "$PYTHON_CMD" ]; then
  echo "  Instalando dependencias de los bots Python..."
  "$PYTHON_CMD" -m pip install -r bots/requirements.txt -q
fi

echo ""
echo -e "${CYAN}  Iniciando servidor API en puerto ${API_PORT}...${NC}"
PORT=$API_PORT pnpm --filter @workspace/api-server run dev > /tmp/plantillas-api.log 2>&1 &
API_PID=$!
echo "  API PID: ${API_PID}"

# ── Esperar que la API esté lista ─────────────────────────
echo -n "  Esperando que la API arranque"
READY=0
for i in $(seq 1 60); do
  if curl -sf "http://localhost:${API_PORT}/api/healthz" >/dev/null 2>&1; then
    READY=1
    break
  fi
  echo -n "."
  sleep 2
done
echo ""

if [ "$READY" -eq 0 ]; then
  echo -e "${RED}✗ La API no respondió en 120 segundos.${NC}"
  echo "  Revisá los logs: cat /tmp/plantillas-api.log"
  kill $API_PID 2>/dev/null
  exit 1
fi
echo -e "${GREEN}✓${NC} API lista."

# ── Obtener contraseña inicial ────────────────────────────
FIRST_RUN_JSON=$(curl -sf "http://localhost:${API_PORT}/api/auth/first-run" 2>/dev/null || echo '{"firstRun":false}')
IS_FIRST=$(echo "$FIRST_RUN_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(String(d.firstRun))")
INIT_PASS=$(echo "$FIRST_RUN_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.password||'')")

# ── Iniciar panel web ─────────────────────────────────────
echo ""
echo -e "${CYAN}  Iniciando panel web en puerto ${WEB_PORT}...${NC}"
VITE_API_URL="http://localhost:${API_PORT}" PORT=$WEB_PORT \
  pnpm --filter @workspace/bot-templates run dev > /tmp/plantillas-web.log 2>&1 &
WEB_PID=$!

# Guardar PIDs para start.sh
echo "API_PID=$API_PID" > /tmp/plantillas-pids.txt
echo "WEB_PID=$WEB_PID" >> /tmp/plantillas-pids.txt

# ── Mostrar banner final ──────────────────────────────────
sleep 3

# Obtener IP LAN
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   ✅  Servicios corriendo                    ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}   Panel web:                                 ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Local:    http://localhost:${WEB_PORT}         ${BOLD}║${NC}"
if [ -n "$LAN_IP" ]; then
echo -e "${BOLD}║${NC}     Network:  http://${LAN_IP}:${WEB_PORT}     ${BOLD}║${NC}"
fi
echo -e "${BOLD}║${NC}   API local:  http://localhost:${API_PORT}         ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"

if [ "$IS_FIRST" = "true" ] && [ -n "$INIT_PASS" ]; then
echo -e "${BOLD}║${NC}   ${YELLOW}🔑 CREDENCIALES DE PRIMER ARRANQUE${NC}          ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Usuario:    ${BOLD}admin${NC}                         ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Contraseña: ${BOLD}${YELLOW}${INIT_PASS}${NC}  ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}⚠  Cambiala desde /admin al primer login${NC}   ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
fi

echo -e "${BOLD}║${NC}   Para reiniciar (sin reinstalar):           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     ${CYAN}./start.sh${NC}                               ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   Logs en: /tmp/plantillas-api.log            ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}             /tmp/plantillas-web.log            ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Mantener el script corriendo (Ctrl+C para detener todo)
trap "echo ''; echo '  Deteniendo servicios...'; kill $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $WEB_PID
