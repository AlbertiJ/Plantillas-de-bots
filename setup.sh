#!/bin/bash
echo "================================"
echo " Plantillas de Bots en Python"
echo " Setup automatico (Mac / Linux)"
echo "================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js no esta instalado."
    echo "Descargalo desde https://nodejs.org/ e intentá de nuevo."
    exit 1
fi

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Instalando pnpm..."
    npm install -g pnpm
fi

echo "Instalando dependencias..."
pnpm install

echo ""
echo "Iniciando la aplicacion..."
echo "Abri tu navegador en http://localhost:5173"
echo ""
pnpm --filter @workspace/bot-templates run dev
