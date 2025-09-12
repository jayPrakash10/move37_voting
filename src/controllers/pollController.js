const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new poll with options
const createPoll = async (req, res) => {
  try {
    const { question, options } = req.body;
    const userId = req.user.id; // Get user ID from auth middleware

    // Validate input
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Question and at least two options are required'
      });
    }

    // Create poll with options in a transaction
    const poll = await prisma.$transaction(async (prisma) => {
      // Create the poll
      const newPoll = await prisma.poll.create({
        data: {
          question,
          userId,
          options: {
            create: options.map(option => ({
              text: option
            }))
          }
        },
        include: {
          options: true
        }
      });

      return newPoll;
    });

    // Notify all connected clients about the new poll
    if (req.notifyPollCreated) {
      req.notifyPollCreated(poll);
    }

    res.status(201).json({
      status: 'success',
      data: poll
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create poll'
    });
  }
};

// Get all published polls and user's unpublished polls
const getAllPolls = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const polls = await prisma.poll.findMany({
      where: {
        OR: [
          { isPublished: true },
          ...(userId ? [{ userId, isPublished: false }] : [])
        ]
      },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: { votes: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedPolls = polls.map(poll => ({
      id: poll.id,
      question: poll.question,
      isPublished: poll.isPublished,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      totalVotes: poll._count.votes,
      createdBy: poll.user,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option._count.votes
      }))
    }));

    res.status(200).json({
      status: 'success',
      results: formattedPolls.length,
      data: formattedPolls
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch polls'
    });
  }
};

// Get a single poll with options and vote counts
const getPoll = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    if (!poll) {
      return res.status(404).json({
        status: 'error',
        message: 'Poll not found'
      });
    }

    // Format the response
    const formattedPoll = {
      id: poll.id,
      question: poll.question,
      isPublished: poll.isPublished,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      totalVotes: poll._count.votes,
      createdBy: poll.user,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option._count.votes
      }))
    };

    res.status(200).json({
      status: 'success',
      data: formattedPoll
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch poll'
    });
  }
};

// Toggle poll publish status (only by the creator)
const updatePollPublishStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    const userId = req.user.id;

    // Validate input
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'isPublished must be a boolean value'
      });
    }

    // Check if poll exists and belongs to the user
    const poll = await prisma.poll.findUnique({
      where: { id }
    });

    if (!poll) {
      return res.status(404).json({
        status: 'error',
        message: 'Poll not found'
      });
    }

    if (poll.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this poll'
      });
    }

    // Update the poll's published status
    const updatedPoll = await prisma.poll.update({
      where: { id },
      data: { isPublished },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    // Format the response
    const formattedPoll = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      isPublished: updatedPoll.isPublished,
      totalVotes: updatedPoll._count.votes,
      options: updatedPoll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option._count.votes
      }))
    };

    // Notify all connected clients about the poll update
    if (req.notifyPollUpdated) {
      req.notifyPollUpdated(formattedPoll);
    }

    res.status(200).json({
      status: 'success',
      data: formattedPoll
    });
  } catch (error) {
    console.error('Error updating poll status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update poll status'
    });
  }
};

// Vote on a poll option
const voteOnPoll = async (req, res) => {
  try {
    const { pollId, optionId } = req.body;
    const userId = req.user.id;

    // Check if poll exists and is published
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true }
    });

    if (!poll || !poll.isPublished) {
      return res.status(404).json({
        status: 'error',
        message: 'Poll not found or not published'
      });
    }

    // Check if option belongs to the poll
    const optionExists = poll.options.some(option => option.id === optionId);
    if (!optionExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid option for this poll'
      });
    }

    // Check if user has already voted on this poll
    const existingVote = await prisma.vote.findFirst({
      where: {
        userId,
        pollId
      }
    });

    if (existingVote) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already voted on this poll'
      });
    }

    // Create the vote
    const vote = await prisma.vote.create({
      data: {
        userId,
        pollId,
        pollOptionId: optionId
      },
      include: {
        pollOption: true
      }
    });

    // Get updated poll with vote counts
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    // Format the response
    const formattedPoll = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      totalVotes: updatedPoll._count.votes,
      options: updatedPoll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option._count.votes,
        isSelected: option.id === optionId
      }))
    };

    // Notify all connected clients about the new vote
    if (req.notifyVoteCast) {
      req.notifyVoteCast(vote);
    }

    res.status(201).json({
      status: 'success',
      data: {
        vote: {
          id: vote.id,
          optionId: vote.pollOptionId,
          optionText: vote.pollOption.text
        },
        poll: formattedPoll
      }
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process your vote'
    });
  }
};

// Delete a poll (only by the creator)
const deletePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if poll exists and belongs to the user
    const poll = await prisma.poll.findUnique({
      where: { id }
    });

    if (!poll) {
      return res.status(404).json({
        status: 'error',
        message: 'Poll not found'
      });
    }

    if (poll.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this poll'
      });
    }

    // Delete the poll (cascade delete will handle related records)
    await prisma.poll.delete({
      where: { id }
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete poll'
    });
  }
};

module.exports = {
  createPoll,
  getAllPolls,
  getPoll,
  updatePollPublishStatus,
  voteOnPoll,
  deletePoll
};
