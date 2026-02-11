const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Player = require('../models/Player');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Player self-registration with photo upload
router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const { name, category, basePrice } = req.body;

    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and category are required' 
      });
    }

    // Get photo path
    const photoPath = req.file ? `/uploads/${req.file.filename}` : '/placeholder-player.jpg';

    // Create player
    const player = new Player({
      name,
      category,
      photo: photoPath,
      basePrice: parseInt(basePrice) || 30
    });

    await player.save();

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! Your profile will be reviewed by admin.',
      player: {
        _id: player._id,
        name: player.name,
        category: player.category,
        photo: player.photo
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all players
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const players = await Player.find(filter).populate('soldTo', 'teamName');
    res.json({ success: true, players });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single player
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('soldTo', 'teamName');
    
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create single player
router.post('/', async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.status(201).json({ success: true, player });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update player
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Update basic fields
    if (req.body.name) player.name = req.body.name;
    if (req.body.category) player.category = req.body.category;
    if (req.body.basePrice) player.basePrice = parseInt(req.body.basePrice);

    // Update photo if provided
    if (req.file) {
      player.photo = `/uploads/${req.file.filename}`;
    }

    await player.save();

    res.json({ 
      success: true, 
      message: 'Player updated successfully',
      player 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete player
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    if (player.status === 'SOLD') {
      return res.status(400).json({ success: false, message: 'Cannot delete a sold player' });
    }

    await player.deleteOne();
    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Bulk upload via CSV
router.post('/bulk-upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const players = [];
    const filePath = req.file.path;

    // Parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        players.push({
          name: row.name || row.Name,
          category: row.category || row.Category,
          photo: row.photo || row.Photo || '/placeholder-player.jpg',
          basePrice: parseInt(row.basePrice || row['Base Price']) || 5
        });
      })
      .on('end', async () => {
        try {
          const insertedPlayers = await Player.insertMany(players);
          
          // Delete uploaded file
          fs.unlinkSync(filePath);
          
          res.json({ 
            success: true, 
            message: `${insertedPlayers.length} players uploaded successfully`,
            players: insertedPlayers 
          });
        } catch (error) {
          res.status(400).json({ success: false, message: error.message });
        }
      });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update player
router.put('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    res.json({ success: true, player });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete player
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
