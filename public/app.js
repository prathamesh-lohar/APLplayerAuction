const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);

const el = {
  loginRole: document.getElementById('loginRole'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  identityStatus: document.getElementById('identityStatus'),
  phaseBadge: document.getElementById('phaseBadge'),

  signupUsername: document.getElementById('signupUsername'),
  signupPassword: document.getElementById('signupPassword'),
  signupName: document.getElementById('signupName'),
  signupRole: document.getElementById('signupRole'),
  signupCity: document.getElementById('signupCity'),
  signupPhoto: document.getElementById('signupPhoto'),
  signupAchievements: document.getElementById('signupAchievements'),
  signupBtn: document.getElementById('signupBtn'),

  captainName: document.getElementById('captainName'),
  captainUsername: document.getElementById('captainUsername'),
  captainPassword: document.getElementById('captainPassword'),
  createCaptainBtn: document.getElementById('createCaptainBtn'),
  startSelectionBtn: document.getElementById('startSelectionBtn'),
  resetBtn: document.getElementById('resetBtn'),
  startAuctionBtn: document.getElementById('startAuctionBtn'),
  closeBidBtn: document.getElementById('closeBidBtn'),

  lockBtn: document.getElementById('lockBtn'),

  playerName: document.getElementById('playerName'),
  playerRole: document.getElementById('playerRole'),
  playerCity: document.getElementById('playerCity'),
  playerPhoto: document.getElementById('playerPhoto'),
  playerAchievements: document.getElementById('playerAchievements'),
  updatePlayerBtn: document.getElementById('updatePlayerBtn'),

  pages: {
    login: document.getElementById('page-login'),
    adminCaptains: document.getElementById('page-admin-captains'),
    adminSelection: document.getElementById('page-admin-selection'),
    adminAuction: document.getElementById('page-admin-auction'),
    captainSelection: document.getElementById('page-captain-selection'),
    captainAuction: document.getElementById('page-captain-auction'),
    playerProfile: document.getElementById('page-player-profile')
  },

  playersListAdminSelection: document.getElementById('playersListAdminSelection'),
  playersListCaptain: document.getElementById('playersListCaptain'),
  auctionCardAdmin: document.getElementById('auctionCardAdmin'),
  auctionCardCaptain: document.getElementById('auctionCardCaptain'),
  queueListAdmin: document.getElementById('queueListAdmin'),
  queueListCaptain: document.getElementById('queueListCaptain'),
  captainBoardAdmin: document.getElementById('captainBoardAdmin'),
  captainBoardCaptain: document.getElementById('captainBoardCaptain'),
  myPlayerCard: document.getElementById('myPlayerCard'),
  messages: document.getElementById('messages')
};

const user = { role: null, username: null, captainId: null, playerId: null };
let currentState;

const routeRoleGuard = {
  '#/login': null,
  '#/admin/captains': 'admin',
  '#/admin/selection': 'admin',
  '#/admin/auction': 'admin',
  '#/captain/selection': 'captain',
  '#/captain/auction': 'captain',
  '#/player/profile': 'player'
};

const routePageMap = {
  '#/login': 'login',
  '#/admin/captains': 'adminCaptains',
  '#/admin/selection': 'adminSelection',
  '#/admin/auction': 'adminAuction',
  '#/captain/selection': 'captainSelection',
  '#/captain/auction': 'captainAuction',
  '#/player/profile': 'playerProfile'
};

function send(type, payload = {}) {
  socket.send(JSON.stringify({ type, payload }));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ensureAllowedRoute(route) {
  const requiredRole = routeRoleGuard[route];
  if (!requiredRole) return route;
  if (user.role === requiredRole) return route;
  if (!user.role) return '#/login';
  if (user.role === 'admin') return '#/admin/captains';
  if (user.role === 'captain') return '#/captain/selection';
  if (user.role === 'player') return '#/player/profile';
  return '#/login';
}

function renderRoute() {
  const rawRoute = location.hash || '#/login';
  const safeRoute = ensureAllowedRoute(rawRoute);
  if (safeRoute !== rawRoute) {
    location.hash = safeRoute;
    return;
  }

  Object.values(el.pages).forEach((node) => node.classList.add('hidden'));
  const pageKey = routePageMap[safeRoute] || 'login';
  el.pages[pageKey].classList.remove('hidden');
}

function renderIdentity() {
  if (!user.role) {
    el.identityStatus.textContent = 'Not logged in';
    return;
  }
  el.identityStatus.textContent = `Logged in as ${user.role} (${user.username})`;
}

function renderPhoto(photoData) {
  return photoData ? `<img class="player-photo" src="${photoData}" alt="player" />` : '';
}

function playerCardMarkup(p, status) {
  return `
    ${renderPhoto(p.photo_data)}
    <h4>${p.name}</h4>
    <div><span class="badge">${p.role}</span><span class="badge">${p.city}</span></div>
    <p>${status}</p>
    <small>Achievements: ${p.achievements || 'none'}</small><br />
    <small>Selected by: ${p.selectedBy.join(', ') || 'none'}</small>
  `;
}

function renderPlayersTo(target, state, captainMode = false) {
  target.innerHTML = '';
  state.players.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'card';

    const status = p.selectedBy.length === 0
      ? 'Unselected (late auction)'
      : p.selectedBy.length === 1
        ? 'Single captain selection (direct allocation)'
        : `Contested (${p.selectedBy.length} captains)`;

    card.innerHTML = playerCardMarkup(p, status);

    if (captainMode) {
      const btn = document.createElement('button');
      btn.textContent = p.selectedBy.includes(user.captainId) ? 'Unselect' : 'Select';
      btn.disabled = state.phase !== 'selection' || state.lockedCaptains.includes(user.captainId);
      btn.onclick = () => send('toggleSelection', { captainId: user.captainId, playerId: p.id });
      card.appendChild(btn);
    }

    target.appendChild(card);
  });
}

function renderAuctionTo({ cardTarget, queueTarget, captainBoardTarget }, state, captainCanBid) {
  cardTarget.innerHTML = '';
  const current = state.players.find((p) => p.id === state.currentAuctionPlayerId);

  if (!current) {
    cardTarget.innerHTML = '<div class="card"><strong>No active auction player</strong></div>';
  } else {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${renderPhoto(current.photo_data)}
      <h4>${current.name}</h4>
      <p>Role: ${current.role} | City: ${current.city}</p>
      <p>Achievements: ${current.achievements || 'none'}</p>
      <p>Bid: ${state.currentBid ? `${state.currentBid.amount} by ${state.currentBid.captainId}` : 'No bids yet'}</p>
    `;

    if (captainCanBid) {
      const c = state.captains.find((cap) => cap.id === user.captainId);
      if (c) {
        const needed = 11 - (c.directPlayers.length + c.auctionPlayers.length);
        const minBid = state.currentBid ? state.currentBid.amount + 1 : 8;
        const maxBid = c.points - Math.max(0, needed - 1) * 8;
        const canBid = state.phase === 'auction' && needed > 0 && maxBid >= minBid;
        const bidBtn = document.createElement('button');
        bidBtn.textContent = canBid ? `Bid +1 (max ${maxBid})` : 'Bid locked';
        bidBtn.disabled = !canBid;
        bidBtn.onclick = () => send('placeBid', { captainId: user.captainId });
        card.appendChild(bidBtn);
      }
    }

    cardTarget.appendChild(card);
  }

  queueTarget.innerHTML = '';
  state.auctionQueue.filter((id) => id !== state.currentAuctionPlayerId).forEach((id, idx) => {
    const p = state.players.find((x) => x.id === id);
    if (!p) return;
    const li = document.createElement('li');
    li.textContent = `${idx + 1}. ${p.name} (${p.selectedBy.length} selections)`;
    queueTarget.appendChild(li);
  });

  captainBoardTarget.innerHTML = '';
  state.captains.forEach((c) => {
    const needed = 11 - (c.directPlayers.length + c.auctionPlayers.length);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${c.name} (${c.id})</h4>
      <p>Points: <strong>${c.points}</strong></p>
      <p>Need players: <strong>${needed}</strong></p>
      <p>Direct: ${c.directPlayers.join(', ') || 'none'}</p>
      <p>Auction: ${c.auctionPlayers.join(', ') || 'none'}</p>
    `;
    captainBoardTarget.appendChild(card);
  });
}

function renderMessages(state) {
  el.messages.innerHTML = '';
  state.messages.forEach((m) => {
    const li = document.createElement('li');
    li.textContent = m;
    el.messages.appendChild(li);
  });
}

function renderPlayerProfilePage(state) {
  if (user.role !== 'player' || !user.playerId) return;
  const p = state.players.find((x) => x.id === user.playerId);
  if (!p) return;

  el.playerName.value = p.name;
  el.playerRole.value = p.role;
  el.playerCity.value = p.city;
  el.playerAchievements.value = p.achievements || '';
  el.myPlayerCard.innerHTML = `<div class="card">${playerCardMarkup(p, 'Your current profile')}</div>`;
}

function render(state) {
  currentState = state;
  renderIdentity();
  renderRoute();

  renderPlayersTo(el.playersListAdminSelection, state, false);
  renderPlayersTo(el.playersListCaptain, state, true);

  renderAuctionTo({
    cardTarget: el.auctionCardAdmin,
    queueTarget: el.queueListAdmin,
    captainBoardTarget: el.captainBoardAdmin
  }, state, false);

  renderAuctionTo({
    cardTarget: el.auctionCardCaptain,
    queueTarget: el.queueListCaptain,
    captainBoardTarget: el.captainBoardCaptain
  }, state, true);

  renderMessages(state);
  renderPlayerProfilePage(state);

  el.phaseBadge.textContent = `Phase: ${state.phase.toUpperCase()}`;
  el.lockBtn.disabled = !(user.role === 'captain' && state.phase === 'selection');
}

window.addEventListener('hashchange', () => {
  renderRoute();
  if (currentState) render(currentState);
});

el.loginBtn.onclick = () => {
  send('login', {
    role: el.loginRole.value,
    username: el.loginUsername.value,
    password: el.loginPassword.value
  });
};

el.logoutBtn.onclick = () => {
  user.role = null;
  user.username = null;
  user.captainId = null;
  user.playerId = null;
  location.hash = '#/login';
  renderRoute();
  renderIdentity();
};

el.signupBtn.onclick = async () => {
  const photoData = await fileToDataUrl(el.signupPhoto.files[0]);
  send('registerPlayerAccount', {
    username: el.signupUsername.value,
    password: el.signupPassword.value,
    name: el.signupName.value,
    role: el.signupRole.value,
    city: el.signupCity.value,
    achievements: el.signupAchievements.value,
    photoData
  });
};

el.createCaptainBtn.onclick = () => {
  send('adminCreateCaptain', {
    name: el.captainName.value,
    username: el.captainUsername.value,
    password: el.captainPassword.value
  });
};

el.startSelectionBtn.onclick = () => send('adminStartSelection');
el.resetBtn.onclick = () => send('reset');
el.startAuctionBtn.onclick = () => send('adminStartAuction');
el.closeBidBtn.onclick = () => send('closeBid');
el.lockBtn.onclick = () => send('lockCaptain', { captainId: user.captainId });

el.updatePlayerBtn.onclick = async () => {
  const photoData = await fileToDataUrl(el.playerPhoto.files[0]);
  send('updateMyPlayerProfile', {
    name: el.playerName.value,
    role: el.playerRole.value,
    city: el.playerCity.value,
    achievements: el.playerAchievements.value,
    photoData
  });
};

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'state') render(msg.state);
  if (msg.type === 'identified') {
    user.role = msg.role;
    user.username = msg.username;
    user.captainId = msg.captainId || null;
    user.playerId = msg.playerId || null;

    if (user.role === 'admin') location.hash = '#/admin/captains';
    if (user.role === 'captain') location.hash = '#/captain/selection';
    if (user.role === 'player') location.hash = '#/player/profile';

    renderIdentity();
    renderRoute();
    if (currentState) render(currentState);
  }
  if (msg.type === 'error') window.alert(msg.message);
};

if (!location.hash) location.hash = '#/login';
renderRoute();
renderIdentity();
