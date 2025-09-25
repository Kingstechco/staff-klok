#!/bin/bash

echo "🚀 Starting StaffClock Pro Backend Setup..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB first."
    echo "   - On macOS: brew services start mongodb/brew/mongodb-community"
    echo "   - On Ubuntu: sudo systemctl start mongod"
    echo "   - On Windows: net start MongoDB"
    exit 1
fi

echo "✅ MongoDB is running"

# Navigate to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment file..."
    cp .env.example .env
    echo "Please edit backend/.env with your configuration before continuing."
    echo "Press any key when ready..."
    read -n 1
fi

# Run database setup
echo "🔧 Setting up database with default users..."
node setup.js

# Start the development server
echo "🌟 Starting development server..."
npm run dev