#!/usr/bin/env bash
set -e

# ==============================================================================
# PostgreSQL Read Replica Initialization
# Pulls initial basebackup from Primary and sets up standby replication
# ==============================================================================

PRIMARY_HOST=${POSTGRES_PRIMARY_HOST:-postgres_primary}
PRIMARY_PORT=${POSTGRES_PRIMARY_PORT:-5432}
REPLICATION_USER=${POSTGRES_REPLICATION_USER:-replicator}
PGPASSWORD=${POSTGRES_REPLICATION_PASSWORD:-replicator_password_replace_in_prod}
export PGPASSWORD

echo "Waiting for primary database at $PRIMARY_HOST:$PRIMARY_PORT to be ready..."
until pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$REPLICATION_USER"; do
    sleep 2
done

# If data directory is empty, run basebackup
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Running pg_basebackup from primary..."
    rm -rf "$PGDATA"/*
    pg_basebackup -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$REPLICATION_USER" -D "$PGDATA" -Fp -Xs -R
    chmod 0700 "$PGDATA"
    echo "Basebackup complete. Read replica ready."
fi

exec "$@"

