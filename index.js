require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const environment = process.env.NODE_ENV || 'development';
const config = require('./knexfile')[environment];
const knex = require('knex')(config);

const app = express();
const server = http.createServer(app);

const recordingsDir = path.join(__dirname, 'recordings');

// Ensure the recordings directory exists
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
  console.log('Created recordings directory');
} else {
  console.log('Recordings directory already exists');
}

const io = new Server(server, {
  cors: {
    origin: '*', // TO DO - Update with frontend URL in production
  },
});

const userRoutes = require ("./routes/users");

app.use(cors());
app.use(express.json());
app.use("/users", userRoutes);

// Simple route to test server
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Route for downloading the audio files
const audioFilesRoutes = require("./routes/audioFiles");
app.use('/audio', audioFilesRoutes);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Create a write stream for the audio file
  const filename = `audio_${socket.id}_${Date.now()}.webm`;
  const filePath = path.join(__dirname, 'recordings', filename);
  const writeStream = fs.createWriteStream(filePath);
  console.log('Saving audio to:', filePath);

  writeStream.on('error', (err) => {
    console.error('Error writing to file:', err);
  });

  socket.on('audioChunk', (data) => {
    try {
      // Write audio chunk to file
      writeStream.write(Buffer.from(data));
    } catch (error) {
      console.error("Error writing audio chink: ", error);
    }

    // TO DO - implement real-time transcription here
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    writeStream.end(() => {
      console.log("Finished writing audio file.")
    });

    // Save file reference to the database
    knex('audio_files')
      .insert({
        filename: filename,
        // Add session_id and user_id if available
      })
      .then(() => {
        console.log('Audio file reference saved to database');
      })
      .catch((err) => {
        console.error('Error saving to database:', err);
      });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});