const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require("fs");

// TO DO Middleware for authentication
// const authenticate = require('../middleware/authenticate');

router.get('/download/:filename', /* authenticate, */ (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'recordings', filename);
  
  console.log('__dirname:', __dirname);
  console.log('filePath:', filePath);

  //Check if the file exists
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.error("File not found or inaccessible: ", err);
      return res.status(404).send("File not found.");
    }
  })

  // Security check: Ensure the file exists and the user has permission to access it
  // Maybe even checking the database to verify ownership

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).send('Error downloading file: ', err.message);
    }
  });
});

module.exports = router;