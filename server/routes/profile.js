const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const transporter = require('../config/mailer');
const crypto = require('crypto');

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'avatar_' + Date.now() + ext);
  },
});
const upload = multer({ storage });

const createAccountStatusNotification = async (userId, message, type = 'account_status') => {
  try {
    const notificationSql = `
      INSERT INTO notifications (sender_id, receiver_id, message, type, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const [result] = await db.query(notificationSql, [0, userId, message, type]);
    console.log(`Account status notification created for user ${userId}:`, {
      notificationId: result.insertId,
      message: message,
      type: type
    });
    return result.insertId;
  } catch (err) {
    console.error('Failed to create account status notification:', err);
    throw err;
  }
};

const formatDateForManila = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication Error: No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Authentication Error: Invalid token.' });
    }
    req.user = decoded; 
    next(); 
  });
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Profile endpoint called for user ID:', req.user.id);
    
    const sql = `
      SELECT 
        up.*,
        u.strike_count,
        u.status as user_status,
        u.suspended_until,
        u.total_reports,
        u.name as user_name,
        u.email as user_email,
        u.created_at as account_created
      FROM user_profiles up
      RIGHT JOIN users u ON up.user_id = u.id
      WHERE u.id = ?
    `;
    const [results] = await db.query(sql, [req.user.id]);
    
    if (results.length > 0) {
      const profile = {
        ...results[0],
        id: results[0].user_id, 
        user_id: results[0].user_id,
        strike_count: results[0].strike_count || 0,
        status: results[0].user_status || 'active',
        suspended_until: results[0].suspended_until,
        total_reports: results[0].total_reports || 0,
        name: results[0].user_name,
        email: results[0].user_email,
        account_created: results[0].account_created
      };
      
      // Handle availability parsing
      if (profile.availability) {
        try {
          if (typeof profile.availability === 'string') {
            profile.availability = JSON.parse(profile.availability);
          }
          if (!Array.isArray(profile.availability)) {
            profile.availability = [];
          }
        } catch (err) {
          console.error('Error parsing availability:', err);
          profile.availability = [];
        }
      } else {
        profile.availability = [];
      }
      
      console.log('Returning profile with strike data:', {
        user_id: profile.user_id,
        strike_count: profile.strike_count,
        status: profile.status,
        username: profile.username
      });
      
      res.json(profile);
    } else {
      // If no profile exists, return basic user info from users table
      const [userResults] = await db.query(
        'SELECT id, name, email, strike_count, status, suspended_until, total_reports, created_at FROM users WHERE id = ?',
        [req.user.id]
      );
      
      if (userResults.length > 0) {
        const userData = userResults[0];
        const basicProfile = { 
          user_id: userData.id,
          id: userData.id,
          username: userData.name,
          email: userData.email,
          strike_count: userData.strike_count || 0,
          status: userData.status || 'active',
          suspended_until: userData.suspended_until,
          total_reports: userData.total_reports || 0,
          account_created: userData.created_at,
          availability: []
        };
        
        console.log('Returning basic user profile:', {
          user_id: basicProfile.user_id,
          strike_count: basicProfile.strike_count,
          status: basicProfile.status
        });
        
        res.json(basicProfile);
      } else {
        console.error('User not found in database');
        res.status(404).json({ 
          error: 'User not found',
          user_id: req.user.id
        });
      }
    }
  } catch (err) {
    console.error('Profile endpoint error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState
    });
    
    res.status(500).json({ 
      error: 'Database query failed',
      details: err.message 
    });
  }
});

// UPDATED: Profile setup with availability
router.post('/setup', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    console.log('Received profile setup request - Body:', req.body);

    const userId = req.user.id;

    const {
      username, bio, birthday, gender, social_links, 
      contact_number, subject, year_level, role,
      availability = '[]' // ADDED: availability field
    } = req.body;

    let birthdayValue = null;
    if (birthday) {
      const date = new Date(birthday);
      if (!isNaN(date.getTime())) {
        birthdayValue = date.toISOString().split('T')[0];
      }
    }

    const avatar = req.file?.filename;

    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role are required' });
    }

    const checkSql = 'SELECT * FROM user_profiles WHERE user_id = ?';
    const [existingProfiles] = await db.query(checkSql, [userId]);

    console.log('Existing profiles found:', existingProfiles.length);
    console.log('Birthday value being saved:', birthdayValue);
    console.log('Availability being saved:', availability); // ADDED: log availability

    if (existingProfiles.length > 0) {
      // UPDATED: Include availability in update
      let sql = `
        UPDATE user_profiles 
        SET username=?, bio=?, birthday=?, gender=?, social_links=?, 
            contact_number=?, subject=?, year_level=?, role=?, availability=?`;
      const values = [username, bio, birthdayValue, gender, social_links, 
                     contact_number, subject, year_level, role, availability];

      if (avatar) {
        sql += `, avatar=?`;
        values.push(avatar);
      }

      sql += ` WHERE user_id=?`;
      values.push(userId);

      console.log('Update SQL:', sql);
      console.log('Update values:', values);

      await db.query(sql, values);
      res.json({ message: 'Profile updated successfully' });
    } else {
      // UPDATED: Include availability in insert
      const sql = `
        INSERT INTO user_profiles 
        (user_id, username, bio, birthday, gender, social_links, 
         contact_number, avatar, subject, year_level, role, availability) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertValues = [
        userId, 
        username, 
        bio || null, 
        birthdayValue, 
        gender || null, 
        social_links || null,
        contact_number || null, 
        avatar || null, 
        subject || null, 
        year_level || null, 
        role,
        availability // ADDED: availability value
      ];

      console.log('Insert SQL:', sql);
      console.log('Insert values:', insertValues);

      await db.query(sql, insertValues);
      res.json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    console.error('Profile setup error details:');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('SQL state:', err.sqlState);
    
    res.status(500).json({ 
      error: 'Profile setup failed',
      details: err.message
    });
  }
});

// Upload avatar only
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No avatar uploaded' });

    const avatar = req.file.filename;
    const userId = req.user.id;

    const checkSql = 'SELECT * FROM user_profiles WHERE user_id = ?';
    const [existingProfiles] = await db.query(checkSql, [userId]);

    if (existingProfiles.length > 0) {
      const updateSql = 'UPDATE user_profiles SET avatar = ? WHERE user_id = ?';
      await db.query(updateSql, [avatar, userId]);
      res.json({ message: 'Avatar updated successfully' });
    } else {
      const insertSql = 'INSERT INTO user_profiles (user_id, avatar) VALUES (?, ?)';
      await db.query(insertSql, [userId, avatar]);
      res.json({ message: 'Avatar saved successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.get('/others', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.user_id AS id,
        u.username,
        u.bio,
        u.contact_number,
        u.avatar,
        u.subject,
        u.year_level,
        u.role,
        u.social_links,
        u.availability,
        u.rating,
        u.total_reviews,
        usr.status as user_status,
        usr.deactivation_requested_at,
        usr.scheduled_for_deletion_at,
        EXISTS(
          SELECT 1 FROM feedback f 
          WHERE f.receiver_id = u.user_id AND f.is_recommended = true
        ) AS is_recommended
      FROM user_profiles u
      JOIN users usr ON usr.id = u.user_id
      WHERE u.user_id != ?
        AND (u.role = 'Skill Sharer' OR u.role = 'Skill Learner & Sharer')
        AND (
          usr.status = 'active' 
          OR usr.status = 'warning'
          OR (usr.status = 'deletion_pending' AND usr.scheduled_for_deletion_at > NOW())
        )
        AND usr.status != 'deactivated'
        AND usr.status != 'banned'
        AND (usr.suspended_until IS NULL OR usr.suspended_until <= NOW())
      ORDER BY u.rating DESC
    `;

    const [results] = await db.query(sql, [req.user.id]);
    console.log(' Query successful, found users:', results.length);

    // Parse availability JSON strings
    const usersWithParsedAvailability = results.map(user => {
      if (user.availability && typeof user.availability === 'string') {
        try {
          user.availability = JSON.parse(user.availability);
        } catch (err) {
          console.error('Error parsing availability for user:', user.id, err);
          user.availability = [];
        }
      } else if (!user.availability) {
        user.availability = [];
      }
      return user;
    });

    res.json(usersWithParsedAvailability);
  } catch (err) {
    console.error('DATABASE ERROR in /others route:', err.message);
    res.status(500).json({
      success: false,
      error: 'Database query failed',
      details: err.message
    });
  }
});


router.get('/recommended', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        DISTINCT u.user_id AS id,
        u.username,
        u.bio,
        u.contact_number,
        u.avatar,
        u.subject,
        u.year_level,
        u.role,
        u.social_links,
        u.availability,
        u.rating,
        u.total_reviews,
        usr.status as user_status,
        usr.deactivation_requested_at,
        usr.scheduled_for_deletion_at,
        TRUE AS is_recommended
      FROM user_profiles u
      JOIN users usr ON usr.id = u.user_id
      JOIN feedback f ON f.receiver_id = u.user_id
      WHERE u.user_id != ?
        AND (u.role = 'Skill Sharer' OR u.role = 'Skill Learner & Sharer')
        AND f.is_recommended = TRUE
        AND (
          usr.status = 'active' 
          OR usr.status = 'warning'
          OR (usr.status = 'deletion_pending' AND usr.scheduled_for_deletion_at > NOW())
        )
        AND usr.status != 'deactivated'
        AND usr.status != 'banned'
        AND (usr.suspended_until IS NULL OR usr.suspended_until <= NOW())
      ORDER BY u.rating DESC
      LIMIT 20
    `;

    const [results] = await db.query(sql, [userId]);

    const recommendedUsers = results.map(user => {
      try {
        user.availability = user.availability ? JSON.parse(user.availability) : [];
      } catch {
        user.availability = [];
      }
      return user;
    });

    res.json({
      success: true,
      recommended: recommendedUsers,
      count: recommendedUsers.length
    });
  } catch (err) {
    console.error('❌ DATABASE ERROR in /recommended route:', err.message);
    res.status(500).json({
      success: false,
      error: 'Database query failed',
      details: err.message
    });
  }
});
  
// Get all users except self
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [results] = await db.query("SELECT id, name, email FROM users WHERE id != ?", [userId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

//-------------------Notification ---------------------------//
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        n.id,
        n.sender_id,
        n.receiver_id,
        n.request_id,
        n.message,
        n.type,
        n.is_read,
        n.is_archived,
        n.created_at,
        n.session_request_id,
        n.status,
        CASE 
          WHEN n.sender_id = 0 OR n.type IN ('warning', 'suspension', 'ban', 'penalty', 'account_status') THEN 'PeerFusion Team'
          ELSE u.name 
        END AS sender_name,
        CASE 
          WHEN n.sender_id = 0 OR n.type IN ('warning', 'suspension', 'ban', 'penalty', 'account_status') THEN NULL
          ELSE up.avatar 
        END AS sender_avatar,
        COALESCE(u.role, 'system') as sender_role
      FROM notifications n
      LEFT JOIN users u ON u.id = n.sender_id
      LEFT JOIN user_profiles up ON up.user_id = n.sender_id
      WHERE n.receiver_id = ? AND n.is_archived = FALSE
      ORDER BY n.created_at DESC
    `;
    
    const [results] = await db.query(sql, [userId]);
    
    // Format dates for Manila timezone before sending to frontend
    const formattedResults = results.map(notification => ({
      ...notification,
      created_at_formatted: formatDateForManila(notification.created_at)
    }));
    
    res.json(formattedResults);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/notifications/archived', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        n.id,
        n.sender_id,
        n.receiver_id,
        n.request_id,
        n.message,
        n.type,
        n.is_read,
        n.is_archived,
        n.created_at,
        n.session_request_id,
        n.status,
        CASE 
          WHEN n.sender_id = 0 OR n.type IN ('warning', 'suspension', 'ban', 'penalty', 'account_status') THEN 'PeerFusion Team'
          ELSE u.name 
        END AS sender_name,
        CASE 
          WHEN n.sender_id = 0 OR n.type IN ('warning', 'suspension', 'ban', 'penalty', 'account_status') THEN NULL
          ELSE up.avatar 
        END AS sender_avatar,
        COALESCE(u.role, 'system') as sender_role
      FROM notifications n
      LEFT JOIN users u ON u.id = n.sender_id
      LEFT JOIN user_profiles up ON up.user_id = n.sender_id
      WHERE n.receiver_id = ? AND n.is_archived = TRUE
      ORDER BY n.created_at DESC
    `;
    
    const [results] = await db.query(sql, [userId]);
    res.json(results);
  } catch (err) {
    console.error('Archived notifications error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const emitToUser = req.app.get("emitToUser");

    const sql = `
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE receiver_id = ? AND is_read = FALSE AND is_archived = FALSE
    `;
    
    const [results] = await db.query(sql, [userId]);
    const count = results[0].count || 0;

    if (emitToUser) {
      emitToUser(userId, 'counts_updated', {
        notifications: count,
      });
    }

    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get notification count' });
  }
});

router.put('/notifications/:id/archive', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `UPDATE notifications SET is_archived = TRUE WHERE id = ? AND receiver_id = ?`;
    const [result] = await db.query(sql, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification archived' });
  } catch (err) {
    console.error('Archive notification error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.put('/notifications/:id/unarchive', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `UPDATE notifications SET is_archived = FALSE WHERE id = ? AND receiver_id = ?`;
    const [result] = await db.query(sql, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification unarchived' });
  } catch (err) {
    console.error('Unarchive notification error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `UPDATE notifications SET is_read = TRUE WHERE id = ? AND receiver_id = ?`;
    const [result] = await db.query(sql, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.put('/notifications/:id/unread', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `UPDATE notifications SET is_read = FALSE WHERE id = ? AND receiver_id = ?`;
    const [result] = await db.query(sql, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as unread' });
  } catch (err) {
    console.error('Mark as unread error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `DELETE FROM notifications WHERE id = ? AND receiver_id = ?`;
    const [result] = await db.query(sql, [notificationId, userId]);
    
    console.log(`🗑️ Deleted notification ${notificationId} for user ${userId}:`, result.affectedRows, 'rows affected');
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.put('/notifications/unarchive-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `UPDATE notifications SET is_archived = FALSE WHERE receiver_id = ? AND is_archived = TRUE`;
    const [result] = await db.query(sql, [userId]);
    
    res.json({ 
      message: 'All notifications unarchived',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

router.delete('/notifications/archived/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `DELETE FROM notifications WHERE receiver_id = ? AND is_archived = TRUE`;
    const [result] = await db.query(sql, [userId]);
    
    res.json({ 
      message: 'All archived notifications deleted',
      deletedCount: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT n.*, 
             CASE 
               WHEN n.sender_id = 0 OR n.type IN ('warning', 'suspension', 'ban', 'penalty', 'account_status') THEN 'PeerFusion Team'
               ELSE u.name 
             END AS sender_name,
             CASE 
               WHEN n.sender_id = 0 OR n.type IN ('warning', 'suspension', 'ban', 'penalty', 'account_status') THEN NULL
               ELSE up.avatar 
             END AS sender_avatar,
             COALESCE(u.role, 'system') as sender_role
      FROM notifications n
      LEFT JOIN users u ON u.id = n.sender_id
      LEFT JOIN user_profiles up ON up.user_id = n.sender_id
      WHERE n.receiver_id = ? AND n.is_archived = FALSE
      ORDER BY n.created_at DESC
    `;
    const [results] = await db.query(sql, [userId]);
    res.json(results);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/notification-feedback/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const sql = `
      SELECT f.rating, f.message as feedback_message, 
             up.username as sender_name, up.avatar as sender_avatar
      FROM feedback f
      JOIN notifications n ON n.sender_id = f.sender_id AND n.receiver_id = f.receiver_id
      JOIN user_profiles up ON up.user_id = f.sender_id
      WHERE n.id = ? AND n.receiver_id = ? AND n.type = 'feedback'
    `;
    
    const [results] = await db.query(sql, [notificationId, userId]);
    
    if (results.length > 0) {
      res.json({ success: true, feedback: results[0] });
    } else {
      res.json({ success: false, message: 'No feedback found for this notification' });
    }
  } catch (err) {
    console.error('Feedback query error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});
//------------------- End Notification ---------------------------//

//------------------- Subjects ---------------------------//
router.get('/subjects', async (req, res) => {
  try {
    const sql = `
      SELECT c.id as category_id, c.name as category_name, 
             s.id as subject_id, s.name as subject_name
      FROM subject_categories c
      LEFT JOIN subjects s ON c.id = s.category_id
      ORDER BY c.name, s.name`;
    
    const [results] = await db.query(sql);
    
    // Group by category
    const categories = {};
    results.forEach(row => {
      if (!categories[row.category_id]) {
        categories[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          subjects: []
        };
      }
      if (row.subject_id) {
        categories[row.category_id].subjects.push({
          id: row.subject_id,
          name: row.subject_name
        });
      }
    });
    
    res.json(Object.values(categories));
  } catch (err) {
    res.status(500).json({ error: err });
  }
});
//------------------- End Subjects ---------------------------//

// ------------------- UPDATED: Feedback & Ratings with Recommended --------------------------- //
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, rating, message, is_recommended = false } = req.body; // ADDED: is_recommended
    const sender_id = req.user.id;

    if (!receiver_id || !rating) {
      return res.status(400).json({ error: 'Receiver and rating are required' });
    }

    // Insert feedback with recommended status
    const sql = `
      INSERT INTO feedback (sender_id, receiver_id, rating, message, is_recommended)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.query(sql, [sender_id, receiver_id, rating, message, is_recommended]);

    // Create notification for the receiver
    const notificationSql = `
      INSERT INTO notifications (sender_id, receiver_id, message, type)
      VALUES (?, ?, ?, 'feedback')
    `;
    
    let notificationMessage = `You received a ${rating}-star rating`;
    if (is_recommended) {
      notificationMessage += ' and was recommended!';
    } else if (message) {
      notificationMessage += ' with feedback';
    }
    
    await db.query(notificationSql, [sender_id, receiver_id, notificationMessage]);

    // Update the receiver's average rating
    const updateRatingSql = `
      UPDATE user_profiles 
      SET 
        rating = (SELECT AVG(rating) FROM feedback WHERE receiver_id = ?),
        total_reviews = (SELECT COUNT(id) FROM feedback WHERE receiver_id = ?)
      WHERE user_id = ?
    `;
    
    await db.query(updateRatingSql, [receiver_id, receiver_id, receiver_id]);
    
    res.json({ 
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: result.insertId,
      is_recommended: is_recommended
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// UPDATED: Get feedback for a user with recommended status
router.get('/feedback/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const feedbackSql = `
      SELECT 
        f.*,
        up.username AS sender_name,
        up.avatar AS sender_avatar
      FROM feedback f
      JOIN user_profiles up ON up.user_id = f.sender_id
      WHERE f.receiver_id = ?
      ORDER BY f.created_at DESC
    `;
    
    const recommendedCountSql = `
      SELECT COUNT(*) AS total_recommended
      FROM feedback
      WHERE receiver_id = ? AND is_recommended = true
    `;

    const [feedbackResults] = await db.query(feedbackSql, [userId]);
    const [recommendedResults] = await db.query(recommendedCountSql, [userId]);

    // Get user profile for current ratings
    const userProfileSql = 'SELECT rating, total_reviews FROM user_profiles WHERE user_id = ?';
    const [userResults] = await db.query(userProfileSql, [userId]);

    res.json({
      success: true,
      feedbacks: feedbackResults,
      averageRating: userResults[0]?.rating || 0,
      totalFeedbacks: userResults[0]?.total_reviews || 0,
      totalRecommended: recommendedResults[0]?.total_recommended || 0
    });
  } catch (err) {
    console.error('Feedback query error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});
// ------------------- End Feedback & Ratings --------------------------- //

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = 'SELECT user_id, username, avatar FROM user_profiles WHERE user_id = ?';
    const [results] = await db.query(sql, [userId]);

    let userProfile = {};

    if (results.length > 0) {
      userProfile = { 
        ...results[0],
        id: results[0].user_id,
        user_id: results[0].user_id
      };

      if (userProfile.avatar) {
        userProfile.avatar = `${req.protocol}://${req.get('host')}/uploads/${userProfile.avatar}`;
      }
    } else {
      userProfile = { 
        user_id: userId,
        id: userId,
        username: `User ${userId}`, 
        avatar: null 
      };
    }

    res.json(userProfile);
  } catch (err) {
    console.error("Database error on /me route:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// ------------------- Change Password --------------------------- //
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user's current password hash from users table
    const userSql = 'SELECT password FROM users WHERE id = ?';
    const [userResults] = await db.query(userSql, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPasswordHash = userResults[0].password;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain at least one uppercase letter' });
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain at least one number' });
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain at least one special character' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
    await db.query(updateSql, [newPasswordHash, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
// ------------------- End Change Password --------------------------- //

// ------------------- Change Email --------------------------- //
router.post('/change-email', authenticateToken, async (req, res) => {
  let originalEmail = null;
  
  try {
    const { currentPassword, newEmail } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newEmail) {
      return res.status(400).json({ error: 'Current password and new email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Get user's current password hash and email
    const userSql = 'SELECT password, email FROM users WHERE id = ?';
    const [userResults] = await db.query(userSql, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPasswordHash = userResults[0].password;
    originalEmail = userResults[0].email;

    // Check if new email is the same as current email
    if (newEmail === originalEmail) {
      return res.status(400).json({ error: 'New email cannot be the same as current email' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new email already exists
    const emailCheckSql = 'SELECT id FROM users WHERE email = ? AND id != ?';
    const [emailResults] = await db.query(emailCheckSql, [newEmail, userId]);

    if (emailResults.length > 0) {
      return res.status(409).json({ error: 'This email is already in use' });
    }

    // Generate verification code (6 digits)
    const verificationCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code AND original email in verification_token column
    const verificationData = `${hashedCode}:${originalEmail}`;
    
    // FIXED: Remove JavaScript comments from SQL query
    const updateSql = `
      UPDATE users 
      SET 
        email = ?,
        is_verified = FALSE,
        verification_token = ?, 
        verification_expires = ?
      WHERE id = ?
    `;
    
    await db.query(updateSql, [newEmail, verificationData, codeExpires, userId]);

    // Send verification email to the new email address
    try {
      const mailOptions = {
        from: '"PeerFusion" <account@peerfusionskillshare.com>',
        to: newEmail,
        subject: 'Verify Your New Email Address - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Email Change Verification</title>
        </head>
        <body style="background-color: #f5f5f5; padding: 40px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" 
                style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td style="text-align: center; padding: 30px 0; background-color: #0d130dff;">
                <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; font-size: 16px; color: #333333;">
                <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Email Change Verification</h2>
                <p>Hello,</p>
                <p>You requested to change your PeerFusion account email from <strong>${originalEmail}</strong> to this address. Use the following 6-digit verification code to confirm this change:</p>
                <div style="text-align:center; margin: 30px 0;">
                  <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130dff;">${verificationCode}</span>
                  </div>
                </div>
                <p style="text-align: center; color: #666; font-size: 14px;">
                  This code will expire in <strong>15 minutes</strong>.
                </p>
                <p><strong>Important:</strong> If you didn't request this change, you can cancel it from your profile settings.</p>
                <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                &copy; 2025 PeerFusion. All rights reserved.
              </td>
            </tr>
          </table>
        </body>
        </html>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`Verification code sent to: ${newEmail}`);
      
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Revert the email change if sending fails
      await db.query(
        'UPDATE users SET email = ?, is_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = ?',
        [originalEmail, userId]
      );
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your new email address. Please check your inbox and enter the code to complete the email change.',
      requiresVerification: true,
      email: newEmail
    });
  } catch (err) {
    console.error('Email change error:', err);
    if (originalEmail) {
      await db.query(
        'UPDATE users SET email = ?, is_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = ?',
        [originalEmail, userId]
      );
    }
    res.status(500).json({ error: 'Failed to change email' });
  }
});

// ------------------- Verify Email Change Code --------------------------- //
router.post('/verify-email-change', authenticateToken, async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const userId = req.user.id;

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Get user's current data
    const userSql = 'SELECT email, verification_token, verification_expires FROM users WHERE id = ?';
    const [userResults] = await db.query(userSql, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResults[0];

    // Check if there's a pending email change
    if (!user.verification_token) {
      return res.status(400).json({ error: 'No pending email change request found. The request may have expired or been cancelled.' });
    }

    // Check if verification code has expired
    if (new Date(user.verification_expires) < new Date()) {
      // Extract original email from verification_token and revert
      const originalEmail = user.verification_token.split(':')[1];
      await db.query(
        'UPDATE users SET email = ?, is_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = ?',
        [originalEmail, userId]
      );
      return res.status(400).json({ error: 'Verification code has expired. Please request a new email change.' });
    }

    // Extract hashed code and original email from verification_token
    const [hashedStoredCode, originalEmail] = user.verification_token.split(':');

    // Verify the code
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    if (hashedStoredCode !== hashedCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Email change verified successfully - keep the new email and clear verification tokens
    const updateSql = `
      UPDATE users 
      SET 
        is_verified = TRUE,
        verification_token = NULL, 
        verification_expires = NULL
      WHERE id = ?
    `;
    
    await db.query(updateSql, [userId]);

    // Send confirmation email
    try {
      const welcomeMailOptions = {
        from: '"PeerFusion" <account@peerfusionskillshare.com>',
        to: user.email, // This is now the new email
        subject: 'Email Changed Successfully - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Email Changed Successfully</title>
        </head>
        <body style="background-color: #f5f5f5; padding: 40px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" 
                style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td style="text-align: center; padding: 30px 0; background-color: #0d130dff;">
                <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; font-size: 16px; color: #333333;">
                <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Email Changed Successfully</h2>
                <p>Hello,</p>
                <p>Your PeerFusion account email has been successfully changed from <strong>${originalEmail}</strong> to this address.</p>
                <div style="text-align:center; margin: 30px 0; padding: 20px; background-color: #f0f9f0; border-radius: 8px;">
                  <p style="margin: 0; color: #0ea050ff; font-weight: bold;">Your email has been updated and verified!</p>
                </div>
                <p>All future communications will be sent to this email address.</p>
                <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                &copy; 2025 PeerFusion. All rights reserved.
              </td>
            </tr>
          </table>
        </body>
        </html>`
      };

      await transporter.sendMail(welcomeMailOptions);
      
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if confirmation email fails
    }

    res.json({
      success: true,
      message: 'Email changed and verified successfully!',
      newEmail: user.email
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Failed to verify email change' });
  }
});

// ------------------- Cancel Email Change --------------------------- //
router.post('/cancel-email-change', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current verification data
    const userSql = 'SELECT verification_token FROM users WHERE id = ?';
    const [userResults] = await db.query(userSql, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResults[0];

    if (!user.verification_token) {
      return res.status(400).json({ error: 'No pending email change request to cancel.' });
    }

    // Extract original email from verification_token
    const originalEmail = user.verification_token.split(':')[1];

    if (!originalEmail) {
      return res.status(400).json({ error: 'Invalid pending email change data.' });
    }

    // Revert to original email and clear verification data
    const updateSql = `
      UPDATE users 
      SET 
        email = ?,
        is_verified = TRUE,
        verification_token = NULL, 
        verification_expires = NULL
      WHERE id = ?
    `;
    
    await db.query(updateSql, [originalEmail, userId]);

    // Send cancellation confirmation email to the original email
    try {
      const currentUserSql = 'SELECT email FROM users WHERE id = ?';
      const [currentUser] = await db.query(currentUserSql, [userId]);
      
      const cancelMailOptions = {
        from: '"PeerFusion" <support@peerfusionskillshare.com>',
        to: originalEmail,
        subject: 'Email Change Cancelled - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Email Change Cancelled</title>
        </head>
        <body style="background-color: #f5f5f5; padding: 40px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" 
                style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td style="text-align: center; padding: 30px 0; background-color: #0d130dff;">
                <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; font-size: 16px; color: #333333;">
                <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Email Change Cancelled</h2>
                <p>Hello,</p>
                <p>Your recent email change request has been cancelled successfully.</p>
                <div style="text-align:center; margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 8px;">
                  <p style="margin: 0; color: #856404; font-weight: bold;">Your email remains: <strong>${originalEmail}</strong></p>
                </div>
                <p>If you did not request this cancellation, please contact our support team immediately to secure your account.</p>
                <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                &copy; 2025 PeerFusion. All rights reserved.
              </td>
            </tr>
          </table>
        </body>
        </html>`
      };

      await transporter.sendMail(cancelMailOptions);
      console.log(`Cancellation confirmation sent to: ${originalEmail}`);
      
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Continue even if cancellation email fails
    }

    res.json({
      success: true,
      message: 'Email change cancelled successfully. Your email has been reverted to the original address.',
      email: originalEmail
    });
  } catch (err) {
    console.error('Cancel email change error:', err);
    res.status(500).json({ error: 'Failed to cancel email change' });
  }
});

// ------------------- Resend Email Change Code --------------------------- //
router.post('/resend-email-change-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userSql = 'SELECT email, verification_token, verification_expires FROM users WHERE id = ?';
    const [userResults] = await db.query(userSql, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResults[0];

    if (!user.verification_token) {
      return res.status(400).json({ error: 'No pending email change request found' });
    }
    const [oldHashedCode, originalEmail] = user.verification_token.split(':');
    if (!originalEmail) {
      return res.status(400).json({ error: 'Invalid pending email change data' });
    }

    const verificationCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const verificationData = `${hashedCode}:${originalEmail}`;
    
    const updateSql = `
      UPDATE users 
      SET verification_token = ?, verification_expires = ?
      WHERE id = ?
    `;
    
    await db.query(updateSql, [verificationData, codeExpires, userId]);

    // Resend verification email to the PENDING email (user.email contains the new email)
    try {
      const mailOptions = {
        from: '"PeerFusion" <account@peerfusionskillshare.com>',
        to: user.email, // This is the pending new email address
        subject: 'New Verification Code - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New Verification Code</title>
        </head>
        <body style="background-color: #f5f5f5; padding: 40px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" 
                style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td style="text-align: center; padding: 30px 0; background-color: #0d130dff;">
                <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; font-size: 16px; color: #333333;">
                <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">New Verification Code</h2>
                <p>Hello,</p>
                <p>You requested a new verification code for your email change from <strong>${originalEmail}</strong> to this address.</p>
                <div style="text-align:center; margin: 30px 0;">
                  <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130dff;">${verificationCode}</span>
                  </div>
                </div>
                <p style="text-align: center; color: #666; font-size: 14px;">
                  This new code will expire in <strong>15 minutes</strong>.
                </p>
                <p><strong>Important:</strong> If you didn't request this code, you can cancel the email change from your profile settings.</p>
                <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                &copy; 2025 PeerFusion. All rights reserved.
              </td>
            </tr>
          </table>
        </body>
        </html>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`New verification code sent to: ${user.email}`);
      
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email address.'
    });
  } catch (err) {
    console.error('Resend verification code error:', err);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// ------------------- Check Pending Email Change --------------------------- //
router.get('/pending-email-change', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userSql = 'SELECT email, verification_token, verification_expires FROM users WHERE id = ?';
    const [userResults] = await db.query(userSql, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResults[0];

    if (!user.verification_token) {
      return res.json({
        hasPendingChange: false
      });
    }

    const originalEmail = user.verification_token.split(':')[1];
    const isExpired = new Date(user.verification_expires) < new Date();

    res.json({
      hasPendingChange: true,
      currentEmail: user.email,
      originalEmail: originalEmail,
      isExpired: isExpired,
      expiresAt: user.verification_expires
    });
  } catch (err) {
    console.error('Check pending email change error:', err);
    res.status(500).json({ error: 'Failed to check pending email change' });
  }
});
// ------------------- Account Deactivation & Activation --------------------------- //

// Request account deactivation (voluntary break)
router.post('/deactivate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const checkSql = 'SELECT status, suspended_until, strike_count FROM users WHERE id = ?';
    const [users] = await db.query(checkSql, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.status === 'banned') {
      return res.status(403).json({ 
        error: 'Cannot deactivate a banned account. Please contact support.' 
      });
    }

    // Set deactivation timestamp
    const deactivationDate = new Date();

    const sql = `
      UPDATE users 
      SET 
        deactivation_requested_at = ?,
        status = 'deactivated'
      WHERE id = ?
    `;

    await db.query(sql, [deactivationDate, userId]);

    await createAccountStatusNotification(
      userId, 
      'Your account has been deactivated. You can reactivate anytime by logging in. Your warning status and strikes will remain when you return.',
      'account_status'
    );

    res.json({
      success: true,
      message: 'Account deactivated successfully. You can reactivate anytime by logging in.'
    });
  } catch (err) {
    console.error('Deactivation error:', err);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
});

router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is deactivated or deletion_pending
    const checkSql = 'SELECT status, strike_count, suspended_until FROM users WHERE id = ?';
    const [users] = await db.query(checkSql, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.status !== 'deactivated' && user.status !== 'deletion_pending') {
      return res.status(400).json({ error: 'Account is not deactivated or pending deletion' });
    }

    let originalStatus = 'active';
    if (user.strike_count > 0) {
      originalStatus = 'warning';
    }
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      originalStatus = 'suspended';
    }

    const sql = `
      UPDATE users 
      SET 
        deactivation_requested_at = NULL,
        deletion_scheduled_at = NULL,
        scheduled_for_deletion_at = NULL,
        status = ?
      WHERE id = ?
    `;

    await db.query(sql, [originalStatus, userId]);

    let notificationMessage = 'Your account has been reactivated successfully. ';
    
    if (originalStatus === 'warning') {
      notificationMessage += `Your account is under warning status with ${user.strike_count} strike(s). Please ensure future interactions comply with our community guidelines.`;
    } else if (originalStatus === 'suspended') {
      notificationMessage += `Your account remains suspended until ${new Date(user.suspended_until).toLocaleDateString()}.`;
    } else {
      notificationMessage += 'Welcome back to PeerFusion!';
    }

    await createAccountStatusNotification(
      userId, 
      notificationMessage,
      'account_status'
    );
    res.json({
      success: true,
      message: `Account reactivated successfully. ${originalStatus !== 'active' ? `Account status: ${originalStatus}` : ''}`,
      status: originalStatus,
      strike_count: user.strike_count
    });
  } catch (err) {
    console.error('Reactivation error:', err);
    res.status(500).json({ error: 'Failed to reactivate account' });
  }
});

// Request account deletion (permanent with 30-day grace period)
router.post('/request-deletion', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    // First check current user status
    const checkSql = 'SELECT status, suspended_until, strike_count FROM users WHERE id = ?';
    const [users] = await db.query(checkSql, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Set deletion schedule (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const sql = `
      UPDATE users 
      SET 
        deletion_scheduled_at = NOW(),
        scheduled_for_deletion_at = ?,
        status = 'deletion_pending'
      WHERE id = ?
    `;

    await db.query(sql, [deletionDate, userId]);

    await createAccountStatusNotification(
      userId, 
      `Your account deletion has been scheduled. It will be permanently deleted on ${deletionDate.toLocaleDateString()} unless you cancel. You can cancel this deletion anytime within the next 30 days.`,
      'account_status'
    );

    res.json({
      success: true,
      message: 'Account deletion scheduled. You have 30 days to cancel before permanent deletion.',
      deletion_date: deletionDate
    });
  } catch (err) {
    console.error('Deletion request error:', err);
    res.status(500).json({ error: 'Failed to schedule account deletion' });
  }
});

// Reactivate account (from deactivated state)
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is deactivated or deletion_pending
    const checkSql = 'SELECT status FROM users WHERE id = ?';
    const [users] = await db.query(checkSql, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.status !== 'deactivated' && user.status !== 'deletion_pending') {
      return res.status(400).json({ error: 'Account is not deactivated or pending deletion' });
    }

    // Reactivate account by clearing timestamps and setting status to active
    const sql = `
      UPDATE users 
      SET 
        deactivation_requested_at = NULL,
        deletion_scheduled_at = NULL,
        scheduled_for_deletion_at = NULL,
        status = 'active'
      WHERE id = ?
    `;

    await db.query(sql, [userId]);

    // Create notification
    const notificationSql = `
      INSERT INTO notifications (sender_id, receiver_id, message, type)
      VALUES (?, ?, ?, 'account_status')
    `;
    
    await db.query(notificationSql, [
      0, // System sender
      userId, 
      'Your account has been reactivated successfully.',
      'account_status'
    ]);

    res.json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (err) {
    console.error('Reactivation error:', err);
    res.status(500).json({ error: 'Failed to reactivate account' });
  }
});

// Cancel scheduled deletion
router.post('/cancel-deletion', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's original status before deletion request
    const [userCheck] = await db.query(
      'SELECT strike_count, suspended_until FROM users WHERE id = ?',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck[0];
    
    // Determine original status based on strikes and suspension
    let originalStatus = 'active';
    
    if (user.strike_count > 0) {
      originalStatus = 'warning';
    }
    
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      originalStatus = 'suspended';
    }

    const sql = `
      UPDATE users 
      SET 
        deletion_scheduled_at = NULL,
        scheduled_for_deletion_at = NULL,
        status = ?
      WHERE id = ?
    `;

    await db.query(sql, [originalStatus, userId]);

    await createAccountStatusNotification(
      userId, 
      `Your account deletion has been cancelled successfully. Your account is now ${originalStatus}.`
    );

    res.json({
      success: true,
      message: `Account deletion cancelled successfully. Account status: ${originalStatus}`,
      status: originalStatus
    });
  } catch (err) {
    console.error('Cancel deletion error:', err);
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
});

// Get account status
router.get('/account-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        status,
        deactivation_requested_at,
        deletion_scheduled_at,
        scheduled_for_deletion_at,
        strike_count,
        suspended_until
      FROM users 
      WHERE id = ?
    `;

    const [results] = await db.query(sql, [userId]);

    if (results.length > 0) {
      const user = results[0];
      
      let days_until_deletion = null;
      if (user.scheduled_for_deletion_at) {
        const deletionDate = new Date(user.scheduled_for_deletion_at);
        const now = new Date();
        days_until_deletion = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));
      }
      const underlyingStatus = user.strike_count > 0 ? 'warning' : 'active';
      if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
        underlyingStatus = 'suspended';
      }

      res.json({
        status: user.status,
        underlying_status: underlyingStatus,
        deactivation_requested_at: user.deactivation_requested_at,
        deletion_scheduled_at: user.deletion_scheduled_at,
        scheduled_for_deletion_at: user.scheduled_for_deletion_at,
        days_until_deletion: days_until_deletion > 0 ? days_until_deletion : 0,
        strike_count: user.strike_count,
        suspended_until: user.suspended_until,
        is_deactivated: user.status === 'deactivated',
        is_pending_deletion: user.status === 'deletion_pending',
        is_banned: user.status === 'banned',
        is_suspended: user.status === 'suspended',
        is_active: user.status === 'active' || user.status === 'warning',
        has_strikes: user.strike_count > 0
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Account status error:', err);
    res.status(500).json({ error: 'Failed to get account status' });
  }
});

module.exports = router;