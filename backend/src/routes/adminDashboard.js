// Admin Dashboard Routes
const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getFarmerQueries,
  assignQueryToExpert,
  replyToQuery,
  markQueryResolved,
  getCropAdvisory,
  addCropAdvisory,
  getMarketPrices,
  updateMarketPrices,
  sendBulkNotifications,
  getReports
} = require('../controllers/adminDashboard');

// Import security middleware
const { authenticateAdmin } = require('../middlewares/security');

// Dashboard Statistics
router.get('/dashboard-stats', authenticateAdmin, getDashboardStats);

// Farmer Queries Management
router.get('/queries', authenticateAdmin, getFarmerQueries);
router.put('/queries/:queryId/assign', authenticateAdmin, assignQueryToExpert);
router.put('/queries/:queryId/reply', authenticateAdmin, replyToQuery);
router.put('/queries/:queryId/resolve', authenticateAdmin, markQueryResolved);

// Crop Advisory Management
router.get('/crop-advisory', authenticateAdmin, getCropAdvisory);
router.post('/crop-advisory', authenticateAdmin, addCropAdvisory);

// Market Price Management
router.get('/market-prices', authenticateAdmin, getMarketPrices);
router.put('/market-prices', authenticateAdmin, updateMarketPrices);

// Notifications & Alerts
router.post('/notifications/bulk', authenticateAdmin, sendBulkNotifications);

// Reports & Analytics
router.get('/reports', authenticateAdmin, getReports);

module.exports = router;
