// Firebase Admin SDK
import admin from 'firebase-admin';
import db from '../database.js';
import fs from 'fs/promises';

// Initialize Firebase
const serviceAccount = JSON.parse(
    await fs.readFile(new URL('../dungeon-memories-77f7e-firebase-adminsdk-r1sal-81e1570c04.json', import.meta.url))
);
  
// Initialize Firebase only once
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.STORAGE_BUCKET,
    });
}
  
export const bucket = admin.storage().bucket();

export async function uploadAudioToFirebase(audioBuffer, roomId) {
    // Define the filename
    const filename = `audio_${roomId}_${Date.now()}.webm`;
    // Create a file reference in Firebase Storage
    const file = bucket.file(filename);
    // Create a stream to upload the file
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'audio/webm',
      },
    });

    return new Promise((resolve, reject) => {
        stream.on('finish', async () => {
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
          try {
            // Save the file URL to the database
            await db('audio_files').insert({ filename, url: publicUrl });
            console.log('Audio file reference saved to database');
            resolve(publicUrl); // Return the public URL
          } catch (err) {
            console.error('Error saving to database:', err);
            reject(err);
          }
        });
    
        stream.on('error', (err) => {
          console.error('Error uploading to Firebase Storage:', err);
          reject(err);
        });
    
        // Write the audio buffer to the stream
        stream.end(audioBuffer);
    });
}
