#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

if [ ! -f .next/standalone/server.js ]; then
  echo "No está el build. Ejecute npm run build." >&2
  exit 1
fi

if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -a public .next/standalone/public
fi
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -a .next/static .next/standalone/.next/static

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
exec node .next/standalone/server.js
