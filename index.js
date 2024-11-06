require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const knex = require('knex')
const path = require('path');
const { AssemblyAI } = require('assemblyai');
const openaiRequest = require('./src/openairequest');
// const transcribeWithAssemblyAI = require('./src/transcriptions')

// Firebase Admin SDK
const admin = require('firebase-admin');

// Get environment (dev or prod)
const environment = process.env.NODE_ENV || 'development';
const config = require('./knexfile')[environment];
const db = knex(config);

// Initialize Firebase
const serviceAccount = require('./dungeon-memories-77f7e-firebase-adminsdk-r1sal-81e1570c04.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.STORAGE_BUCKET,
});
const bucket = admin.storage().bucket();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // TODO - Update with frontend URL in production
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

// Map to manage the rooms and their participants
// The structure should contain: room id, participants (their sockets ids), and audio chunks
const rooms = new Map();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Join a room
  socket.on('joinRoom', (roomId) => {
    console.log(`client ${socket.id} has joined the room: ${roomId}`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {participants: new Set(), audioChunks: []})
    }
    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    socket.join(roomId);
  })

  // Collect audio chunks
  let audioChunks = [];

  socket.on('audioChunk', (data) => {
    // Find the room the socket is in
    for (const [roomId, room] of rooms) {
      if (room.participants.has(socket.id)) {
        // Push audio data to the room collective audio buffer
        room.audioChunks.push(Buffer.from(data));
        break;
      }
    }
  });

  // Handle client disconnect
  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Find and remove client from the room
    for (const [roomId, room] of rooms) {
      // Check if the socket deletion is successful
      if (room.participants.delete(socket.id)) {
        // If the room is empty, finalize the audio and save
        if (room.participants.size === 0) {
          if (room.audioChunks.length > 0) {
            // Concatemate audio chunks into a single buffer
            const audioBuffer = Buffer.concat(room.audioChunks);
            await saveAudioToFirebase(audioBuffer, roomId);
          }
          rooms.delete(roomId); 
        }
        break;
      }
    }
  });
});

// New independent function to save audio bugger to Firebase

async function saveAudioToFirebase(audioBuffer, roomId) {
  // Define the filename
  const filename = `audio_${roomId}_${Date.now()}.webm`;
  console.log (filename);
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
        // roomId: roomId, // TODO - Is the roomId useful?? maybe as the game session Name? If so, need to modify database
        // Include session_id and user_id if available
      });
      console.log('Audio file reference saved to database');
      
      // Start transcription after saving
      const transcriptText = await transcribeWithAssemblyAI (publicUrl, roomId);
    } catch (err) {
      console.error('Error saving to database:', err);
    }
  });

   // Write the audio buffer to the stream
   stream.end(audioBuffer);
}

async function transcribeWithAssemblyAI (audioUrl, roomId) {
    console.log("transcription started for: ", audioUrl)
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });
    console.log("API key: ", process.env.ASSEMBLYAI_API_KEY);
  
    const audioFile = audioUrl;
    const params = {
      audio: audioFile,
      speech_model: 'best',
      language_detection: true,
    }
  
    const run = async () => {
      console.log("Before transcript")
      const transcript  = await client.transcripts.transcribe(params);
      console.log("After transcript: ", transcript);
      
  
      if (transcript.status === 'error') {
        console.error(`Transcription failed: ${transcript.error}`);
        process.exit(1);
      }
  
      console.log("Transcript : ", transcript.text);
      const summaryAI = await openaiRequest(transcript.text);
      console.log("SummaryAI : ", summaryAI);
    }
    run();
  }

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});