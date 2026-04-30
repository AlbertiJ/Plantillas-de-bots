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
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

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
    PYTHON_CMD="$cmd"; break
  fi
done
if [ -z "$PYTHON_CMD" ]; then
  echo -e "${YELLOW}⚠ Python no encontrado — los bots Python no se podrán ejecutar${NC}"
else
  echo -e "${GREEN}✓${NC} $($PYTHON_CMD --version 2>&1)"
fi

echo ""
echo "  Instalando dependencias del panel web..."
pnpm install --silent

if [ -n "$PYTHON_CMD" ]; then
  echo "  Instalando dependencias de los bots Python..."
  "$PYTHON_CMD" -m pip install -r bots/requirements.txt -q 2>/dev/null || true
fi

echo ""
echo -e "${CYAN}  Iniciando servidor API en puerto ${API_PORT}...${NC}"
PORT=$API_PORT pnpm --filter @workspace/api-server run dev > /tmp/plantillas-api.log 2>&1 &
API_PID=$!

# ── Esperar que la API esté lista ─────────────────────────
echo -n "  Esperando que la API compile y arranque"
READY=0
for i in $(seq 1 90); do
  if curl -sf "http://localhost:${API_PORT}/api/healthz" >/dev/null 2>&1; then
    READY=1; break
  fi
  echo -n "."; sleep 2
done
echo ""

if [ "$READY" -eq 0 ]; then
  echo -e "${RED}✗ La API no respondió. Revisá los logs:${NC}"
  echo "  cat /tmp/plantillas-api.log"
  kill $API_PID 2>/dev/null; exit 1
fi
echo -e "${GREEN}✓${NC} API lista."

# ── Obtener estado del primer arranque ────────────────────
FIRST_RUN_JSON=$(curl -sf "http://localhost:${API_PORT}/api/auth/first-run" 2>/dev/null || echo '{"firstRun":false}')
IS_FIRST=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(String(d.firstRun))" "$FIRST_RUN_JSON")
INIT_PASS=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.password||'')" "$FIRST_RUN_JSON")

# ── Iniciar panel web ─────────────────────────────────────
echo ""
echo -e "${CYAN}  Iniciando panel web en puerto ${WEB_PORT}...${NC}"
VITE_API_URL="http://localhost:${API_PORT}" PORT=$WEB_PORT \
  pnpm --filter @workspace/bot-templates run dev > /tmp/plantillas-web.log 2>&1 &
WEB_PID=$!

# Guardar PIDs
echo "API_PID=$API_PID" > /tmp/plantillas-pids.txt
echo "WEB_PID=$WEB_PID" >> /tmp/plantillas-pids.txt

sleep 3

# ── Obtener IP LAN ────────────────────────────────────────
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(ip route get 1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   ✅  Servicios corriendo                             ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}   Panel web — abrí en el navegador:                  ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Local:    ${CYAN}http://localhost:${WEB_PORT}${NC}               ${BOLD}║${NC}"
if [ -n "$LAN_IP" ]; then
echo -e "${BOLD}║${NC}     Network:  ${CYAN}http://${LAN_IP}:${WEB_PORT}${NC}              ${BOLD}║${NC}"
fi
echo -e "${BOLD}║${NC}   API:        http://localhost:${API_PORT}               ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"

if [ "$IS_FIRST" = "true" ] && [ -n "$INIT_PASS" ]; then
echo -e "${BOLD}║${NC}   ${YELLOW}🔑 PRIMER ARRANQUE — credenciales generadas:${NC}         ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Usuario:    ${BOLD}admin${NC}                                  ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Contraseña: ${BOLD}${YELLOW}${INIT_PASS}${NC}                  ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}⚠  El panel te pedirá cambiarla al primer ingreso${NC}   ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
else
echo -e "${BOLD}║${NC}   ${CYAN}ℹ  Ya existe una cuenta configurada.${NC}                 ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     Ingresá con tu contraseña personal.              ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}¿Olvidaste la contraseña? Ejecutá:${NC}                   ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     rm -rf data/credentials/ && ./start.sh           ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
fi

echo -e "${BOLD}║${NC}   Para reiniciar sin reinstalar: ${CYAN}./start.sh${NC}            ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   Logs: /tmp/plantillas-api.log                       ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}          /tmp/plantillas-web.log                      ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${CYAN}Ctrl+C para detener ambos servicios${NC}                  ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

trap "echo ''; echo '  Deteniendo servicios...'; kill $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $WEB_PID
