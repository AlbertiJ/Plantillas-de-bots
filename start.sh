#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  Plantillas de Bots — Reinicio rápido (Mac / Linux)      ║
# ║  Usar DESPUÉS de haber ejecutado setup.sh por primera vez ║
# ║  No reinstala dependencias — solo inicia los servicios    ║
# ╚══════════════════════════════════════════════════════════╝

API_PORT=3001
WEB_PORT=5173
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}🤖 Plantillas de Bots — Inicio rápido${NC}"
echo ""

# ── Iniciar API ───────────────────────────────────────────
echo -e "${CYAN}  Iniciando servidor API en puerto ${API_PORT}...${NC}"
PORT=$API_PORT pnpm --filter @workspace/api-server run dev > /tmp/plantillas-api.log 2>&1 &
API_PID=$!

# ── Esperar que la API esté lista ─────────────────────────
echo -n "  Esperando que la API arranque"
READY=0
for i in $(seq 1 60); do
  if curl -sf "http://localhost:${API_PORT}/api/healthz" >/dev/null 2>&1; then
    READY=1; break
  fi
  echo -n "."; sleep 2
done
echo ""

if [ "$READY" -eq 0 ]; then
  echo -e "${RED}✗ La API no respondió. Revisá: cat /tmp/plantillas-api.log${NC}"
  kill $API_PID 2>/dev/null; exit 1
fi
echo -e "${GREEN}✓${NC} API lista."

# ── Contraseña inicial (si el servidor fue reiniciado perderá la clave) ──
FIRST_RUN_JSON=$(curl -sf "http://localhost:${API_PORT}/api/auth/first-run" 2>/dev/null || echo '{"firstRun":false}')
IS_FIRST=$(echo "$FIRST_RUN_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(String(d.firstRun))")
INIT_PASS=$(echo "$FIRST_RUN_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.password||'')")

# ── Iniciar panel web ─────────────────────────────────────
echo -e "${CYAN}  Iniciando panel web en puerto ${WEB_PORT}...${NC}"
VITE_API_URL="http://localhost:${API_PORT}" PORT=$WEB_PORT \
  pnpm --filter @workspace/bot-templates run dev > /tmp/plantillas-web.log 2>&1 &
WEB_PID=$!
sleep 3

LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   ✅  Servicios corriendo                    ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}     Local:    http://localhost:${WEB_PORT}         ${BOLD}║${NC}"
if [ -n "$LAN_IP" ]; then
echo -e "${BOLD}║${NC}     Network:  http://${LAN_IP}:${WEB_PORT}     ${BOLD}║${NC}"
fi

if [ "$IS_FIRST" = "true" ] && [ -n "$INIT_PASS" ]; then
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}🔑 Usuario: admin | Clave: ${BOLD}${YELLOW}${INIT_PASS}${NC}  ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${YELLOW}⚠  Cambiala desde /admin${NC}                 ${BOLD}║${NC}"
fi

echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo -e "  ${CYAN}Ctrl+C para detener todo${NC}"
echo ""

trap "kill $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $WEB_PID
