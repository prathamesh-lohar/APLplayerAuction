const Player = require('../models/Player');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const AuctionState = require('../models/AuctionState');

let auctionTimer = null;
let timerValue = parseInt(process.env.TIMER_DURATION) || 20;

module.exports = (io) => {
  // Store connected clients
  const connectedTeams = new Map();
  const adminSockets = new Set();
  const bigScreenSockets = new Set();

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle team login
    socket.on('team:login', async ({ teamId, pin }) => {
      try {
        const team = await Team.findOne({ teamId });
        
        if (!team) {
          return socket.emit('auth:error', { message: 'Invalid team ID' });
        }

        const isValidPin = await team.comparePin(pin);
        if (!isValidPin) {
          return socket.emit('auth:error', { message: 'Invalid PIN' });
        }

        // Update team status
        team.isOnline = true;
        team.lastActive = new Date();
        await team.save();

        // Store connection
        connectedTeams.set(socket.id, team._id);
        socket.join(`team:${team._id}`);

        // Send team data
        const teamData = await Team.findById(team._id).populate('players');
        socket.emit('auth:success', {
          team: {
            id: teamData._id,
            teamName: teamData.teamName,
            captainName: teamData.captainName,
            remainingPoints: teamData.remainingPoints,
            rosterSlotsFilled: teamData.rosterSlotsFilled,
            maxBid: teamData.getMaxBid(),
            players: teamData.players
          }
        });

        // Notify admin and big screen
        broadcastTeamStatus();

      } catch (error) {
        console.error('Login error:', error);
        socket.emit('auth:error', { message: 'Login failed' });
      }
    });

    // Handle admin login
    socket.on('admin:login', ({ password }) => {
      // Simple password check (in production, use proper auth)
      if (password === process.env.ADMIN_PASSWORD || password === 'admin123') {
        adminSockets.add(socket.id);
        socket.join('admin');
        socket.emit('auth:success', { role: 'admin' });
        
        // Send current auction state
        sendAuctionState(socket);
      } else {
        socket.emit('auth:error', { message: 'Invalid admin password' });
      }
    });

    // Handle big screen connection
    socket.on('bigscreen:connect', () => {
      bigScreenSockets.add(socket.id);
      socket.join('bigscreen');
      socket.emit('connected', { message: 'Big screen connected' });
      
      // Send current auction state
      sendAuctionState(socket);
    });

    // Handle bid placement
    socket.on('bid:place', async ({ amount }) => {
      try {
        const teamId = connectedTeams.get(socket.id);
        if (!teamId) {
          return socket.emit('bid:error', { message: 'Not authenticated' });
        }

        const auctionState = await AuctionState.findOne();
        if (!auctionState || !auctionState.isActive || auctionState.isPaused) {
          return socket.emit('bid:error', { message: 'Auction not active' });
        }

        const team = await Team.findById(teamId);
        const player = await Player.findById(auctionState.currentPlayer);

        if (!player || player.status !== 'IN_AUCTION') {
          return socket.emit('bid:error', { message: 'Player not in auction' });
        }

        // Validate bid amount
        const currentHighBid = auctionState.currentHighBid.amount;
        if (amount <= currentHighBid) {
          return socket.emit('bid:error', { 
            message: `Bid must be higher than ${currentHighBid}` 
          });
        }

        // Validate max bid (Safety Rule)
        const maxBid = team.getMaxBid();
        if (amount > maxBid) {
          return socket.emit('bid:error', { 
            message: `Maximum allowed bid is ${maxBid}` 
          });
        }

        // Check if team has enough points
        if (amount > team.remainingPoints) {
          return socket.emit('bid:error', { 
            message: 'Insufficient points' 
          });
        }

        // Atomically update auction state if this bid is still higher than current high bid
        const updatedAuctionState = await AuctionState.findOneAndUpdate(
          {
            _id: auctionState._id,
            currentPlayer: auctionState.currentPlayer,
            'currentHighBid.amount': { $lt: amount }
          },
          {
            $set: {
              currentHighBid: {
                amount: amount,
                team: team._id
              },
              lastBidAt: new Date()
            }
          },
          { new: true }
        );

        if (!updatedAuctionState) {
          return socket.emit('bid:error', { message: 'Bid must be higher than current high bid' });
        }

        const bid = new Bid({
          player: player._id,
          team: team._id,
          amount: amount,
          isWinning: false
        });
        
        // Record bid after successful atomic state update
        await bid.save();

        // Keep in-memory auctionState in sync with database
        auctionState.currentHighBid = updatedAuctionState.currentHighBid;
        auctionState.lastBidAt = updatedAuctionState.lastBidAt;

        // Reset timer
        resetTimer(io);

        // Broadcast bid to all clients
        const bidData = {
          amount: amount,
          teamName: team.teamName,
          teamId: team._id,
          timestamp: new Date()
        };

        io.emit('bid:new', bidData);
        socket.emit('bid:success', bidData);

      } catch (error) {
        console.error('Bid error:', error);
        socket.emit('bid:error', { message: 'Failed to place bid' });
      }
    });

    // Admin controls
    socket.on('admin:startAuction', async ({ playerId }) => {
      if (!adminSockets.has(socket.id)) {
        return socket.emit('error', { message: 'Unauthorized' });
      }

      try {
        const player = await Player.findById(playerId);
        if (!player || player.status === 'SOLD') {
          return socket.emit('error', { message: 'Player not available' });
        }

        // Update player status
        player.status = 'IN_AUCTION';
        await player.save();

        // Get or create auction state
        let auctionState = await AuctionState.findOne();
        if (!auctionState) {
          auctionState = new AuctionState();
        }

        auctionState.currentPlayer = player._id;
        auctionState.isActive = true;
        auctionState.isPaused = false;
        auctionState.currentHighBid = {
          amount: player.basePrice,
          team: null
        };
        auctionState.auctionStartedAt = new Date();
        await auctionState.save();

        // Start timer
        startTimer(io);

        // Broadcast to all clients
        const playerData = await Player.findById(playerId);
        io.emit('auction:started', {
          player: playerData,
          basePrice: player.basePrice,
          timerValue: timerValue
        });

      } catch (error) {
        console.error('Start auction error:', error);
        socket.emit('error', { message: 'Failed to start auction' });
      }
    });

    socket.on('admin:pauseAuction', async () => {
      if (!adminSockets.has(socket.id)) return;

      try {
        const auctionState = await AuctionState.findOne();
        if (auctionState) {
          auctionState.isPaused = true;
          await auctionState.save();
          stopTimer();
          io.emit('auction:paused');
        }
      } catch (error) {
        console.error('Pause error:', error);
      }
    });

    socket.on('admin:resumeAuction', async () => {
      if (!adminSockets.has(socket.id)) return;

      try {
        const auctionState = await AuctionState.findOne();
        if (auctionState && auctionState.isPaused) {
          auctionState.isPaused = false;
          await auctionState.save();
          startTimer(io);
          io.emit('auction:resumed');
        }
      } catch (error) {
        console.error('Resume error:', error);
      }
    });

    socket.on('admin:undoSale', async ({ playerId }) => {
      if (!adminSockets.has(socket.id)) return;

      try {
        const player = await Player.findById(playerId);
        if (!player || player.status !== 'SOLD') {
          return socket.emit('error', { message: 'Cannot undo this sale' });
        }

        const team = await Team.findById(player.soldTo);
        if (team) {
          // Restore team points
          team.remainingPoints += player.soldPrice;
          team.rosterSlotsFilled -= 1;
          team.players = team.players.filter(p => p.toString() !== player._id.toString());
          await team.save();
        }

        // Reset player
        player.status = 'UNSOLD';
        player.soldTo = null;
        player.soldPrice = null;
        player.soldAt = null;
        await player.save();

        // Delete bids
        await Bid.deleteMany({ player: player._id });

        io.emit('sale:undone', { player, team });

      } catch (error) {
        console.error('Undo error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Handle team disconnect
      const teamId = connectedTeams.get(socket.id);
      if (teamId) {
        try {
          await Team.findByIdAndUpdate(teamId, { 
            isOnline: false,
            lastActive: new Date()
          });
          connectedTeams.delete(socket.id);
          broadcastTeamStatus();
        } catch (error) {
          console.error('Disconnect error:', error);
        }
      }

      // Handle admin disconnect
      if (adminSockets.has(socket.id)) {
        adminSockets.delete(socket.id);
      }

      // Handle big screen disconnect
      if (bigScreenSockets.has(socket.id)) {
        bigScreenSockets.delete(socket.id);
      }
    });
  });

  // Timer functions
  function startTimer(io) {
    stopTimer(); // Clear any existing timer
    timerValue = parseInt(process.env.TIMER_DURATION) || 10;

    auctionTimer = setInterval(async () => {
      timerValue--;
      
      // Broadcast timer update
      io.emit('timer:update', { value: timerValue });

      // Timer hit zero - auto SOLD
      if (timerValue <= 0) {
        await handleAutoSold(io);
      }
    }, 1000);
  }

  function stopTimer() {
    if (auctionTimer) {
      clearInterval(auctionTimer);
      auctionTimer = null;
    }
  }

  function resetTimer(io) {
    timerValue = parseInt(process.env.TIMER_DURATION) ||10;
    io.emit('timer:reset', { value: timerValue });
  }

  async function handleAutoSold(io) {
    stopTimer();

    try {
      const auctionState = await AuctionState.findOne()
        .populate('currentPlayer')
        .populate('currentHighBid.team');

      if (!auctionState || !auctionState.currentPlayer) return;

      const player = auctionState.currentPlayer;
      const winningTeam = auctionState.currentHighBid.team;
      const soldPrice = auctionState.currentHighBid.amount;

      if (winningTeam) {
        // Update player
        player.status = 'SOLD';
        player.soldTo = winningTeam._id;
        player.soldPrice = soldPrice;
        player.soldAt = new Date();
        await player.save();

        // Update team
        winningTeam.remainingPoints -= soldPrice;
        winningTeam.rosterSlotsFilled += 1;
        winningTeam.players.push(player._id);
        await winningTeam.save();

        // Update recently sold
        auctionState.recentlySold.unshift({
          player: player._id,
          team: winningTeam._id,
          amount: soldPrice,
          soldAt: new Date()
        });
        if (auctionState.recentlySold.length > 10) {
          auctionState.recentlySold = auctionState.recentlySold.slice(0, 10);
        }
      } else {
        // No bids - mark unsold
        player.status = 'UNSOLD';
        await player.save();
      }

      // Reset auction state
      auctionState.isActive = false;
      auctionState.currentPlayer = null;
      auctionState.currentHighBid = { amount: 5, team: null };
      await auctionState.save();

      // Broadcast SOLD event
      io.emit('player:sold', {
        player: player,
        team: winningTeam ? {
          id: winningTeam._id,
          teamName: winningTeam.teamName
        } : null,
        amount: soldPrice
      });

      // Update team status
      broadcastTeamStatus();

    } catch (error) {
      console.error('Auto-sold error:', error);
    }
  }

  async function broadcastTeamStatus() {
    try {
      const teams = await Team.find().select('-pin');
      io.emit('teams:status', { teams });
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  }

  async function sendAuctionState(socket) {
    try {
      const auctionState = await AuctionState.findOne()
        .populate('currentPlayer')
        .populate('currentHighBid.team')
        .populate('recentlySold.player')
        .populate('recentlySold.team');

      socket.emit('auction:state', {
        state: auctionState,
        timerValue: timerValue
      });
    } catch (error) {
      console.error('Send state error:', error);
    }
  }
};
