#!/bin/bash

# Script to run migrations and seeds for trading platform
# Usage: ./run-migration-and-seed.sh

set -e

echo "========================================="
echo "Trading Platform - Database Setup"
echo "========================================="

# Load environment variables
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-tradingengine}
DB_USERNAME=${DB_USERNAME:-trading}
DB_PASSWORD=${DB_PASSWORD:-trading_dev}

echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USERNAME"
echo ""

# Function to run SQL file
run_sql() {
    local file=$1
    echo "Running: $file"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -f "$file"
}

echo "========================================="
echo "Step 1: Running Migration 010"
echo "========================================="
run_sql "migrations/010_create_trading_pairs_table.sql"

echo ""
echo "========================================="
echo "Step 2: Running Seeds"
echo "========================================="
run_sql "seeds/004_trading_pairs.sql"
run_sql "seeds/005_candles.sql"

echo ""
echo "========================================="
echo "✅ Database setup completed!"
echo "========================================="
echo ""
echo "You can now:"
echo "  - Start the API: pnpm dev (from apps/api)"
echo "  - Check pairs: curl http://localhost:6868/api/pairs"
echo ""
