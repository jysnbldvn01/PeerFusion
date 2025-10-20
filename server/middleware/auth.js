const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  console.log('Auth Header:', authHeader); // Debug log
  
  // Check if authorization header exists and has proper format
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization header format. Expected: Bearer <token>' });
  }

  const token = parts[1];
  
  // Check if token exists and is not empty
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log('Verifying token:', token.substring(0, 20) + '...');
    
    // Verify the token first
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully for user:', decoded.id);
    
    const [users] = await db.query('SELECT id, status FROM users WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      console.log('User not found in database:', decoded.id);
      return res.status(403).json({ error: 'User account no longer exists' });
    }
    
    const user = users[0];
    console.log('User status:', user.status);
    
    if (user.status === 'inactive') {
      console.log('User is suspended:', decoded.id);
      return res.status(403).json({ 
        error: 'Your account has been suspended. Please contact support.' 
      });
    }

    req.user = decoded;
    console.log('Authentication successful for user:', decoded.id);
    next();
    
  } catch (err) {
    console.error('JWT verify error details:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Token length:', token ? token.length : 'No token');
    
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      if (err.message.includes('malformed')) {
        return res.status(403).json({ error: 'Invalid token format' });
      } else if (err.message.includes('invalid signature')) {
        return res.status(403).json({ error: 'Invalid token signature' });
      } else {
        return res.status(403).json({ error: 'Invalid token: ' + err.message });
      }
    } else {
      console.error('Unexpected error during authentication:', err);
      return res.status(500).json({ error: 'Authentication error' });
    }
  }
}

module.exports = authenticateToken;