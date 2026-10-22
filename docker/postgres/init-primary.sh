#!/usr/bin/env bash
set -e

# ==============================================================================
# PostgreSQL Primary Database Initialization & Replication Setup
# ==============================================================================

REPLICATION_USER=${POSTGRES_REPLICATION_USER:-replicator}
REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD:-replicator_password_replace_in_prod}

echo "Configuring PostgreSQL Primary for streaming replication..."

# 1. Create replication role
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE $REPLICATION_USER WITH REPLICATION LOGIN ENCRYPTED PASSWORD '$REPLICATION_PASSWORD';
EOSQL

# 2. Append replication authentication to pg_hba.conf
echo "host replication $REPLICATION_USER 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

# 3. Optimize postgresql.conf for replication and high concurrency
cat >> "$PGDATA/postgresql.conf" <<EOF
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 512MB
hot_standby = on
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 16MB
maintenance_work_mem = 128MB
max_connections = 200
EOF

echo "PostgreSQL Primary configured successfully."

