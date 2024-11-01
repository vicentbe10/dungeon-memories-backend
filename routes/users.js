const express = require('express');
const router = express.Router();
const environment = process.env.NODE_ENV || 'development';
const config = require('../knexfile')[environment];
const knex = require('knex')(config);
const bcrypt = require('bcrypt');

// Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Hash the password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  try {
    const [user] = await knex('users')
      .insert({ username, email, password_hash })
      .returning(['id', 'username', 'email']);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login a user
router.post('/login', async (req, res) => {
  // TO DO - Implement login logic
});

module.exports = router;