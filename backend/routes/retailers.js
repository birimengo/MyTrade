// backend/routes/retailers.js
const express = require('express');
const {
  getRetailersByCategory,
  getAllRetailers,
  getRetailerById
} = require('../controllers/retailerController');

const router = express.Router();

// Get retailers by product category
router.get('/', getRetailersByCategory);

// Get all retailers (admin only)
router.get('/all', getAllRetailers);

// Get specific retailer by ID
router.get('/:id', getRetailerById);

module.exports = router;