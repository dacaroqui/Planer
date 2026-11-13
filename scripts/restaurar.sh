#!/bin/sh
# Restaura un respaldo cifrado en la base indicada por DATABASE_URL.
# Uso: BACKUP_PASSPHRASE=... ./scripts/restaurar.sh respaldos/diario/mesa-XXXX.tar.enc
set -eu
ARCHIVO="${1:?Indique el archivo .tar.enc}"
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Defina BACKUP_PASSPHRASE" >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Defina DATABASE_URL de destino" >&2
  exit 1
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$ARCHIVO" | tar -xf - -C "$TMP"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$TMP/db.dump"
if [ -f "$TMP/adjuntos.tar" ]; then
  tar -xf "$TMP/adjuntos.tar" -C "$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
fi
echo "Restauración terminada en $DATABASE_URL"
