import express from 'express';
import bcrypt from 'bcrypt';
import db from '../database.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  // Hash the password
  const saltRounds = 10;
  let password_hash;
  try {
    password_hash = await bcrypt.hash(password, saltRounds);
  } catch (hashError) {
    console.error('Error hashing password:', hashError);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  try {
    const [user] = await db('users')
      .insert({ username, email, password_hash })
      .returning(['id', 'username', 'email']); // Adjust based on your database driver

    res.status(201).json(user);
  } catch (dbError) {
    console.error('Error inserting user into database:', dbError);

    // Handle duplicate entries (e.g., duplicate email)
    if (dbError.code === '23505') { // PostgreSQL unique violation error code
      return res.status(409).json({ error: 'Email already in use.' });
    }

    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// Login a user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Fetch user from the database
    const user = await db('users')
      .where({ email })
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // TODO: Implement JWT or session-based authentication
    // For demonstration, we'll return user info without password_hash
    const { password_hash: _, ...userWithoutPassword } = user;

    res.status(200).json({ message: 'Login successful.', user: userWithoutPassword });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

// const express = require('express');
// const router = express.Router();
// const environment = process.env.NODE_ENV || 'development';
// const config = require('../knexfile')[environment];
// const knex = require('knex')(config);
// const bcrypt = require('bcrypt');

// // Register a new user
// router.post('/register', async (req, res) => {
//   const { username, email, password } = req.body;

//   // Hash the password
//   const saltRounds = 10;
//   const password_hash = await bcrypt.hash(password, saltRounds);

//   try {
//     const [user] = await knex('users')
//       .insert({ username, email, password_hash })
//       .returning(['id', 'username', 'email']);
//     res.status(201).json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to register user' });
//   }
// });

// // Login a user
// router.post('/login', async (req, res) => {
//   // TO DO - Implement login logic
// });

// export default router;