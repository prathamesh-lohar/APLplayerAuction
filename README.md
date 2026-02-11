# Real-Time Cricket Auction Engine 🏏

A high-speed, WebSocket-driven live auction system for 20 captains to bid on players via mobile devices, with results displayed on a centralized big screen.

## Features

- **Real-time WebSocket Communication**: Sub-second latency using Socket.io
- **Four Client Interfaces**:
  - 🖥️ **Big Screen**: Stadium display with live updates, timer, and animations
  - 📱 **Captain App**: Mobile-first bidding interface with budget tracking
  - ⚙️ **Admin Panel**: Comprehensive auction control and management
  - 👤 **Player Registration**: Self-service portal for players to register with photo upload
- **Smart Bidding Logic**: Safety rule enforcement (Max Bid = Current Purse - Remaining Slots × 5)
- **Auto-SOLD Mechanism**: Automatic player assignment when timer hits zero
- **Team Management**: Support for 20 teams with secure PIN-based authentication
- **Player Database**: CSV bulk upload + individual self-registration with comprehensive stats tracking

## Tech Stack

### Backend
- Node.js & Express
- Socket.io for WebSocket communication
- MongoDB with Mongoose ODM
- CSV parsing with multer

### Frontend
- React for all three interfaces
- Socket.io-client for real-time updates
- Responsive CSS for mobile optimization

## Project Structure

```
IPL/
├── backend/                 # Node.js backend server
│   ├── models/             # MongoDB schemas
│   ├── routes/             # REST API routes
│   ├── socket/             # WebSocket logic
│   ├── config/             # Database config
│   └── server.js           # Main server file
├── big-screen/             # Stadium display React app
├── captain-app/            # Mobile captain interface
├── admin-panel/            # Admin control panel
├── player-registration/    # Player self-registration portal
└── project requirement.txt # Original requirements
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or remote instance)
- npm or yarn

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm start
```

The backend will run on `http://localhost:5000`

### 2. Big Screen Setup

```bash
cd big-screen
npm install
npm start
```

Opens on `http://localhost:3000`

### 3. Captain App Setup

```bash
cd captain-app
npm install
# Edit src/App.js to set SOCKET_URL if needed
npm start
```

Opens on `http://localhost:3001` (or next available port)

### 4. Admin Panel Setup

```bash
cd admin-panel
npm install
npm start
```

Opens on `http://localhost:3002` (or next available port)

### 5. Player Registration Portal Setup

```bash
cd player-registration
npm install
npm start
```

Opens on `http://localhost:3003` (or next available port)

### Quick Start (All Services)

Use the provided startup scripts:

**Mac/Linux:**
```bash
chmod +x start-all.sh
./start-all.sh
```

**Windows:**
```cmd
start-all.bat
```

This will start all services automatically:
- Backend: http://localhost:5001
- Big Screen: http://localhost:3000
- Captain App: http://localhost:3001
- Admin Panel: http://localhost:3002
- Player Registration: http://localhost:3003

## Usage Guide

### Step 1: Admin Setup
1. Open Admin Panel and login (default password: `admin123`)
2. Go to **Settings** tab
3. Option A: Create individual captains using the form (recommended for custom teams)
4. Option B: Click **"Generate 20 Teams"** for bulk creation
5. Save the Team IDs and PINs (shown only once!)

### Step 2: Add Players
**Option A: Player Self-Registration**
1. Share the Player Registration portal (http://localhost:3003)
2. Players fill out the form and upload their photos
3. Admin reviews and approves registrations

**Option B: Bulk CSV Upload**
1. In Admin Panel, go to **Players** tab
2. Click **"Upload CSV"**
3. Upload a CSV file with player data (see sample format below)

### Step 3: Start Auction
1. Captains login using their Team ID and PIN on mobile devices
2. Open Big Screen on the stadium display
3. In Admin Panel, go to **Auction Control** tab
4. Select a player and click **"Start"**
5. Timer begins - captains bid in real-time
6. When timer hits 0, player is auto-sold to highest bidder

### Step 4: Monitor & Control
- View online teams in real-time
- Pause/Resume auction as needed
- Undo sales if necessary
- Track all statistics in dashboard

## Player CSV Format

Create a CSV file with the following columns:

```csv
name,category,basePrice,photo,matches,runs,wickets,average,strikeRate
Virat Kohli,Batsman,15,/players/kohli.jpg,200,7500,0,45.5,138.2
Jasprit Bumrah,Bowler,12,/players/bumrah.jpg,150,450,250,18.2,95.4
Hardik Pandya,All-Rounder,14,/players/pandya.jpg,180,3200,120,32.5,142.8
MS Dhoni,Wicket-Keeper,16,/players/dhoni.jpg,250,5500,0,38.9,125.6
```

**Sample file included**: `sample-players.csv`

## Auction Rules

### Budget System
- **Initial Budget**: 110 Points per team
- **Squad Size**: Exactly 11 players
- **Base Price**: 5 Points minimum per player

### Safety Rule
Maximum allowed bid calculated as:
```
Max Bid = Current Purse - (Remaining Slots × 5)
```

This ensures teams always have enough points to complete their squad.

### Bidding Process
1. Bid increments by 1 point at a time
2. Each valid bid resets timer to 20 seconds
3. Timer countdown continues until reaching 0
4. At 0 seconds, player automatically sold to highest bidder
5. No bids = player marked as UNSOLD

## WebSocket Events

### Client → Server
- `team:login`: Captain authentication
- `bid:place`: Submit a bid
- `admin:startAuction`: Start auction for player
- `admin:pauseAuction`: Pause active auction
- `admin:resumeAuction`: Resume paused auction
- `admin:undoSale`: Rollback a sale

### Server → Client
- `auction:started`: New player auction begins
- `bid:new`: New bid placed (broadcast to all)
- `timer:update`: Timer countdown
- `player:sold`: Player sold notification
- `teams:status`: Team connection updates

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get single player
- `POST /api/players` - Create player
- `POST /api/players/bulk-upload` - CSV upload
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get single team
- `GET /api/teams/:id/qrcode` - Generate QR code for login

### Auction
- `GET /api/auction/state` - Current auction state
- `GET /api/auction/bids/:playerId` - Bid history
- `GET /api/auction/stats` - Auction statistics

### Admin
- `POST /api/admin/generate-teams` - Generate 20 teams
- `POST /api/admin/reset` - Reset auction
- `DELETE /api/admin/clear-all` - Clear all data
- `GET /api/admin/dashboard` - Dashboard data

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cricket-auction
NODE_ENV=development
TIMER_DURATION=20
INITIAL_BUDGET=110
BASE_PRICE=5
MAX_SQUAD_SIZE=11
MAX_CAPTAINS=20
ADMIN_PASSWORD=admin123
```

## Testing Guide

### Local Testing (20 Devices)
1. Connect all devices to same Wi-Fi network
2. Find your local IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
3. Update SOCKET_URL in frontend apps to use local IP
4. Access from mobile browsers: `http://YOUR_IP:3001`

### Stress Testing
- Simulate 20 concurrent users
- Test rapid bidding scenarios
- Verify timer synchronization
- Check network resilience

## Troubleshooting

### MongoDB Connection Failed
```bash
# Start MongoDB
brew services start mongodb-community  # Mac
sudo service mongod start              # Linux
```

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Socket Connection Refused
- Check backend is running
- Verify SOCKET_URL matches backend address
- Check firewall settings for WebSocket connections

## Future Enhancements

- [ ] QR code scanning for quick captain login
- [ ] Video streaming integration for player profiles
- [ ] Advanced analytics and reporting
- [ ] Multiple auction sessions support
- [ ] Player trading between teams
- [ ] Automated highlights generation

## License

MIT License - Feel free to use for your cricket auctions!

## Support

For issues or questions, create an issue in the repository or contact the development team.

---

**Built with ❤️ for cricket enthusiasts**
