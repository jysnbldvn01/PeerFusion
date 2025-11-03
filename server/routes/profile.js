const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'avatar_' + Date.now() + ext);
  },
});
const upload = multer({ storage });

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
    console.log('Fetching other users for user ID:', req.user.id);

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
        EXISTS(
          SELECT 1 FROM feedback f 
          WHERE f.receiver_id = u.user_id AND f.is_recommended = true
        ) AS is_recommended
      FROM user_profiles u
      WHERE u.user_id != ?
        AND (u.role = 'Skill Sharer' OR u.role = 'Skill Learner & Sharer')
      ORDER BY u.rating DESC
    `;

    const [results] = await db.query(sql, [req.user.id]);
    console.log('✅ Query successful, found users:', results.length);

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
    console.log('Fetching recommended users for user:', userId);

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
        TRUE AS is_recommended
      FROM user_profiles u
      JOIN feedback f ON f.receiver_id = u.user_id
      WHERE u.user_id != ?
        AND (u.role = 'Skill Sharer' OR u.role = 'Skill Learner & Sharer')
        AND f.is_recommended = TRUE
      ORDER BY u.rating DESC
      LIMIT 20
    `;

    const [results] = await db.query(sql, [userId]);
    console.log('✅ Recommended users found:', results.length);

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
      SELECT n.*, 
             CASE 
               WHEN n.type IN ('warning', 'suspension', 'ban', 'penalty') THEN 'PeerFusion Team'
               ELSE u.name 
             END AS sender_name,
             CASE 
               WHEN n.type IN ('warning', 'suspension', 'ban', 'penalty') THEN NULL
               ELSE up.avatar 
             END AS sender_avatar,
             u.role as sender_role
      FROM notifications n
      JOIN users u ON u.id = n.sender_id
      LEFT JOIN user_profiles up ON up.user_id = n.sender_id
      WHERE n.receiver_id = ? AND n.is_archived = FALSE
      ORDER BY n.created_at DESC
    `;
    
    const [results] = await db.query(sql, [userId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/notifications/archived', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT n.*, 
             CASE 
               WHEN n.type IN ('warning', 'suspension', 'ban', 'penalty') THEN 'PeerFusion Team'
               ELSE u.name 
             END AS sender_name,
             CASE 
               WHEN n.type IN ('warning', 'suspension', 'ban', 'penalty') THEN NULL
               ELSE up.avatar 
             END AS sender_avatar,
             u.role as sender_role
      FROM notifications n
      JOIN users u ON u.id = n.sender_id
      LEFT JOIN user_profiles up ON up.user_id = n.sender_id
      WHERE n.receiver_id = ? AND n.is_archived = TRUE
      ORDER BY n.created_at DESC
    `;
    
    const [results] = await db.query(sql, [userId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT COUNT(*) as unread_count
      FROM notifications 
      WHERE receiver_id = ? AND is_read = FALSE AND is_archived = FALSE
    `;
    
    const [results] = await db.query(sql, [userId]);
    res.json({ count: results[0].unread_count });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
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
    res.status(500).json({ error: 'DB error' });
  }
});

router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `DELETE FROM notifications WHERE id = ? AND receiver_id = ?`;
    const [result] = await db.query(sql, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
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

router.post('/notifications', authenticateToken, async (req, res) => {
  try {
    const { sender_id, receiver_id, message, type = 'message' } = req.body;

    if (!sender_id || !receiver_id || !message) {
      return res.status(400).json({ error: 'Sender ID, receiver ID, and message are required' });
    }

    const sql = `
      INSERT INTO notifications (sender_id, receiver_id, message, type)
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await db.query(sql, [sender_id, receiver_id, message, type]);
    
    res.json({ 
      message: 'Notification created',
      notificationId: result.insertId
    });
  } catch (err) {
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

module.exports = router;