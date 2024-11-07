// Placeholder for code refactoring
require ('dotenv').config();
const { AssemblyAI } = require('assemblyai');
const assemblyai = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY
});

async function transcribeWithAssemblyAI (audioUrl, roomId) {
    console.log("transcription started for: ", audioUrl)
  
    const audioFile = audioUrl;
    const params = {
      audio: audioFile,
      speech_model: 'best',
      language_detection: true,
    }
  
    const run = async () => {
      console.log("Before transcript")
      const transcript  = await assemblyai.transcripts.transcribe(params);
      console.log("After transcript: ", transcript);
      
  
      if (transcript.status === 'error') {
        console.error(`Transcription failed: ${transcript.error}`);
        process.exit(1);
      }
  
      return transcript.id;
    }
    run();
  }

  async function pollForTranscriptionCompletion(transcriptId) {
      
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        try {
            const transcript = await assemblyai.transcripts.get(transcriptId);
        
            if (transcript.status === 'completed') {
              clearInterval(intervalId);
              console.log('Transcription completed');
              resolve(transcript.text);
            } else if (transcript.status === 'failed') {
              clearInterval(intervalId);
              console.error('Transcription failed:', transcript.error);
              reject(new Error('Transcription failed'));
            }
        } catch (error) {
          console.error('Error polling transcription status:', error);
        }
      }, 5000); // Poll every 5 seconds
    });
  }

  module.exports = {transcribeWithAssemblyAI, pollForTranscriptionCompletion};