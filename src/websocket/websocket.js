const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store connected clients
const clients = new Set();
let wss;

// WebSocket message types
const MESSAGE_TYPES = {
  VOTE_CAST: 'VOTE_CAST',
  POLL_CREATED: 'POLL_CREATED',
  POLL_UPDATED: 'POLL_UPDATED'
};

// Initialize WebSocket server
function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    clients.add(ws);

    // Handle client disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server started');
  return wss;
}

// Broadcast a message to all connected clients
function broadcast(message) {
  if (!wss) return;
  
  const messageString = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Notify clients when a new vote is cast
async function notifyVoteCast(vote) {
  // Get the poll with options and vote counts
  const poll = await prisma.poll.findUnique({
    where: { id: vote.pollId },
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

  if (!poll) return;

  // Format the response
  const response = {
    type: MESSAGE_TYPES.VOTE_CAST,
    data: {
      pollId: poll.id,
      totalVotes: poll._count.votes,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      }))
    }
  };

  broadcast(response);
}

// Notify clients when a new poll is created
function notifyPollCreated(poll) {
  const response = {
    type: MESSAGE_TYPES.POLL_CREATED,
    data: poll
  };
  broadcast(response);
}

// Notify clients when a poll is updated
function notifyPollUpdated(poll) {
  const response = {
    type: MESSAGE_TYPES.POLL_UPDATED,
    data: poll
  };
  broadcast(response);
}

module.exports = {
  initWebSocket,
  notifyVoteCast,
  notifyPollCreated,
  notifyPollUpdated,
  MESSAGE_TYPES
};
