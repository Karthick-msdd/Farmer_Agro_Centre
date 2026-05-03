// Farmer Dashboard Routes
const express = require('express');
const router = express.Router();
const {
  getCropAdvisory,
  getMarketPrices,
  getPestDiseaseInfo,
  submitQuery,
  getFarmerQueries,
  getFarmerProfile,
  updateFarmerProfile,
  getFarmingTips
} = require('../controllers/farmerDashboard');

// Import security middleware
const { authenticateFarmer } = require('../middlewares/security');

// Crop Advisory
router.get('/crop-advisory', authenticateFarmer, getCropAdvisory);

// Market Prices
router.get('/market-prices', authenticateFarmer, getMarketPrices);

// Pest & Disease Information
router.get('/pest-disease', authenticateFarmer, getPestDiseaseInfo);

// Query Submissions
router.post('/queries', authenticateFarmer, submitQuery);
router.get('/queries', authenticateFarmer, getFarmerQueries);

// Farmer Profile
router.get('/profile', authenticateFarmer, getFarmerProfile);
router.put('/profile', authenticateFarmer, updateFarmerProfile);

// Farming Tips
router.get('/farming-tips', authenticateFarmer, getFarmingTips);

module.exports = router;
