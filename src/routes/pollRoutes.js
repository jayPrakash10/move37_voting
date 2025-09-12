const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const { protect } = require('../middleware/auth');

// Protected routes (require authentication)
router.get('/', protect, pollController.getAllPolls);
router.get('/:id', protect, pollController.getPoll);
router.post('/', protect, pollController.createPoll);
router.post('/vote', protect, pollController.voteOnPoll);
router.patch('/:id/publish', protect, pollController.updatePollPublishStatus);
router.delete('/:id', protect, pollController.deletePoll);

module.exports = router;
