#!/bin/sh
set -e

# Optional: load demo data (idempotent - it skips if the database is already seeded).
if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "Seeding demo data..."
  node dist/database/seed.js
fi

# Migrations run automatically on boot (RUN_MIGRATIONS=true).
exec node dist/main.js
