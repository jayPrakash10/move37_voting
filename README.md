# Voting/Polling System API

A real-time voting/polling system built with Node.js, Express, PostgreSQL, Prisma, and WebSockets. This API allows users to create, manage, and vote on polls with real-time updates.

## Features

- 🔐 JWT Authentication
- 📊 Create and manage polls
- 🗳️ Vote on polls
- 🔄 Real-time updates via WebSockets
- 🔍 Filter polls by published status
- 👤 User management

## Prerequisites

- Node.js (v18 or later)
- npm (comes with Node.js)
- PostgreSQL (v14 or later)

## Quick Start

1. Clone the repository
   ```bash
   git clone https://github.com/jayPrakash10/move37_voting
   cd voting-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:

   Create a .env file by copying the .env.example file and updating the environment variables.
   
   OR
   
   ```bash
   cp .env.example .env
   # Update environment variables in .env
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000`.
   
   Open above link in browser to check web-socket logs.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to run the server | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | - |
| `JWT_SECRET` | Secret for JWT tokens | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `30d` |

## API Documentation

### Authentication

#### Register a new user
```http
POST /users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Polls

#### Create a new poll (requires auth)
```http
POST /polls
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What's your favorite programming language?",
  "options": ["JavaScript", "Python", "TypeScript", "Java"]
}
```

#### Get all polls
```http
GET /polls
Authorization: Bearer <token>
```

#### Get a single poll
```http
GET /polls/:id
Authorization: Bearer <token>
```

#### Update poll publish status
```http
PATCH /polls/:id/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "isPublished": true
}
```

#### Vote on a poll
```http
POST /polls/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "pollId": "uuid-here",
  "optionId": "uuid-here"
}
```

#### Delete a poll
```http
DELETE /polls/:id
Authorization: Bearer <token>
```

## WebSocket Events

The API supports the following WebSocket events:

- `vote:cast` - Triggered when a new vote is cast
- `poll:created` - Triggered when a new poll is created
- `poll:updated` - Triggered when a poll is updated

## Error Responses

All error responses follow this format:
```json
{
  "status": "error",
  "message": "Descriptive error message"
}
```

## Security

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Input validation on all endpoints
- CORS enabled with secure defaults
- Helmet.js for security headers
