const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const TEAM_SIZE = 11;
const STARTING_POINTS = 110;
const BASE_PLAYER_COST = 8;
const MAX_CAPTAINS = 6;

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'auction.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const state = {
  phase: 'setup',
  players: [],
  captains: [],
  auctionQueue: [],
  currentAuctionPlayerId: null,
  currentBid: null,
  lockedCaptains: [],
  messages: []
};

const clients = new Set();

const columnExists = (tableName, columnName) => {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => row.name === columnName);
};

const migrate = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS captains (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT ${STARTING_POINTS}
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      city TEXT NOT NULL,
      achievements TEXT NOT NULL DEFAULT '',
      photo_data TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      captain_id TEXT,
      player_id TEXT,
      FOREIGN KEY(captain_id) REFERENCES captains(id),
      FOREIGN KEY(player_id) REFERENCES players(id)
    );
  `);

  if (!columnExists('users', 'player_id')) {
    db.exec('ALTER TABLE users ADD COLUMN player_id TEXT');
  }

  const adminExists = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin');
  if (!adminExists) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
  }

  const playerCount = db.prepare('SELECT COUNT(*) AS count FROM players').get().count;
  if (playerCount === 0) {
    const insert = db.prepare('INSERT INTO players (id, name, role, city, achievements, photo_data) VALUES (?, ?, ?, ?, ?, ?)');
    [
      ['P1', 'Anil', 'All-Rounder', 'Pune'],
      ['P2', 'Digamber', 'Bowler', 'Mumbai'],
      ['P3', 'Rajat', 'Batter', 'Nagpur'],
      ['P4', 'Rohit', 'Wicketkeeper', 'Nashik']
    ].forEach((row) => insert.run(row[0], row[1], row[2], row[3], '', ''));
  }
};

const readNumericSuffix = (id) => Number(id.replace(/^[A-Z]/, '')) || 0;

const hydrateState = () => {
  state.captains = db.prepare('SELECT id, name, points FROM captains ORDER BY id').all().map((c) => ({
    ...c,
    directPlayers: [],
    auctionPlayers: []
  }));

  state.players = db.prepare('SELECT id, name, role, city, achievements, photo_data FROM players ORDER BY name').all().map((p) => ({
    ...p,
    selectedBy: [],
    auctionAttempts: 0
  }));

  state.phase = 'setup';
  state.auctionQueue = [];
  state.currentAuctionPlayerId = null;
  state.currentBid = null;
  state.lockedCaptains = [];
};

const nextCaptainId = () => {
  const ids = db.prepare('SELECT id FROM captains').all().map((row) => readNumericSuffix(row.id));
  return `C${(ids.length ? Math.max(...ids) : 0) + 1}`;
};

const nextPlayerId = () => {
  const ids = db.prepare('SELECT id FROM players').all().map((row) => readNumericSuffix(row.id));
  return `P${(ids.length ? Math.max(...ids) : 0) + 1}`;
};

const isAssigned = (playerId) => state.captains.some((c) => c.directPlayers.includes(playerId) || c.auctionPlayers.includes(playerId));
const findCaptain = (captainId) => state.captains.find((c) => c.id === captainId);
const findPlayer = (playerId) => state.players.find((p) => p.id === playerId);
const teamNeeds = (captain) => TEAM_SIZE - (captain.directPlayers.length + captain.auctionPlayers.length);

const maxAllowedBid = (captain) => {
  const needed = teamNeeds(captain);
  if (needed <= 0) return 0;
  return captain.points - ((needed - 1) * BASE_PLAYER_COST);
};

const pushMessage = (text) => {
  state.messages.unshift(`${new Date().toLocaleTimeString()} - ${text}`);
  state.messages = state.messages.slice(0, 40);
};

const sortedAuctionQueue = () => {
  const contested = state.players
    .filter((p) => p.selectedBy.length > 1 && !isAssigned(p.id))
    .sort((a, b) => (b.selectedBy.length - a.selectedBy.length) || a.name.localeCompare(b.name));

  const unselected = state.players
    .filter((p) => p.selectedBy.length === 0 && !isAssigned(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...contested, ...unselected].map((p) => p.id);
};

const wsFrame = (jsonString) => {
  const payload = Buffer.from(jsonString);
  const header = [0x81];

  if (payload.length < 126) {
    header.push(payload.length);
    return Buffer.concat([Buffer.from(header), payload]);
  }

  header.push(126, (payload.length >> 8) & 255, payload.length & 255);
  return Buffer.concat([Buffer.from(header), payload]);
};

const decodeFrame = (buffer) => {
  const length = buffer[1] & 0x7f;
  let offset = 2;
  let payloadLength = length;

  if (length === 126) {
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  }

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;
  const data = buffer.subarray(offset, offset + payloadLength);

  for (let i = 0; i < data.length; i += 1) data[i] ^= mask[i % 4];
  return data.toString('utf8');
};

const publicState = () => ({ type: 'state', state });

const sendError = (socket, message) => {
  socket.write(wsFrame(JSON.stringify({ type: 'error', message })));
};

const broadcastState = () => {
  const framed = wsFrame(JSON.stringify(publicState()));
  clients.forEach((socket) => socket.write(framed));
};

const beginAuctionForNextPlayer = () => {
  const nextId = state.auctionQueue.find((pid) => !isAssigned(pid));
  state.currentAuctionPlayerId = nextId || null;
  state.currentBid = null;

  if (!nextId) {
    state.phase = 'complete';
    pushMessage('Auction completed.');
    return;
  }

  pushMessage(`Auction started for ${findPlayer(nextId).name}.`);
};

const closeCurrentAuction = () => {
  const player = findPlayer(state.currentAuctionPlayerId);
  if (!player) return;

  if (!state.currentBid) {
    player.auctionAttempts += 1;
    if (player.auctionAttempts < 2) {
      state.auctionQueue = state.auctionQueue.filter((id) => id !== player.id);
      state.auctionQueue.push(player.id);
      pushMessage(`${player.name} got no bids and moved to end of queue.`);
    } else {
      pushMessage(`${player.name} remained unsold.`);
    }
  } else {
    const captain = findCaptain(state.currentBid.captainId);
    captain.points -= state.currentBid.amount;
    captain.auctionPlayers.push(player.id);
    pushMessage(`${player.name} sold to ${captain.name} for ${state.currentBid.amount}.`);
  }

  state.auctionQueue = state.auctionQueue.filter((id) => id !== player.id || !isAssigned(player.id));
  beginAuctionForNextPlayer();
};

const finalizeSelectionPhase = () => {
  if (state.phase !== 'selection') return;

  state.players.forEach((player) => {
    if (player.selectedBy.length === 1) {
      const captain = findCaptain(player.selectedBy[0]);
      if (captain && teamNeeds(captain) > 0 && captain.points >= BASE_PLAYER_COST) {
        captain.directPlayers.push(player.id);
        captain.points -= BASE_PLAYER_COST;
        pushMessage(`${player.name} directly allocated to ${captain.name}.`);
      }
    }
  });

  state.auctionQueue = sortedAuctionQueue();
  state.phase = 'auction';
  beginAuctionForNextPlayer();
};

const ensureAdmin = (session) => session?.role === 'admin';
const ensureCaptain = (session, captainId) => session?.role === 'captain' && session?.captainId === captainId;
const ensurePlayer = (session) => session?.role === 'player' && !!session?.playerId;

const actions = {
  login({ role, username, password }, _session, socket) {
    if (!role || !username || !password) {
      sendError(socket, 'Role, username and password are required.');
      return;
    }

    const user = db.prepare('SELECT username, role, captain_id, player_id FROM users WHERE username = ? AND password = ?').get(username.trim(), password);
    if (!user || user.role !== role) {
      sendError(socket, 'Invalid credentials for selected role.');
      return;
    }

    socket.session = {
      role: user.role,
      username: user.username,
      captainId: user.captain_id || null,
      playerId: user.player_id || null
    };

    socket.write(wsFrame(JSON.stringify({
      type: 'identified',
      role: user.role,
      username: user.username,
      captainId: user.captain_id || null,
      playerId: user.player_id || null
    })));
  },

  registerPlayerAccount({ username, password, name, role, city, achievements, photoData }, _session, socket) {
    if (!username?.trim() || !password?.trim() || !name?.trim()) {
      sendError(socket, 'Username, password and player name are required.');
      return;
    }

    if (photoData && !photoData.startsWith('data:image/')) {
      sendError(socket, 'Photo must be an image file.');
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      sendError(socket, 'Username already exists.');
      return;
    }

    const playerId = nextPlayerId();
    db.prepare('INSERT INTO players (id, name, role, city, achievements, photo_data) VALUES (?, ?, ?, ?, ?, ?)')
      .run(playerId, name.trim(), role?.trim() || 'Player', city?.trim() || 'Unknown', achievements?.trim() || '', photoData || '');

    db.prepare('INSERT INTO users (username, password, role, player_id) VALUES (?, ?, ?, ?)')
      .run(username.trim(), password, 'player', playerId);

    state.players.push({
      id: playerId,
      name: name.trim(),
      role: role?.trim() || 'Player',
      city: city?.trim() || 'Unknown',
      achievements: achievements?.trim() || '',
      photo_data: photoData || '',
      selectedBy: [],
      auctionAttempts: 0
    });
    state.players.sort((a, b) => a.name.localeCompare(b.name));
    pushMessage(`New player account registered: ${name.trim()}.`);
  },

  updateMyPlayerProfile({ name, role, city, achievements, photoData }, session, socket) {
    if (!ensurePlayer(session)) return;

    const current = findPlayer(session.playerId);
    if (!current) {
      sendError(socket, 'Linked player profile not found.');
      return;
    }

    if (photoData && !photoData.startsWith('data:image/')) {
      sendError(socket, 'Photo must be an image file.');
      return;
    }

    const nextProfile = {
      name: name?.trim() || current.name,
      role: role?.trim() || current.role,
      city: city?.trim() || current.city,
      achievements: achievements?.trim() || current.achievements,
      photo_data: photoData || current.photo_data
    };

    db.prepare('UPDATE players SET name = ?, role = ?, city = ?, achievements = ?, photo_data = ? WHERE id = ?')
      .run(nextProfile.name, nextProfile.role, nextProfile.city, nextProfile.achievements, nextProfile.photo_data, session.playerId);

    current.name = nextProfile.name;
    current.role = nextProfile.role;
    current.city = nextProfile.city;
    current.achievements = nextProfile.achievements;
    current.photo_data = nextProfile.photo_data;

    state.players.sort((a, b) => a.name.localeCompare(b.name));
    pushMessage(`Player profile updated: ${current.name}.`);
  },

  adminCreateCaptain({ name, username, password }, session, socket) {
    if (!ensureAdmin(session)) return;
    if (!name?.trim() || !username?.trim() || !password?.trim()) {
      sendError(socket, 'Captain name, username and password are required.');
      return;
    }

    if (state.captains.length >= MAX_CAPTAINS) {
      sendError(socket, `Maximum ${MAX_CAPTAINS} captains allowed.`);
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      sendError(socket, 'Username already exists.');
      return;
    }

    const captainId = nextCaptainId();
    db.prepare('INSERT INTO captains (id, name, points) VALUES (?, ?, ?)').run(captainId, name.trim(), STARTING_POINTS);
    db.prepare('INSERT INTO users (username, password, role, captain_id) VALUES (?, ?, ?, ?)').run(username.trim(), password, 'captain', captainId);

    state.captains.push({ id: captainId, name: name.trim(), points: STARTING_POINTS, directPlayers: [], auctionPlayers: [] });
    pushMessage(`Admin created captain ${name.trim()} (${captainId}).`);
  },

  adminStartSelection(_, session, socket) {
    if (!ensureAdmin(session)) return;
    if (state.captains.length === 0 || state.players.length === 0) {
      sendError(socket, 'Need at least one captain and one player.');
      return;
    }
    if (state.phase === 'setup') {
      state.phase = 'selection';
      pushMessage('Admin started captain selection phase.');
    }
  },

  adminStartAuction(_, session) {
    if (!ensureAdmin(session)) return;
    finalizeSelectionPhase();
  },

  toggleSelection({ captainId, playerId }, session) {
    if (state.phase !== 'selection' || !ensureCaptain(session, captainId)) return;
    if (state.lockedCaptains.includes(captainId)) return;

    const player = findPlayer(playerId);
    if (!player) return;

    if (player.selectedBy.includes(captainId)) {
      player.selectedBy = player.selectedBy.filter((id) => id !== captainId);
    } else {
      player.selectedBy.push(captainId);
    }
  },

  lockCaptain({ captainId }, session) {
    if (state.phase !== 'selection' || !ensureCaptain(session, captainId)) return;

    if (!state.lockedCaptains.includes(captainId)) {
      state.lockedCaptains.push(captainId);
      pushMessage(`${captainId} locked selections.`);
    }

    if (state.captains.length > 0 && state.lockedCaptains.length === state.captains.length) {
      finalizeSelectionPhase();
    }
  },

  placeBid({ captainId }, session) {
    if (state.phase !== 'auction' || !state.currentAuctionPlayerId || !ensureCaptain(session, captainId)) return;
    const captain = findCaptain(captainId);
    if (!captain || teamNeeds(captain) <= 0) return;

    const minBid = state.currentBid ? state.currentBid.amount + 1 : BASE_PLAYER_COST;
    const maxBid = maxAllowedBid(captain);
    if (maxBid < minBid) return;

    state.currentBid = { captainId, amount: minBid };
    pushMessage(`${captain.name} bid ${minBid} for ${findPlayer(state.currentAuctionPlayerId).name}.`);
  },

  closeBid(_, session) {
    if (!ensureAdmin(session) || state.phase !== 'auction' || !state.currentAuctionPlayerId) return;
    closeCurrentAuction();
  },

  reset(_, session) {
    if (!ensureAdmin(session)) return;
    state.phase = 'setup';
    state.captains = state.captains.map((c) => ({ ...c, points: STARTING_POINTS, directPlayers: [], auctionPlayers: [] }));
    state.players = state.players.map((p) => ({ ...p, selectedBy: [], auctionAttempts: 0 }));
    state.auctionQueue = [];
    state.currentAuctionPlayerId = null;
    state.currentBid = null;
    state.lockedCaptains = [];
    state.messages = [];
    pushMessage('Auction reset to setup phase.');
  }
};

const server = http.createServer((req, res) => {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, 'public', requestPath);
  const publicDir = path.join(__dirname, 'public');

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('upgrade', (req, socket) => {
  if (req.headers.upgrade !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }

  const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  clients.add(socket);
  socket.session = null;
  socket.write(wsFrame(JSON.stringify(publicState())));

  socket.on('data', (chunk) => {
    try {
      const { type, payload } = JSON.parse(decodeFrame(chunk));
      if (actions[type]) {
        actions[type](payload || {}, socket.session, socket);
        broadcastState();
      }
    } catch {
      sendError(socket, 'Invalid message.');
    }
  });

  socket.on('close', () => clients.delete(socket));
  socket.on('end', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
});

migrate();
hydrateState();
pushMessage('System ready. Admin login: admin / admin123');

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Auction app running on http://localhost:${PORT}`);
});
