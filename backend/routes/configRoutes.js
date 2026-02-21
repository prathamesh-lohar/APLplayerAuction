const express = require('express');
const router = express.Router();

// Get auction configuration
router.get('/', (req, res) => {
  try {
    const config = {
      timerDuration: parseInt(process.env.TIMER_DURATION) || 20,
      initialBudget: parseInt(process.env.INITIAL_BUDGET) || 110,
      basePrice: parseInt(process.env.BASE_PRICE) || 30,
      minBasePrice: parseInt(process.env.MIN_BASE_PRICE) || 30,
      maxSquadSize: parseInt(process.env.MAX_SQUAD_SIZE) || 11,
      maxCaptains: parseInt(process.env.MAX_CAPTAINS) || 20,
    };

    res.json({ 
      success: true, 
      config 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
