// routes/firebaseToken.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const userId = String(req.user.id);
    const customToken = await admin.auth().createCustomToken(userId);
    res.json({ token: customToken });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: 'Error creating token' });
  }
});

module.exports = router;