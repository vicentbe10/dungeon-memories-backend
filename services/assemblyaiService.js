import { AssemblyAI } from "assemblyai";
import dotenv from 'dotenv';
dotenv.config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY}
);

export async function transcribeWithAssemblyAI(audioUrl) {
  try{
    const transcriptRequest = await client.transcripts.transcribe({
      audio: audioUrl,
      speech_model: 'best',
      language_detection: true,
      speaker_labels: true,  
    });

    const transcriptId = transcriptRequest.id;
    console.log('Transcript ID:', transcriptId);

    // Poll for transcription completion
    const transcript = await pollForTranscription(transcriptId);
    return { text: transcript.text, utterances: transcript.utterances };
  } catch (error) {
    console.error('Error in AssemblyAI transcription:', error);
    throw error;
  }
}
  
async function pollForTranscription(transcriptId) {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {
        // Get the transcription status
        const transcript = await client.transcripts.get(transcriptId);

        console.log('Transcription status:', transcript.status);

        if (transcript.status === 'completed') {
          clearInterval(intervalId);
          resolve(transcript); // Return the entire transcript object
        } else if (transcript.status === 'error') {
          clearInterval(intervalId);
          console.error('Transcription failed:', transcript.error);
          reject(new Error('Transcription failed'));
        }
      } catch (error) {
        console.error('Error polling transcription status:', error);
      }
    }, 2000); // Poll every 2 seconds
  });
}