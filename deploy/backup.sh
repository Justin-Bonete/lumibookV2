#!/usr/bin/env bash
# Nightly backup: database dump + uploaded files. Cron example (as the deploy user):
#   30 2 * * * /srv/lumibook/deploy/backup.sh >> /var/log/lumibook-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . backend/.env; set +a
STAMP=$(date +%F-%H%M); DEST=${BACKUP_DIR:-./backups}; mkdir -p "$DEST"
docker compose -f deploy/docker-compose.yml exec -T db pg_dump -U "$DB_USERNAME" "$DB_DATABASE" | gzip > "$DEST/db-$STAMP.sql.gz"
tar -czf "$DEST/files-$STAMP.tar.gz" -C backend/storage/app private public
find "$DEST" -type f -mtime +14 -delete          # keep 14 days locally
# Copy OFF the server too (a backup on the same disk is not a backup), e.g.:
#   rclone copy "$DEST" remote:lumibook-backups
echo "Backup $STAMP done"
