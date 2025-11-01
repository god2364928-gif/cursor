#!/bin/bash

# Add file tables to Railway database
# Usage: ./add-file-tables-to-railway.sh

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed"
    exit 1
fi

# Read DATABASE_URL from .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env file"
    exit 1
fi

echo "Adding file tables to Railway database..."
echo "Database URL: ${DATABASE_URL//password=*/password=***}"

# Execute SQL file
psql "$DATABASE_URL" -f cursor/server/database/add-file-tables.sql

if [ $? -eq 0 ]; then
    echo "File tables added successfully!"
else
    echo "Error adding file tables"
    exit 1
fi

