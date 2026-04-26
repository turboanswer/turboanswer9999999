#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  TurboAnswer / Matrix AI — System Health Demo
#  Shows the live health-check endpoint built into the platform.
#  Safe to run anywhere with curl + bash. No credentials needed.
# ─────────────────────────────────────────────────────────────

URL="${1:-https://turboanswer.it.com}"

# colors
G="\033[1;32m"; R="\033[1;31m"; Y="\033[1;33m"; B="\033[1;34m"; D="\033[0;90m"; N="\033[0m"

banner() {
  echo -e "${B}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║         TurboAnswer  —  Live System Health Check             ║"
  echo "║   Built by Tiago (age 11) on Replit · deployed on Azure      ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${N}"
  echo -e "${D}Target:${N} $URL"
  echo
}

ping_endpoint() {
  local label="$1" path="$2"
  printf "  %-22s " "$label"
  local start=$(date +%s%3N)
  local code=$(curl -o /tmp/health.out -s -w "%{http_code}" --max-time 8 "$URL$path" || echo "000")
  local end=$(date +%s%3N)
  local ms=$((end - start))

  if [[ "$code" == "200" ]]; then
    echo -e "${G}✓ HEALTHY${N}  ${D}(${code}, ${ms}ms)${N}"
    if command -v jq >/dev/null 2>&1; then
      sed 's/^/        /' /tmp/health.out | head -c 400
      echo
    fi
  elif [[ "$code" == "000" ]]; then
    echo -e "${R}✗ UNREACHABLE${N}  ${D}(timeout)${N}"
  else
    echo -e "${Y}△ ${code}${N}        ${D}(${ms}ms)${N}"
  fi
}

banner

echo -e "${B}▸ Public liveness probes${N}  ${D}(used by Azure to keep the app awake)${N}"
ping_endpoint "GET /health"   "/health"
ping_endpoint "GET /healthz"  "/healthz"
echo

echo -e "${B}▸ What the admin dashboard checks${N}  ${D}(login-only, /api/admin/system-health)${N}"
cat <<'EOF'
        ┌──────────────────────────────────────────────┐
        │  Database (Neon Postgres) ........  healthy  │
        │  PayPal subscription plans ........ healthy  │
        │  AI service (Claude / Gemini) ..... healthy  │
        │  Memory / heap usage .............. tracked  │
        │  Uptime ........................... live     │
        │  Last 10 errors ................... logged   │
        └──────────────────────────────────────────────┘
        ↳ If any service goes critical, an admin
          notification is auto-created and emailed.
EOF
echo

echo -e "${G}Done.${N}  ${D}Pass a different URL as the first argument to test another deploy:${N}"
echo -e "        ${D}./scripts/demo-health-check.sh https://your-app.example.com${N}"
