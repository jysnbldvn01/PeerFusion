const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  console.log('Auth Header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization header format. Expected: Bearer <token>' });
  }

  const token = parts[1];
  
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log('Verifying token:', token.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully for user:', decoded.id);
    
    const [users] = await db.query(
      'SELECT id, status, suspended_until, strike_count, deactivation_requested_at, deletion_scheduled_at, scheduled_for_deletion_at FROM users WHERE id = ?', 
      [decoded.id]
    );
    
    if (users.length === 0) {
      console.log('User not found in database:', decoded.id);
      return res.status(403).json({ error: 'User account no longer exists' });
    }
    
    const user = users[0];
    console.log('User status:', user.status);
    console.log('User suspended until:', user.suspended_until);
    console.log('User strike count:', user.strike_count);
    console.log('User deactivation requested at:', user.deactivation_requested_at);
    console.log('User deletion scheduled at:', user.deletion_scheduled_at);
    
    // Handle different statuses with priority for admin actions
    if (user.status === 'banned') {
      console.log('User is banned:', decoded.id);
      return res.status(403).json({ 
        error: 'Your account has been permanently banned. Please contact support.',
        status: 'banned'
      });
    } else if (user.status === 'suspended') {
      // Check if suspension period has ended
      if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
        const timeLeft = Math.ceil((new Date(user.suspended_until) - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          error: `Your account has been suspended. It will be reactivated in ${timeLeft} days.`,
          status: 'suspended',
          suspended_until: user.suspended_until
        });
      } else {
        // Auto-reactivate if suspension period has passed
        console.log('Auto-reactivating user from suspension:', decoded.id);
        await db.query(
          'UPDATE users SET status = "active", suspended_until = NULL WHERE id = ?',
          [decoded.id]
        );
        // Update user object for subsequent checks
        user.status = 'active';
      }
    } else if (user.status === 'deletion_pending') {
      // Check if deletion period has passed
      if (user.scheduled_for_deletion_at && new Date(user.scheduled_for_deletion_at) <= new Date()) {
        console.log('User deletion period has passed, account should be deleted:', decoded.id);
        return res.status(403).json({ 
          error: 'Your account has been permanently deleted. Please contact support if you believe this is an error.',
          status: 'deleted'
        });
      } else {
        // Allow users pending deletion to login so they can cancel deletion
        console.log('User is pending deletion but can login to cancel:', decoded.id);
        req.userAccountStatus = {
          status: 'deletion_pending',
          scheduled_for_deletion_at: user.scheduled_for_deletion_at,
          days_until_deletion: user.scheduled_for_deletion_at 
            ? Math.ceil((new Date(user.scheduled_for_deletion_at) - new Date()) / (1000 * 60 * 60 * 24))
            : null
        };
      }
    } else if (user.status === 'deactivated') {
      // Allow deactivated users to login so they can reactivate
      console.log('User is deactivated but can login to reactivate:', decoded.id);
      req.userAccountStatus = {
        status: 'deactivated',
        deactivation_requested_at: user.deactivation_requested_at
      };
    } else if (user.status === 'warning') {
      // User can still login but has warnings
      console.log('User has warnings with strike count:', user.strike_count);
      req.userWarning = {
        strike_count: user.strike_count,
        status: 'warning'
      };
    } else if (user.status === 'active') {
      console.log('User is active and can proceed:', decoded.id);
      // Normal active user, no special handling needed
    }

    // Add account status info to request for all users
    req.userAccountStatus = req.userAccountStatus || {
      status: user.status,
      is_deactivated: user.status === 'deactivated',
      is_pending_deletion: user.status === 'deletion_pending',
      is_banned: user.status === 'banned',
      is_suspended: user.status === 'suspended',
      is_active: user.status === 'active' || user.status === 'warning',
      strike_count: user.strike_count,
      suspended_until: user.suspended_until,
      deactivation_requested_at: user.deactivation_requested_at,
      deletion_scheduled_at: user.deletion_scheduled_at,
      scheduled_for_deletion_at: user.scheduled_for_deletion_at
    };

    req.user = decoded;
    console.log('Authentication successful for user:', decoded.id, 'with status:', user.status);
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