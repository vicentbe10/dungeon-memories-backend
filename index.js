require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const knex = require('knex')
const path = require('path');

// Firebase Admin SDK
const admin = require('firebase-admin');

// Get environment (dev or prod)
const environment = process.env.NODE_ENV || 'development';
const config = require('./knexfile')[environment];
const db = knex(config);

// Initialize Firebase
if (process.env.NODE_ENV === 'production') {
  const serviceAccount = require('./sercice-account.json');
} else {
  const serviceAccount = require('./dungeon-memories-77f7e-firebase-adminsdk-r1sal-81e1570c04.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // TO DO - Update with frontend URL in production
  },
});

app.use(cors());
app.use(express.json());

// Import routes
const userRoutes = require ('./routes/users');
app.use('/users', userRoutes);

// Route for downloading the audio files
const audioFilesRoutes = require('./routes/audioFiles');
app.use('/audio', audioFilesRoutes);

// Simple route to test server
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Collect audio chunks
  let audioChunks = [];

  socket.on('audioChunk', (data) => {
    // Collect audio data chunks
    audioChunks.push(Buffer.from(data));
  });

  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (audioChunks.length > 0) {
      // Concatenate audio chunks into a single buffer
      const audioBuffer = Buffer.concat(audioChunks);

      // Define the filename
      const filename = `audio_${socket.id}_${Date.now()}.webm`;

      // Create a file reference in Firebase Storage
      const file = bucket.file(filename);

      // Create a stream to upload the file
      const stream = file.createWriteStream({
        metadata: {
          contentType: 'audio/webm',
        },
      });

      // Handle errors during upload
      stream.on('error', (err) => {
        console.error('Error uploading to Firebase Storage:', err);
      });

      // Handle successful upload
      stream.on('finish', async () => {
        console.log('Audio file uploaded to Firebase Storage');

        // Get the public URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
        console.log("Public URL : ", publicUrl);

        // Save the file URL to the database
        try {
          await db('audio_files').insert({
            filename: filename,
            url: publicUrl,
            // Include session_id and user_id if available
          });
          console.log('Audio file reference saved to database');
        } catch (err) {
          console.error('Error saving to database:', err);
        }
      });

      // Write the audio buffer to the stream
      stream.end(audioBuffer);
    } else {
      console.log('No audio data received from client.');
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});