#!/bin/bash

echo "🏏 Cricket Auction Engine - Quick Start"
echo "======================================"
echo ""

# Check if MongoDB is running
echo "Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running!"
    echo "Please start MongoDB first:"
    echo "  Mac: brew services start mongodb-community"
    echo "  Linux: sudo service mongod start"
    echo ""
    read -p "Press Enter after starting MongoDB..."
fi

# Start backend
echo "Starting backend server..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Start backend in background
npm start &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
cd ..

# Wait for backend to be ready
echo "Waiting for backend to initialize..."
sleep 5

# Start Big Screen
echo "Starting Big Screen..."
cd big-screen
if [ ! -d "node_modules" ]; then
    echo "Installing big-screen dependencies..."
    npm install
fi
npm start &
BIG_SCREEN_PID=$!
echo "✅ Big Screen started (PID: $BIG_SCREEN_PID)"
cd ..

sleep 3

# Start Captain App
echo "Starting Captain App..."
cd captain-app
if [ ! -d "node_modules" ]; then
    echo "Installing captain-app dependencies..."
    npm install
fi
PORT=3001 npm start &
CAPTAIN_PID=$!
echo "✅ Captain App started (PID: $CAPTAIN_PID)"
cd ..

sleep 3

# Start Admin Panel
echo "Starting Admin Panel..."
cd admin-panel
if [ ! -d "node_modules" ]; then
    echo "Installing admin-panel dependencies..."
    npm install
fi
PORT=3002 npm start &
ADMIN_PID=$!
echo "✅ Admin Panel started (PID: $ADMIN_PID)"
cd ..

sleep 3

# Start Player Registration
echo "Starting Player Registration..."
cd player-registration
if [ ! -d "node_modules" ]; then
    echo "Installing player-registration dependencies..."
    npm install
fi
PORT=3003 npm start &
PLAYER_REG_PID=$!
echo "✅ Player Registration started (PID: $PLAYER_REG_PID)"
cd ..

echo ""
echo "======================================"
echo "🎉 All services started successfully!"
echo "======================================"
echo ""
echo "📱 Access URLs:"
echo "  Backend:             http://localhost:5001"
echo "  Big Screen:          http://localhost:3000"
echo "  Captain App:         http://localhost:3001"
echo "  Admin Panel:         http://localhost:3002"
echo "  Player Registration: http://localhost:3003"
echo ""
echo "🔐 Admin Login: admin123"
echo ""
echo "To stop all services, press Ctrl+C"
echo ""

# Wait for user interrupt
wait
