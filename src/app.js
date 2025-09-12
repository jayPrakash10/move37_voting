require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

// Import routes
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const pollRouter = require('./routes/pollRoutes');

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
const { initWebSocket, notifyVoteCast, notifyPollCreated, notifyPollUpdated } = require('./websocket/websocket');
initWebSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Add WebSocket notifications to request object
app.use((req, res, next) => {
  req.notifyVoteCast = notifyVoteCast;
  req.notifyPollCreated = notifyPollCreated;
  req.notifyPollUpdated = notifyPollUpdated;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Voting API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    websocket: {
      status: 'active',
      endpoint: `ws://localhost:${process.env.PORT || 3000}`
    },
    documentation: 'Coming soon...'
  });
});

// API Routes
app.use('/users', authRouter);
app.use('/users', userRouter);
app.use('/polls', pollRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`HTTP Server is running on port ${PORT}`);
  console.log(`WebSocket Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    prisma.$disconnect();
    console.log('Process terminated');
  });
});

// Export both app and server for testing
module.exports = { app, server };
