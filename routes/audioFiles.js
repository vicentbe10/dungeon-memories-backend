import express from 'express';
import db from '../database.js';
import { bucket } from '../services/firebaseService.js';

const router = express.Router();

// Firebase Admin SDK
import admin from 'firebase-admin';

// TODO: Middleware for authentication
// const authenticate = require('../middleware/authenticate');

router.get('/download/:filename', /* authenticate, */ async (req, res) => {
  const filename = req.params.filename;
  
  try {
    // Fetch file record from the database
    const fileRecord = await db('audio_files')
      .where({ filename})
      .first();

    if (!fileRecord) {
      console.error('File not found in the database.');
      return res.status(404).send('File not found.');
    }

    // Get a reference to the file in Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(filename);

    // Generate a signed URL for the file (valid for 1hour)
    const expiresAt = Date.now() + 60 * 60 * 1000;

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAt,
    });

    if (!url) {
      console.error('Failed to generate signed URL.');
      return res.status(500).send('Error generating download URL.');
    }

    // Redirect the client to the signed URL
    res.redirect(url);

  } catch (err) {
      console.error('Error in download route: ', err);
      res.status(500).send('Error downloading file.');
  }
});

export default router;