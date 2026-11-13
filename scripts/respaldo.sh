#!/bin/sh
# Respaldo cifrado de la base y los adjuntos.
# Uso: BACKUP_PASSPHRASE=... ./scripts/respaldo.sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$ROOT/respaldos}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST/diario" "$DEST/mensual"
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Defina BACKUP_PASSPHRASE" >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/.env" ]; then
  DATABASE_URL="$(grep '^DATABASE_URL=' "$ROOT/.env" | cut -d= -f2-)"
  export DATABASE_URL
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pg_dump --format=custom --file="$TMP/db.dump" "$DATABASE_URL"
tar -cf "$TMP/adjuntos.tar" -C "$ROOT" uploads 2>/dev/null || tar -cf "$TMP/adjuntos.tar" -T /dev/null
tar -cf - -C "$TMP" db.dump adjuntos.tar | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -out "$DEST/diario/mesa-$STAMP.tar.enc"
find "$DEST/diario" -name 'mesa-*.tar.enc' -mtime +30 -delete
if [ "$(date +%d)" = "01" ] || [ "${FORCE_MENSUAL:-}" = "1" ]; then
  cp "$DEST/diario/mesa-$STAMP.tar.enc" "$DEST/mensual/mesa-$STAMP.tar.enc"
  ls -1t "$DEST/mensual"/mesa-*.tar.enc 2>/dev/null | tail -n +13 | xargs -r rm -f
fi
echo "$DEST/diario/mesa-$STAMP.tar.enc"
