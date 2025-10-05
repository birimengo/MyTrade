// backend/routes/authRoutes.js
const express = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  validateResetToken
} = require('../controllers/authController');

const router = express.Router();

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Forgot password route
router.post('/forgot-password', forgotPassword);

// Reset password route
router.post('/reset-password', resetPassword);

// Validate reset token route
router.get('/validate-reset-token', validateResetToken);

module.exports = router;
