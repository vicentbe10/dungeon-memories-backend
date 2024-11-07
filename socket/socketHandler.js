import { uploadAudioToFirebase } from '../services/firebaseService.js';
import { transcribeWithAssemblyAI } from '../services/assemblyaiService.js';
import { summarizeText } from '../services/openaiService.js';

const rooms = new Map();

function formatUtterances(utterances) {
  return utterances.map(u => `Speaker ${u.speaker}: ${u.text}`).join('\n');
}

export function handleSocketConnection(io) {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join a room
    socket.on('joinRoom', (roomId) => {
      try {
        console.log(`Client ${socket.id} attempting to join room: ${roomId}`);
        if (!rooms.has(roomId)) {
          rooms.set(roomId, { participants: new Set(), audioChunks: [] });
          console.log(`Created new room: ${roomId}`);
        }
        rooms.get(roomId).participants.add(socket.id);
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room: ${roomId}`);

        // Emit success to the client
        console.log(`Emitting 'joinRoomSuccess' to client ${socket.id}`);
        socket.emit('joinRoomSuccess');
      } catch (error) {
        console.error(`Error in joinRoom for client ${socket.id}:`, error);
        socket.emit('joinRoomError', 'Failed to join room.');
      }
    });

    // Collect audio chunks
    socket.on('audioChunk', (data) => {
      try {
        console.log(`Received audioChunk from client ${socket.id}`);
        for (const [roomId, room] of rooms) {
          if (room.participants.has(socket.id)) {
            room.audioChunks.push(Buffer.from(data));
            console.log(`Added audioChunk to room ${roomId}`);
            break;
          }
        }
      } catch (error) {
        console.error(`Error in audioChunk from client ${socket.id}:`, error);
        socket.emit('error', 'Failed to process audio chunk.');
      }
    });

    // Handle stopRecording event
    socket.on('stopRecording', async () => {
      try {
        console.log(`Client ${socket.id} requested to stop recording.`);

        // Find the room of the socket
        let userRoomId = null;
        for (const [roomId, room] of rooms) {
          if (room.participants.has(socket.id)) {
            userRoomId = roomId;
            break;
          }
        }

        if (!userRoomId) {
          console.log(`Client ${socket.id} is not in any room.`);
          socket.emit('error', 'You are not in any room.');
          return;
        }

        const room = rooms.get(userRoomId);
        if (!room) {
          console.log(`Room ${userRoomId} not found for client ${socket.id}.`);
          socket.emit('error', 'Room not found.');
          return;
        }

        // Concatenate all audio chunks
        const audioBuffer = Buffer.concat(room.audioChunks);
        room.audioChunks = []; // Clear audio chunks

        // Proceed with processing
        console.log(`Processing audio for room ${userRoomId}`);

        // Emit transcription start
        socket.emit('transcriptionStart');

        // Upload audio to Firebase
        const audioUrl = await uploadAudioToFirebase(audioBuffer, userRoomId);
        console.log("Audio URL: ", audioUrl);

        // Transcribe with AssemblyAI
        const transcript = await transcribeWithAssemblyAI(audioUrl);
        console.log("Transcript Text: ", transcript.text);
        console.log("Transcript Utterances: ", transcript.utterances);
        
        // Format utterances for summarization
        const formattedTranscript = formatUtterances(transcript.utterances);
        console.log("Formatted Transcript for Summarization:", formattedTranscript);

        // Emit transcription progress
        socket.emit('transcription', formattedTranscript);
        socket.emit('transcriptionComplete');

        // Emit summarization start
        socket.emit('summarizing');

        // Summarize with OpenAI
        const summaryAI = await summarizeText(formattedTranscript);
        console.log("AI Summary:", summaryAI);

        // Emit summary
        socket.emit('summary', summaryAI);
        socket.emit('summaryComplete');
      } catch (err) {
        console.error('Error during transcription and summarization:', err);
        socket.emit('error', 'An error occurred during processing.');
      }
    });

    // Manage disconnect of client
    socket.on('disconnect', () => {
      try {
        console.log(`Client disconnected: ${socket.id}`);
        for (const [roomId, room] of rooms) {
          if (room.participants.delete(socket.id)) {
            console.log(`Client ${socket.id} left room: ${roomId}`);
            if (room.participants.size === 0) {
              // Room is now empty, process audio
              const audioBuffer = Buffer.concat(room.audioChunks);
              room.audioChunks = [];
              console.log(`Processing empty room ${roomId}`);
              (async () => {
                try {
                  const audioUrl = await uploadAudioToFirebase(audioBuffer, roomId);
                  console.log("Audio URL: ", audioUrl);
                  const transcriptText = await transcribeWithAssemblyAI(audioUrl);
                  console.log("Transcript Text: ", transcriptText);
                  console.log("Transcript Utterances: ", transcript.utterances);
                  const summaryAI = await summarizeText(formattedTranscript);
                  console.log("AI Summary:", summaryAI);
                } catch (err) {
                  console.error('Error during transcription and summarization:', err);
                }
              })();
              rooms.delete(roomId);
              console.log(`Room ${roomId} deleted as it became empty.`);
            }
            break;
          }
        }
      } catch (error) {
        console.error(`Error during disconnect handling for client ${socket.id}:`, error);
      }
    });
  });
}