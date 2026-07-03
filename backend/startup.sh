#!/bin/bash
set -e

echo "Running Prisma generate..."
npx prisma generate

echo "Waiting for database connection..."
for i in $(seq 1 30); do
  if npx prisma db push --accept-data-loss 2>/dev/null; then
    echo "Database connected and schema pushed!"
    break
  fi
  echo "Attempt $i: Database not ready yet, retrying in 2s..."
  sleep 2
done

echo "Running seed..."
npx tsx prisma/seed.ts

echo "Starting server..."
npx tsx src/index.ts
