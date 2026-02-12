import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const SOCKET_URL = 'http://localhost:5001';
const API_URL = 'http://localhost:5001/api';

// Default placeholder image (SVG data URL)
const PLACEHOLDER_IMAGE = `${SOCKET_URL}/uploads/wwplaceholder.jpg`;

function App() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('auction');
  
  // Auction state
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [auctionState, setAuctionState] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  // Auto auction state
  const [autoAuctionStatus, setAutoAuctionStatus] = useState({
    isActive: false,
    queueLength: 0,
    unsoldCount: 0,
    totalRemaining: 0
  });
  
  // Stats
  const [stats, setStats] = useState({ totalPlayers: 0, soldPlayers: 0, unsoldPlayers: 0 });
  
  // Create captain form
  const [captainForm, setCaptainForm] = useState({ teamName: '', captainName: '', teamId: '', pin: '' });
  
  // Edit modals
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [playerForm, setPlayerForm] = useState({});
  const [teamForm, setTeamForm] = useState({});

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Check for saved admin session
    const savedAdminAuth = localStorage.getItem('admin_authenticated');
    const savedPassword = localStorage.getItem('admin_password');
    
    if (savedAdminAuth === 'true' && savedPassword) {
      setPassword(savedPassword);
      // Auto-login with saved credentials
      newSocket.emit('admin:login', { password: savedPassword });
    }

    newSocket.on('auth:success', () => {
      setIsAuthenticated(true);
      loadData();
    });

    newSocket.on('auth:error', (data) => {
      alert(data.message);
      // Clear invalid session
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_password');
    });

    newSocket.on('auction:state', (data) => {
      setAuctionState(data.state);
    });

    newSocket.on('teams:status', (data) => {
      setTeams(data.teams);
    });

    // Auto auction events
    newSocket.on('autoAuction:started', (data) => {
      setAutoAuctionStatus(prev => ({
        ...prev,
        isActive: true,
        queueLength: data.queueLength,
        totalRemaining: data.totalPlayers
      }));
    });

    newSocket.on('autoAuction:queueUpdate', (data) => {
      setAutoAuctionStatus(prev => ({
        ...prev,
        queueLength: data.queueLength,
        unsoldCount: data.unsoldCount,
        totalRemaining: data.totalRemaining
      }));
    });

    newSocket.on('autoAuction:playerUnsold', (data) => {
      setAutoAuctionStatus(prev => ({
        ...prev,
        unsoldCount: data.unsoldCount
      }));
    });

    newSocket.on('autoAuction:unsoldRound', (data) => {
      alert(data.message + ' (' + data.count + ' players)');
    });

    newSocket.on('autoAuction:completed', (data) => {
      alert(data.message);
      setAutoAuctionStatus({
        isActive: false,
        queueLength: 0,
        unsoldCount: 0,
        totalRemaining: 0
      });
      loadData();
    });

    newSocket.on('autoAuction:stopped', (data) => {
      setAutoAuctionStatus({
        isActive: false,
        queueLength: data.remainingInQueue,
        unsoldCount: data.unsoldCount,
        totalRemaining: data.remainingInQueue + data.unsoldCount
      });
    });

    newSocket.on('autoAuction:status', (data) => {
      setAutoAuctionStatus(data);
    });

    return () => newSocket.close();
  }, []);

  const loadData = async () => {
    try {
      const [playersRes, teamsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/players`),
        axios.get(`${API_URL}/teams`),
        axios.get(`${API_URL}/auction/stats`)
      ]);
      
      setPlayers(playersRes.data.players || []);
      setTeams(teamsRes.data.teams || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (socket) {
      socket.emit('admin:login', { password });
      // Save credentials on successful manual login
      socket.once('auth:success', () => {
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_password', password);
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_password');
    window.location.reload();
  };

  const handleClearAllData = async () => {
    const confirmMessage = 'Are you sure you want to clear ALL data?\n\nThis will delete:\n- All players\n- All teams\n- All bids\n- Auction state\n\nThis action CANNOT be undone!';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    const secondConfirm = window.confirm('FINAL WARNING: This will permanently delete everything. Continue?');
    if (!secondConfirm) {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/admin/clear-all-data`);
      if (response.data.success) {
        alert('All data cleared successfully!');
        // Reload data
        loadData();
      }
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Failed to clear data: ' + (error.response?.data?.message || error.message));
    }
  };

  const startAuction = (playerId) => {
    if (socket) {
      socket.emit('admin:startAuction', { playerId });
      setSelectedPlayer(null);
    }
  };

  const pauseAuction = () => {
    if (socket) socket.emit('admin:pauseAuction');
  };

  const resumeAuction = () => {
    if (socket) socket.emit('admin:resumeAuction');
  };

  const undoSale = (playerId) => {
    if (window.confirm('Are you sure you want to undo this sale?')) {
      if (socket) socket.emit('admin:undoSale', { playerId });
    }
  };

  const startAutoAuction = () => {
    if (window.confirm('Start automatic auction for all available players?\n\nPlayers will be auctioned from highest to lowest base price.\nUnsold players will be added back to the queue.')) {
      if (socket) {
        socket.emit('admin:startAutoAuction');
      }
    }
  };

  const stopAutoAuction = () => {
    if (window.confirm('Stop automatic auction?')) {
      if (socket) {
        socket.emit('admin:stopAutoAuction');
      }
    }
  };

  const getAutoAuctionStatus = () => {
    if (socket) {
      socket.emit('admin:getAutoAuctionStatus');
    }
  };

  const generateTeams = async () => {
    try {
      const response = await axios.post(`${API_URL}/admin/generate-teams`, { count: 20 });
      alert(`${response.data.teams.length} teams created successfully!`);
      
      // Display PINs (only shown once)
      const pins = response.data.teams.map(t => `${t.teamId}: ${t.pin}`).join('\n');
      console.log('Team PINs (save these!):\n', pins);
      alert('Team PINs have been logged to console. Save them now!');
      
      loadData();
    } catch (error) {
      alert('Error generating teams: ' + error.message);
    }
  };

  const resetAuction = async () => {
    if (window.confirm('Reset entire auction? This will clear all bids and team rosters.')) {
      try {
        await axios.post(`${API_URL}/admin/reset`);
        alert('Auction reset successfully!');
        loadData();
      } catch (error) {
        alert('Error resetting auction: ' + error.message);
      }
    }
  };

  const createCaptain = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/admin/create-captain`, captainForm);
      alert(`Captain created!\n\nTeam ID: ${response.data.team.teamId}\nPIN: ${response.data.team.pin}\n\nSave this PIN - it won't be shown again!`);
      
      // Reset form
      setCaptainForm({ teamName: '', captainName: '', teamId: '', pin: '' });
      loadData();
    } catch (error) {
      alert('Error creating captain: ' + (error.response?.data?.message || error.message));
    }
  };

  const openEditPlayer = (player) => {
    setEditingPlayer(player);
    setPlayerForm({
      name: player.name,
      category: player.category,
      basePrice: player.basePrice
    });
  };

  const updatePlayer = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/players/${editingPlayer._id}`, playerForm);
      alert('Player updated successfully!');
      setEditingPlayer(null);
      loadData();
    } catch (error) {
      alert('Error updating player: ' + (error.response?.data?.message || error.message));
    }
  };

  const deletePlayer = async (playerId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        await axios.delete(`${API_URL}/players/${playerId}`);
        alert('Player deleted successfully!');
        loadData();
      } catch (error) {
        alert('Error deleting player: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const openEditTeam = (team) => {
    setEditingTeam(team);
    setTeamForm({
      teamName: team.teamName,
      captainName: team.captainName,
      teamId: team.teamId,
      pin: ''
    });
  };

  const updateTeam = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/teams/${editingTeam._id}`, teamForm);
      alert('Team updated successfully!');
      setEditingTeam(null);
      loadData();
    } catch (error) {
      alert('Error updating team: ' + (error.response?.data?.message || error.message));
    }
  };

  const deleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await axios.delete(`${API_URL}/teams/${teamId}`);
        alert('Team deleted successfully!');
        loadData();
      } catch (error) {
        alert('Error deleting team: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await axios.post(`${API_URL}/players/bulk-upload`, formData);
      alert(response.data.message);
      loadData();
    } catch (error) {
      alert('Upload error: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="admin-login">
          <div className="login-card">
            <h1>🔐 Admin Panel</h1>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin Password"
                required
              />
              <button type="submit">Login</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app admin-panel">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>🏏 Cricket Auction - Admin Panel</h1>
          <div className="header-buttons">
            <button onClick={handleClearAllData} className="btn-danger-outline clear-data-btn" title="Clear all data">
              🗑️ Clear All Data
            </button>
            <button onClick={handleLogout} className="btn-danger logout-btn">
              Logout
            </button>
          </div>
        </div>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total Players</span>
            <span className="stat-value">{stats.totalPlayers}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Sold</span>
            <span className="stat-value">{stats.soldPlayers}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unsold</span>
            <span className="stat-value">{stats.unsoldPlayers}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Online Teams</span>
            <span className="stat-value">{teams.filter(t => t.isOnline).length}/{teams.length}</span>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'auction' ? 'active' : ''}
          onClick={() => setActiveTab('auction')}
        >
          Auction Control
        </button>
        <button 
          className={activeTab === 'players' ? 'active' : ''}
          onClick={() => setActiveTab('players')}
        >
          Players
        </button>
        <button 
          className={activeTab === 'teams' ? 'active' : ''}
          onClick={() => setActiveTab('teams')}
        >
          Teams
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'auction' && (
          <div className="auction-control">
            <div className="control-panel">
              <h2>Auction Controls</h2>
              
              {/* Auto Auction Controls */}
              <div className="auto-auction-section">
                <h3>Auto Auction</h3>
                {autoAuctionStatus.isActive ? (
                  <div className="auto-auction-status">
                    <div className="status-active">
                      <span className="status-indicator"></span>
                      <strong>Auto Auction Active</strong>
                    </div>
                    <div className="auto-stats">
                      <div className="auto-stat">
                        <span>Remaining in Queue</span>
                        <strong>{autoAuctionStatus.queueLength}</strong>
                      </div>
                      <div className="auto-stat">
                        <span>Unsold (Will Retry)</span>
                        <strong>{autoAuctionStatus.unsoldCount}</strong>
                      </div>
                      <div className="auto-stat">
                        <span>Total Remaining</span>
                        <strong>{autoAuctionStatus.totalRemaining}</strong>
                      </div>
                    </div>
                    <button onClick={stopAutoAuction} className="btn-danger">
                      Stop Auto Auction
                    </button>
                  </div>
                ) : (
                  <div className="auto-auction-inactive">
                    <p>Start automatic auction for all players. Players will be auctioned from highest to lowest base price. Unsold players will be added back to the queue.</p>
                    <button onClick={startAutoAuction} className="btn-success">
                      🚀 Start Auto Auction
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Auction Controls */}
              <div className="manual-auction-section">
                <h3>Manual Auction</h3>
                {auctionState?.isActive ? (
                  <div>
                    <p><strong>Status:</strong> {auctionState.isPaused ? 'PAUSED' : 'ACTIVE'}</p>
                    <p><strong>Current Player:</strong> {auctionState.currentPlayer?.name || 'None'}</p>
                    <p><strong>Current Bid:</strong> ₹{auctionState.currentHighBid?.amount || 0}</p>
                    <div className="control-buttons">
                      {auctionState.isPaused ? (
                        <button onClick={resumeAuction} className="btn-success">Resume</button>
                      ) : (
                        <button onClick={pauseAuction} className="btn-warning">Pause</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>No active auction</p>
                )}
              </div>
            </div>

            <div className="player-selector">
              <h2>Start Manual Auction</h2>
              <div className="player-grid">
                {players.filter(p => p.status === 'UNSOLD').map(player => (
                  <div key={player._id} className="player-item">
                    {/* console.log player */}

                    <img src={player.photo?.startsWith('http') ? player.photo : `${SOCKET_URL}/uploads${player.photo}`} alt={player.name} onError={(e) => e.target.src = PLACEHOLDER_IMAGE} />
                    <div className="player-details">
                      <strong>{player.name}</strong>
                      <span>{player.category}</span>
                      <span>Base: ₹{player.basePrice}</span>
                    </div>
                    <button onClick={() => startAuction(player._id)} className="btn-primary" disabled={autoAuctionStatus.isActive}>
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="players-panel">
            <div className="panel-header">
              <h2>Players Management</h2>
              <div className="upload-section">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                  id="csvUpload"
                  style={{ display: 'none' }}
                />
                <button onClick={() => document.getElementById('csvUpload').click()} className="btn-primary">
                  Upload CSV
                </button>
              </div>
            </div>
            
            <div className="players-list">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Sold To</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player._id}>
                      <td>{player.name}</td>
                      <td>{player.category}</td>
                      <td><span className={`status-badge ${player.status.toLowerCase()}`}>{player.status}</span></td>
                      <td>{player.soldTo?.teamName || '-'}</td>
                      <td>{player.soldPrice ? `₹${player.soldPrice}` : '-'}</td>
                      <td>
                        <div className="action-buttons">
                          {player.status === 'UNSOLD' && (
                            <>
                              <button onClick={() => openEditPlayer(player)} className="btn-secondary btn-sm">
                                Edit
                              </button>
                              <button onClick={() => deletePlayer(player._id)} className="btn-danger btn-sm">
                                Delete
                              </button>
                            </>
                          )}
                          {player.status === 'SOLD' && (
                            <button onClick={() => undoSale(player._id)} className="btn-warning btn-sm">
                              Undo Sale
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="teams-panel">
            <h2>Teams Status</h2>
            <div className="teams-grid">
              {teams.map(team => (
                <div key={team._id} className={`team-card ${team.isOnline ? 'online' : 'offline'}`}>
                  <div className="team-header">
                    <h3>{team.teamName}</h3>
                    <span className="status-indicator">{team.isOnline ? '🟢' : '🔴'}</span>
                  </div>
                  <p><strong>Captain:</strong> {team.captainName}</p>
                  <p><strong>Team ID:</strong> {team.teamId}</p>
                  <p><strong>Points Left:</strong> ₹{team.remainingPoints}</p>
                  <p><strong>Squad:</strong> {team.rosterSlotsFilled}/11</p>
                  <p><strong>Max Bid:</strong> ₹{team.remainingPoints - ((11 - team.rosterSlotsFilled) * 5)}</p>
                  <div className="team-actions">
                    <button onClick={() => openEditTeam(team)} className="btn-secondary btn-sm">
                      Edit
                    </button>
                    {team.rosterSlotsFilled === 0 && (
                      <button onClick={() => deleteTeam(team._id)} className="btn-danger btn-sm">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-panel">
            <h2>Auction Settings</h2>
            
            {/* Create Individual Captain Form */}
            <div className="create-captain-section">
              <h3>Create Individual Captain</h3>
              <form onSubmit={createCaptain} className="captain-form">
                <div className="form-group">
                  <label>Team Name</label>
                  <input
                    type="text"
                    value={captainForm.teamName}
                    onChange={(e) => setCaptainForm({...captainForm, teamName: e.target.value})}
                    placeholder="e.g., Mumbai Warriors"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Captain Name</label>
                  <input
                    type="text"
                    value={captainForm.captainName}
                    onChange={(e) => setCaptainForm({...captainForm, captainName: e.target.value})}
                    placeholder="e.g., Rohit Sharma"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Team ID (unique)</label>
                  <input
                    type="text"
                    value={captainForm.teamId}
                    onChange={(e) => setCaptainForm({...captainForm, teamId: e.target.value})}
                    placeholder="e.g., MW01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>4-Digit PIN</label>
                  <input
                    type="text"
                    value={captainForm.pin}
                    onChange={(e) => setCaptainForm({...captainForm, pin: e.target.value})}
                    placeholder="e.g., 1234"
                    pattern="[0-9]{4}"
                    maxLength="4"
                    required
                  />
                </div>
                <button type="submit" className="btn-success">
                  Create Captain
                </button>
              </form>
            </div>

            <hr style={{margin: '30px 0'}} />
            
            <div className="settings-actions">
              <button onClick={generateTeams} className="btn-primary">
                Generate 20 Teams (Bulk)
              </button>
              <button onClick={resetAuction} className="btn-warning">
                Reset Auction
              </button>
              <button onClick={() => window.location.reload()} className="btn-secondary">
                Refresh Data
              </button>
            </div>
            <div className="info-box">
              <h3>Instructions</h3>
              <ol>
                <li>Create individual captains using the form above OR generate 20 teams in bulk</li>
                <li>Upload players via CSV (columns: name, category, basePrice, photo)</li>
                <li>Start auction by selecting a player</li>
                <li>Monitor team connections and bids in real-time</li>
                <li>Use pause/resume controls as needed</li>
                <li>Undo sales if necessary</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="modal-overlay" onClick={() => setEditingPlayer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Player</h2>
            <form onSubmit={updatePlayer} className="edit-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({...playerForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={playerForm.category}
                  onChange={(e) => setPlayerForm({...playerForm, category: e.target.value})}
                  required
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket-Keeper">Wicket-Keeper</option>
                </select>
              </div>
              <div className="form-group">
                <label>Base Price (₹ Lakhs)</label>
                <input
                  type="number"
                  value={playerForm.basePrice}
                  onChange={(e) => setPlayerForm({...playerForm, basePrice: e.target.value})}
                  min="5"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingPlayer(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="modal-overlay" onClick={() => setEditingTeam(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Team</h2>
            <form onSubmit={updateTeam} className="edit-form">
              <div className="form-group">
                <label>Team Name</label>
                <input
                  type="text"
                  value={teamForm.teamName}
                  onChange={(e) => setTeamForm({...teamForm, teamName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Captain Name</label>
                <input
                  type="text"
                  value={teamForm.captainName}
                  onChange={(e) => setTeamForm({...teamForm, captainName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Team ID</label>
                <input
                  type="text"
                  value={teamForm.teamId}
                  onChange={(e) => setTeamForm({...teamForm, teamId: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>New PIN (leave blank to keep current)</label>
                <input
                  type="text"
                  value={teamForm.pin}
                  onChange={(e) => setTeamForm({...teamForm, pin: e.target.value})}
                  placeholder="4-digit PIN"
                  maxLength="4"
                  pattern="[0-9]{4}"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingTeam(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
