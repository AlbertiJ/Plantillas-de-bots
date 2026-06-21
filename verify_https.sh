#!/usr/bin/env bash
# ============================================
# verify_https.sh — Verifica que HTTPS funcione end-to-end
# ============================================
# Uso: ./verify_https.sh https://bot.example.com

set -uo pipefail

URL="${1:-https://localhost}"

echo "Verificando $URL ..."
echo

# 1. Health check
echo -n "[1/4] GET /api/status/health ... "
status=$(curl -ks -o /dev/null -w "%{http_code}" "$URL/api/status/health")
if [ "$status" = "200" ]; then
    echo "OK (200)"
else
    echo "FAIL ($status)"
    exit 1
fi

# 2. HTTP -> HTTPS redirect
echo -n "[2/4] HTTP -> HTTPS redirect ... "
http_url=$(echo "$URL" | sed 's|https://|http://|')
location=$(curl -ks -o /dev/null -D - "$http_url/api/status/health" | grep -i "^location:" | tr -d '\r' | awk '{print $2}')
if [ -n "$location" ] && [[ "$location" == https://* ]]; then
    echo "OK (redirect a $location)"
else
    echo "FAIL (no redirect)"
    exit 1
fi

# 3. Cert TLS valido
echo -n "[3/4] Cert TLS ... "
cert_subject=$(echo | openssl s_client -connect "$(echo $URL | sed 's|https://||' | cut -d: -f1):443" -servername "$(echo $URL | sed 's|https://||' | cut -d/ -f1)" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null)
if [ -n "$cert_subject" ]; then
    echo "OK ($cert_subject)"
else
    echo "FAIL (no cert)"
    exit 1
fi

# 4. Headers de seguridad
echo -n "[4/4] Security headers ... "
headers=$(curl -ks -D - -o /dev/null "$URL/api/status/health")
missing=""
for h in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options"; do
    if ! echo "$headers" | grep -qi "^$h:"; then
        missing="$missing $h"
    fi
done
if [ -z "$missing" ]; then
    echo "OK (HSTS, X-Content-Type-Options, X-Frame-Options presentes)"
else
    echo "FAIL (faltan:$missing)"
    exit 1
fi

echo
echo "HTTPS OK."
