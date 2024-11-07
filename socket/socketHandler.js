import { uploadAudioToFirebase } from '../services/firebaseService.js';
import { transcribeWithAssemblyAI } from '../services/assemblyaiService.js';
import { summarizeText } from '../services/openaiService.js';

const rooms = new Map();

export function handleSocketConnection(io) {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join a room
    socket.on('joinRoom', (roomId) => {
      if (!rooms.has(roomId)) rooms.set(roomId, { participants: new Set(), audioChunks: [] });
      rooms.get(roomId).participants.add(socket.id);
      socket.join(roomId);
      console.log(`Client ${socket.id} joined room: ${roomId}`);
    });

    // Collect chunks
    socket.on('audioChunk', (data) => {
      for (const [roomId, room] of rooms) {
        if (room.participants.has(socket.id)) {
          room.audioChunks.push(Buffer.from(data));
          break;
        }
      }
    });

    // Manage disconnect of client
    // TODO - More modular, transcript and summary triggered by user/admin
    socket.on('disconnect', async () => {
      for (const [roomId, room] of rooms) {
        if (room.participants.delete(socket.id) && room.participants.size === 0) {
          const audioBuffer = Buffer.concat(room.audioChunks);
          try {
            const audioUrl = await uploadAudioToFirebase(audioBuffer, roomId);
            console.log("Audio URL: ", audioUrl)
            const transcriptText = await transcribeWithAssemblyAI(audioUrl);
            console.log("Transcript Text: ", transcriptText)
            const summaryAI = await summarizeText(transcriptText);
            console.log("AI Summary:", summaryAI);
          } catch (err) {
            console.error('Error during transcription and summarization:', err);
          }
          rooms.delete(roomId);
        }
      }
    });
  });
}