const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { createUserValidation, validate } = require('../middleware/validation');

// Public routes
router.post('/signup', createUserValidation, validate, authController.signup);
router.post('/login', authController.login);

// Protected routes (require authentication)
const { protect } = require('../middleware/auth');
router.get('/me', protect, authController.getMe);

module.exports = router;
