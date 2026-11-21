const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const configuredUsername = process.env.ADMIN_USERNAME || 'catcpn';
const configuredPassword = process.env.ADMIN_PASSWORD || '';
const configuredPasswordHash = configuredPassword ? bcrypt.hashSync(configuredPassword, 12) : null;

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!configuredPasswordHash) {
    return res.status(503).json({ message: 'Admin sign-in is not configured. Set ADMIN_PASSWORD in your .env file.' });
  }

  const usernameMatches = typeof username === 'string' && username === configuredUsername;
  const passwordMatches = typeof password === 'string' && await bcrypt.compare(password, configuredPasswordHash);

  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Incorrect username or password.' });
  }

  const token = jwt.sign({ role: 'admin', username: configuredUsername }, process.env.JWT_SECRET, { expiresIn: '12h' });
  return res.json({ token, username: configuredUsername, expiresIn: '12h' });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username, role: req.admin.role });
});

module.exports = router;
