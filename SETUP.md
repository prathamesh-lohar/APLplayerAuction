# Quick Setup Guide 🚀

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js (v14+) installed: `node --version`
- ✅ MongoDB installed and running
- ✅ npm or yarn package manager

## 5-Minute Setup

### Option 1: Automated Setup (Recommended)

**Mac/Linux:**
```bash
./start-all.sh
```

**Windows:**
```bash
start-all.bat
```

This script will:
1. Install all dependencies
2. Start backend server
3. Launch all three frontends
4. Open browser windows automatically

### Option 2: Manual Setup

**Step 1: Start MongoDB**
```bash
# Mac
brew services start mongodb-community

# Linux
sudo service mongod start

# Windows
net start MongoDB
```

**Step 2: Backend**
```bash
cd backend
npm install
npm start
```
Backend runs on http://localhost:5000

**Step 3: Big Screen** (in new terminal)
```bash
cd big-screen
npm install
npm start
```
Opens on http://localhost:3000

**Step 4: Captain App** (in new terminal)
```bash
cd captain-app
npm install
PORT=3001 npm start
```
Opens on http://localhost:3001

**Step 5: Admin Panel** (in new terminal)
```bash
cd admin-panel
npm install
PORT=3002 npm start
```
Opens on http://localhost:3002

## First-Time Configuration

### 1. Admin Login
- Open http://localhost:3002
- Password: `admin123`

### 2. Generate Teams
- Go to **Settings** tab
- Click **"Generate 20 Teams"**
- **IMPORTANT**: Open browser console (F12) and save the Team PINs
- Each team gets a unique ID (TEAM01-TEAM20) and 4-digit PIN

### 3. Upload Players
- Download `sample-players.csv` (or create your own)
- Go to **Players** tab
- Click **"Upload CSV"**
- Select file and upload

### 4. Test the System
- Open http://localhost:3001 on a mobile device (or browser)
- Login with any team (e.g., TEAM01 and its PIN)
- Open http://localhost:3000 for the big screen
- In admin, select a player and click "Start"
- Test bidding on mobile app
- Watch real-time updates on big screen

## Network Setup for Multiple Devices

### Find Your Local IP

**Mac:**
```bash
ipconfig getifaddr en0
```

**Linux:**
```bash
hostname -I
```

**Windows:**
```bash
ipconfig
```
Look for IPv4 Address (e.g., 192.168.1.100)

### Update Frontend Configuration

In each frontend app (`big-screen`, `captain-app`, `admin-panel`), edit `src/App.js`:

```javascript
// Change this:
const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

// To your local IP:
const SOCKET_URL = 'http://192.168.1.100:5000';
const API_URL = 'http://192.168.1.100:5000/api';
```

Then rebuild:
```bash
npm run build
```

### Access from Mobile Devices
- Connect phones to same Wi-Fi
- Open: `http://YOUR_IP:3001`
- Big Screen: `http://YOUR_IP:3000`

## CSV Format for Players

Create a CSV with these columns:

| Column | Type | Required | Example |
|--------|------|----------|---------|
| name | String | Yes | Virat Kohli |
| category | String | Yes | Batsman, Bowler, All-Rounder, Wicket-Keeper |
| basePrice | Number | Yes | 10 |
| photo | String | No | /player.jpg or URL |
| matches | Number | No | 150 |
| runs | Number | No | 5000 |
| wickets | Number | No | 50 |
| average | Number | No | 42.5 |
| strikeRate | Number | No | 135.8 |

**Example:**
```csv
name,category,basePrice,photo,matches,runs,wickets,average,strikeRate
Virat Kohli,Batsman,15,/kohli.jpg,200,7540,0,45.8,138.4
Jasprit Bumrah,Bowler,12,/bumrah.jpg,150,125,248,18.6,98.2
```

Use `sample-players.csv` as reference (50 players included)

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5000    # Windows (find PID, then taskkill /PID xxxx /F)
```

### MongoDB Not Starting
```bash
# Check MongoDB status
brew services list                    # Mac
sudo systemctl status mongod          # Linux
```

### WebSocket Connection Failed
- Ensure backend is running (check http://localhost:5000/health)
- Check browser console for errors
- Verify SOCKET_URL in frontend matches backend address
- Check firewall/antivirus settings

### Teams Not Showing as Online
- Check WebSocket connection in browser dev tools
- Verify team logged in successfully
- Refresh admin panel

### Timer Not Syncing
- All clients must have stable connection
- Check network latency
- Restart backend if timer stuck

## Testing Checklist

- [ ] Backend starts without errors
- [ ] All frontends load successfully
- [ ] Teams can login with PIN
- [ ] Admin can start auction
- [ ] Bids update in real-time on all screens
- [ ] Timer counts down correctly
- [ ] Player auto-sold when timer = 0
- [ ] Team points deducted correctly
- [ ] Big screen shows SOLD animation
- [ ] Recently sold ticker updates
- [ ] Admin can pause/resume
- [ ] Undo sale works correctly

## Production Deployment Tips

1. **Use Environment Variables**
   - Set secure ADMIN_PASSWORD
   - Use production MongoDB URI
   - Configure proper CORS origins

2. **Optimize for Performance**
   - Enable MongoDB indexes
   - Use Redis for session management
   - Implement connection pooling

3. **Security Hardening**
   - Use HTTPS/WSS
   - Implement rate limiting
   - Add input validation
   - Hash PINs (already done with bcrypt)

4. **Monitoring**
   - Log all bid transactions
   - Track WebSocket connections
   - Monitor server resources
   - Set up error alerting

## Getting Help

- Check [README.md](README.md) for full documentation
- Review project requirements in `project requirement.txt`
- Check browser console for errors
- Verify MongoDB logs: `/var/log/mongodb/mongod.log`

## Next Steps

Once setup is complete:
1. Customize team names in Admin panel
2. Add player photos for better visuals
3. Test with actual devices on local network
4. Configure big screen display settings
5. Run stress test with all 20 teams
6. Prepare for live auction event!

---

**Ready to start your auction? Run `./start-all.sh` and let the bidding begin! 🏏**
