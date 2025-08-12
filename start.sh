#!/bin/bash

# KIB Movie Database API - Quick Start Script

echo "🎬 KIB Movie Database API - Quick Start"
echo "========================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found."
    
    # Prompt for TMDB API key
    read -p "Enter your TMDB API key (get it from https://www.themoviedb.org/settings/api): " TMDB_KEY
    
    # Create .env file
    cat > .env << EOF
# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=kib_user
DATABASE_PASSWORD=kib_password
DATABASE_NAME=kib_db

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# TMDB API Configuration
TMDB_API_KEY=$TMDB_KEY
TMDB_BASE_URL=https://api.themoviedb.org/3

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=3600s

# Application Configuration
PORT=8080
NODE_ENV=production
EOF
    
    echo "✅ .env file created with your TMDB API key"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo ""
echo "🐳 Starting Docker containers..."
echo ""

# Start Docker containers
docker-compose up --build -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if [ $(docker-compose ps | grep -c "Up") -ge 3 ]; then
    echo ""
    echo "✅ All services are running!"
    echo ""
    echo "🚀 Application is ready!"
    echo "================================="
    echo "📍 API URL: http://localhost:8080"
    echo "📚 API Documentation: http://localhost:8080/api"
    echo "================================="
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
else
    echo ""
    echo "⚠️  Some services failed to start. Check logs with:"
    echo "docker-compose logs"
fi