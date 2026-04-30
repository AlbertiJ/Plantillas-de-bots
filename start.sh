#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  Plantillas de Bots — Reinicio rápido (Mac / Linux)      ║
# ║  Usar DESPUÉS de haber ejecutado setup.sh por primera vez ║
# ╚══════════════════════════════════════════════════════════╝

API_PORT=3001
WEB_PORT=5173
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Carpeta de logs local ──────────────────────────────────────────────────────
mkdir -p logs
LOG_API="./logs/api.log"
LOG_WEB="./logs/web.log"
LOG_PIDS="./logs/.pids"

echo ""
echo -e "${BOLD}🤖 Plantillas de Bots — Inicio rápido${NC}"
echo ""

# ── Detener procesos anteriores si existen ─────────────────────────────────────
if [ -f "$LOG_PIDS" ]; then
  OLD_API=$(grep "API_PID=" "$LOG_PIDS" | cut -d= -f2)
  OLD_WEB=$(grep "WEB_PID=" "$LOG_PIDS" | cut -d= -f2)
  kill "$OLD_API" "$OLD_WEB" 2>/dev/null && echo "  Procesos anteriores detenidos." || true
fi

echo -e "${CYAN}  Iniciando servidor API en puerto ${API_PORT}...${NC}"
PORT=$API_PORT pnpm --filter @workspace/api-server run dev > "$LOG_API" 2>&1 &
API_PID=$!

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
  echo "  cat $LOG_API"
  kill $API_PID 2>/dev/null; exit 1
fi
echo -e "${GREEN}✓${NC} API lista."

FIRST_RUN_JSON=$(curl -sf "http://localhost:${API_PORT}/api/auth/first-run" 2>/dev/null || echo '{"firstRun":false}')
IS_FIRST=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(String(d.firstRun))" "$FIRST_RUN_JSON")
INIT_PASS=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.password||'')" "$FIRST_RUN_JSON")

echo -e "${CYAN}  Iniciando panel web en puerto ${WEB_PORT}...${NC}"
VITE_API_URL="http://localhost:${API_PORT}" PORT=$WEB_PORT \
  pnpm --filter @workspace/bot-templates run dev > "$LOG_WEB" 2>&1 &
WEB_PID=$!

echo "API_PID=$API_PID" > "$LOG_PIDS"
echo "WEB_PID=$WEB_PID" >> "$LOG_PIDS"

sleep 3

LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(ip route get 1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   ✅  Servicios corriendo                             ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}     Local:    ${CYAN}http://localhost:${WEB_PORT}${NC}               ${BOLD}║${NC}"
if [ -n "$LAN_IP" ]; then
echo -e "${BOLD}║${NC}     Network:  ${CYAN}http://${LAN_IP}:${WEB_PORT}${NC}              ${BOLD}║${NC}"
fi

if [ "$IS_FIRST" = "true" ] && [ -n "$INIT_PASS" ]; then
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}🔑 Usuario: admin | Clave: ${BOLD}${YELLOW}${INIT_PASS}${NC}   ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}⚠  Cambiala desde /admin${NC}                          ${BOLD}║${NC}"
else
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}   Ingresá con tu contraseña personal.              ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}¿Olvidaste la contraseña?${NC}                          ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}     rm -rf data/credentials/ && ./start.sh           ${BOLD}║${NC}"
fi

echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}   Logs: ${CYAN}./logs/api.log${NC}  /  ${CYAN}./logs/web.log${NC}         ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${CYAN}Ctrl+C para detener todo${NC}                           ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

trap "kill $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $WEB_PID
