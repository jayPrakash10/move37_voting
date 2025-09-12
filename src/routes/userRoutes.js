const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { createUserValidation, updateUserValidation, validate } = require('../middleware/validation');

// Create a new user
router.post('/', createUserValidation, validate, userController.createUser);

// Get all users
router.get('/', userController.getUsers);

// Get a single user
router.get('/:id', userController.getUser);

// Update a user
router.patch('/:id', updateUserValidation, validate, userController.updateUser);

// Delete a user
router.delete('/:id', userController.deleteUser);

module.exports = router;
