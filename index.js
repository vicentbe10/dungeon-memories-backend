import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleSocketConnection } from './socket/socketHandler.js';
import userRoutes from './routes/users.js';
import audioFilesRoutes from './routes/audioFiles.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: '*' // TODO Update with the frontend in prod
  } 
});

app.use(cors());
app.use(express.json());

// Import routes
app.use('/users', userRoutes); // TODO - Re-think the impact with the new Firabase Authentication
app.use('/audio', audioFilesRoutes); // TODO - Re-think the impact with Firebase Storage
// TODO - Routes for getting Transcripts and Summaries

// Route to test server
app.get('/', (req, res) => res.send('Server is running'));

// Socket.io connection handler
handleSocketConnection(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));