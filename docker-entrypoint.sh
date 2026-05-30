#!/bin/sh
# Auto-run by nginx:alpine's entrypoint via /docker-entrypoint.d/*.sh.
# Writes /usr/share/nginx/html/config.js from ENV at container start.
# Lets us swap API_BASE_URL (and protocol) without rebuilding the image.
set -eu

: "${API_BASE_URL:=/api}"
: "${APP_ENV:=production}"
: "${ACCESS_TOKEN_TTL_MS:=900000}"
: "${MOCK_MODE:=false}"

CONFIG_PATH="/usr/share/nginx/html/config.js"

cat > "$CONFIG_PATH" <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}",
  APP_ENV: "${APP_ENV}",
  ACCESS_TOKEN_TTL_MS: ${ACCESS_TOKEN_TTL_MS},
  MOCK_MODE: ${MOCK_MODE}
};
EOF

echo "[app-config] Wrote ${CONFIG_PATH}:"
cat "$CONFIG_PATH"
