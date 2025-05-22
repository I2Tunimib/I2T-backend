#!/bin/bash
# filepath: deploy.sh

# Exit on error
set -e

echo "=== I2T-Backend Deployment Script ==="

# Change to the project directory if needed
# cd /path/to/I2T-backend

echo "1. Fetching latest changes from git..."
git fetch

echo "2. Pulling latest changes..."
git pull

echo "3. Building Docker containers (no cache)..."
docker compose build --no-cache

echo "4. Stopping current containers..."
docker compose down

echo "5. Starting updated containers..."
docker compose up -d

echo "=== Deployment completed successfully ==="