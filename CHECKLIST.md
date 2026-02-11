# Pre-Launch Checklist ✅

Use this checklist before running your first live auction to ensure everything is configured correctly.

## 📋 Environment Setup

### Backend
- [ ] MongoDB is installed and running
- [ ] Node.js v14+ is installed
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] `.env` file created from `.env.example`
- [ ] MongoDB URI configured in `.env`
- [ ] Admin password changed from default
- [ ] Backend starts without errors (`npm start`)
- [ ] Health check responds: http://localhost:5000/health

### Frontend Applications
- [ ] Big Screen dependencies installed (`cd big-screen && npm install`)
- [ ] Captain App dependencies installed (`cd captain-app && npm install`)
- [ ] Admin Panel dependencies installed (`cd admin-panel && npm install`)
- [ ] All frontends start successfully
- [ ] No build errors in console

## 🔐 Security

- [ ] Admin password changed from `admin123`
- [ ] CORS configured for production domains (if deploying)
- [ ] `.env` file NOT committed to git
- [ ] `.gitignore` includes `.env` and `node_modules`
- [ ] Strong PINs generated for teams

## 📊 Data Preparation

### Players
- [ ] Player CSV file prepared (or using sample-players.csv)
- [ ] CSV format matches required columns
- [ ] Player photos available (or using placeholders)
- [ ] All player categories valid (Batsman, Bowler, All-Rounder, Wicket-Keeper)
- [ ] Base prices set appropriately

### Teams
- [ ] 20 teams generated via Admin Panel
- [ ] Team PINs saved securely (shown only once!)
- [ ] Team names customized (optional)
- [ ] Captain names updated (optional)

## 🧪 Functional Testing

### Authentication
- [ ] Admin can login with password
- [ ] Captain can login with Team ID + PIN
- [ ] Invalid credentials rejected
- [ ] Multiple captains can login simultaneously
- [ ] Team shows as "online" in admin panel

### Auction Flow
- [ ] Admin can start auction for a player
- [ ] Player appears on Big Screen
- [ ] Player appears in Captain App
- [ ] Timer starts at 20 seconds
- [ ] Timer counts down correctly
- [ ] Captain can place bid
- [ ] Bid appears on Big Screen immediately
- [ ] Timer resets to 20 after valid bid
- [ ] Max bid calculation correct
- [ ] Cannot bid beyond max limit
- [ ] Player auto-sold when timer hits 0
- [ ] SOLD animation plays on Big Screen
- [ ] Team points deducted correctly
- [ ] Squad count incremented
- [ ] Player added to team roster

### Admin Controls
- [ ] Can start auction
- [ ] Can pause auction
- [ ] Can resume auction
- [ ] Can undo sale
- [ ] Online teams display correctly
- [ ] Statistics update in real-time

### Error Handling
- [ ] Invalid bid rejected with message
- [ ] Insufficient points handled
- [ ] Network disconnect recovers gracefully
- [ ] Duplicate bids prevented
- [ ] Timer synchronization maintained

## 🌐 Network Configuration

### Local Network (20 devices)
- [ ] All devices connected to same Wi-Fi
- [ ] Local IP address identified
- [ ] SOCKET_URL updated in frontend apps (if needed)
- [ ] Firewall allows WebSocket connections
- [ ] Router doesn't block internal traffic
- [ ] Big Screen accessible from devices
- [ ] Captain App accessible from mobile devices

### Testing Connections
- [ ] Backend accessible: http://YOUR_IP:5000/health
- [ ] Big Screen loads: http://YOUR_IP:3000
- [ ] Captain App loads: http://YOUR_IP:3001
- [ ] Admin Panel loads: http://YOUR_IP:3002
- [ ] WebSocket connects successfully
- [ ] No CORS errors in browser console

## 📱 Device Preparation

### Big Screen Display
- [ ] Connected to projector/TV
- [ ] Browser in fullscreen mode (F11)
- [ ] Screen doesn't sleep/dim
- [ ] Audio enabled (for future sound effects)
- [ ] Stable connection
- [ ] Refresh page works correctly

### Captain Mobile Devices
- [ ] 20 phones/tablets available
- [ ] All charged and connected to Wi-Fi
- [ ] Modern browsers (Chrome/Safari)
- [ ] Screen brightness adequate
- [ ] Team credentials distributed
- [ ] Test login on all devices

### Admin Device
- [ ] Laptop/desktop with stable connection
- [ ] Multiple monitors (optional but helpful)
- [ ] Mouse and keyboard comfortable
- [ ] All player data ready
- [ ] Backup admin credentials available

## 🎨 Visual Polish

- [ ] Player photos look good on Big Screen
- [ ] Team names are correctly spelled
- [ ] Colors are visible on all devices
- [ ] Fonts are readable from distance (Big Screen)
- [ ] Timer is clearly visible
- [ ] No UI overlapping or layout issues

## 📈 Performance Check

- [ ] Backend responds quickly (<100ms)
- [ ] WebSocket latency acceptable
- [ ] No lag when 20 users connected
- [ ] Timer stays synchronized across devices
- [ ] Rapid bids don't cause issues
- [ ] No memory leaks during extended use
- [ ] CPU usage reasonable

## 🔧 Troubleshooting Prep

- [ ] Backend logs accessible
- [ ] Browser dev tools familiar
- [ ] MongoDB accessible for manual fixes
- [ ] Undo sale functionality tested
- [ ] Reset auction tested
- [ ] Restart procedures documented
- [ ] Backup admin available

## 📚 Documentation

- [ ] Quick start guide printed/available
- [ ] Team credentials document prepared
- [ ] Auction rules explained to captains
- [ ] Admin has access to all docs
- [ ] Technical support contact available

## 🎭 Rehearsal

- [ ] Dry run completed with test team
- [ ] Full auction simulated end-to-end
- [ ] All edge cases tested
- [ ] Timing feels right (20s appropriate)
- [ ] Everyone understands their role
- [ ] Backup plan in place for technical issues

## 🚀 Final Checks (30 min before event)

- [ ] MongoDB running and responsive
- [ ] Backend server started
- [ ] All frontends loaded
- [ ] Big Screen displaying correctly
- [ ] Test login from captain device
- [ ] Place test bid
- [ ] Verify timer and SOLD flow
- [ ] All teams have logged in
- [ ] Admin panel shows all teams online
- [ ] First player ready to start
- [ ] Everyone briefed on process
- [ ] Excitement level: HIGH! 🎉

## 📞 Emergency Contacts

```
Technical Support: ___________________
Database Admin:    ___________________
Backup Admin:      ___________________
IT Support:        ___________________
```

## 🎯 Success Criteria

By the end of the checklist, you should have:
- ✅ All 20 teams online and authenticated
- ✅ Big Screen displaying perfectly
- ✅ Real-time bidding working flawlessly
- ✅ Confidence to run smooth auction
- ✅ Backup plans for common issues

---

## 🎊 You're Ready!

Once all items are checked, you're ready to launch your live cricket auction!

**Final Tips:**
- Keep calm during technical issues
- Use pause functionality if needed
- Communicate clearly with captains
- Have fun - it's a game!
- Take screenshots of memorable moments
- Gather feedback for improvements

**Good luck with your auction! 🏏**

---

*Print this checklist and mark items as you complete them.*
