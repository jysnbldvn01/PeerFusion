const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

const adminCheckCache = new Map();
const moderatorCheckCache = new Map();

async function executeTransaction(operations) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operations(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function handleError(res, err, customMessage) {
  console.error(`${customMessage}:`, err);
  
  let errorMessage = customMessage;
  if (err.code === 'ER_DUP_ENTRY') {
    errorMessage = 'Duplicate entry exists';
  } else if (err.sqlMessage) {
    errorMessage = `Database error: ${err.sqlMessage}`;
  }
  
  res.status(500).json({ 
    success: false,
    error: errorMessage,
    details: err.message
  });
}

async function requireAdmin(req, res, next) {
  try {
    const userId = req.user.id;
    
    if (adminCheckCache.has(userId)) {
      const cached = adminCheckCache.get(userId);
      if (cached.expires > Date.now()) {
        if (cached.isAdmin) {
          return next();
        } else {
          return res.status(403).json({ 
            error: 'Admin access required',
            userRole: cached.role
          });
        }
      } else {
        adminCheckCache.delete(userId);
      }
    }

    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?', 
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const isAdmin = user.role === 'admin';
    
    adminCheckCache.set(userId, {
      isAdmin,
      role: user.role,
      expires: Date.now() + 300000
    });
    
    if (isAdmin) {
      next();
    } else {
      res.status(403).json({ 
        error: 'Admin access required',
        userRole: user.role
      });
    }
    
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ 
      error: 'Database error during admin check',
      details: err.message
    });
  }
}

async function requireModeratorOrAdmin(req, res, next) {
  try {
    const userId = req.user.id;
    
    if (moderatorCheckCache.has(userId)) {
      const cached = moderatorCheckCache.get(userId);
      if (cached.expires > Date.now()) {
        if (cached.isModeratorOrAdmin) {
          return next();
        } else {
          return res.status(403).json({ 
            error: 'Moderator or Admin access required',
            userRole: cached.role
          });
        }
      } else {
        moderatorCheckCache.delete(userId);
      }
    }

    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?', 
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const isModeratorOrAdmin = user.role === 'admin' || user.role === 'moderator';
    
    moderatorCheckCache.set(userId, {
      isModeratorOrAdmin,
      role: user.role,
      expires: Date.now() + 300000
    });
    
    if (isModeratorOrAdmin) {
      next();
    } else {
      res.status(403).json({ 
        error: 'Moderator or Admin access required',
        userRole: user.role
      });
    }
    
  } catch (err) {
    console.error('Moderator check error:', err);
    res.status(500).json({ 
      error: 'Database error during moderator check',
      details: err.message
    });
  }
}

// GET all regular users (excluding admins and moderators) - Accessible by both admin and moderators
router.get('/users', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.name as username,
        u.email,
        u.created_at,
        u.role,
        u.status,
        u.strike_count,
        u.total_reports,
        u.suspended_until,
        up.rating,
        up.total_reviews,
        up.availability,
        up.avatar,
        up.bio
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.role NOT IN ('admin', 'moderator')
      ORDER BY u.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    
    res.json(rows);
  } catch (err) {
    handleError(res, err, 'Error fetching users');
  }
});

// GET all moderators - Admin only
router.get('/moderators', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.created_at,
        u.role,
        u.status,
        u.name as username
      FROM users u
      WHERE u.role = 'moderator'
      ORDER BY u.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    handleError(res, err, 'Error fetching moderators');
  }
});

// CREATE moderator account - Admin only
router.post('/moderators', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await executeTransaction(async (connection) => {
      const [userResult] = await connection.query(
        'INSERT INTO users (email, password, role, status, created_at, name) VALUES (?, ?, ?, ?, NOW(), ?)',
        [email, hashedPassword, 'moderator', 'active', username]
      );

      return {
        id: userResult.insertId,
        username,
        email,
        role: 'moderator',
        status: 'active',
        created_at: new Date()
      };
    });

    res.json({
      success: true,
      message: 'Moderator account created successfully',
      moderator: result
    });

  } catch (err) {
    handleError(res, err, 'Create moderator error');
  }
});

// UPDATE moderator account details - Admin only
router.put('/moderators/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const moderatorId = req.params.id;
    const { username, email, password } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required'
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?', 
      [email, moderatorId]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    await executeTransaction(async (connection) => {
      let updateFields = [];
      let updateValues = [];

      updateFields.push('name = ?', 'email = ?');
      updateValues.push(username, email);

      if (password && password.length > 0) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push('password = ?');
        updateValues.push(hashedPassword);
      }

      updateValues.push(moderatorId);

      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND role = "moderator"`;
      
      const [result] = await connection.query(sql, updateValues);

      if (result.affectedRows === 0) {
        throw new Error('Moderator not found');
      }

      try {
        await pool.query(
          'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
          [req.user.id, 'MODERATOR_UPDATED', moderatorId, JSON.stringify({
            username: username,
            email: email,
            password_changed: !!password
          })]
        );
      } catch (logError) {
        console.warn('Could not log admin action:', logError);
      }
    });

    res.json({
      success: true,
      message: password ? 'Moderator account updated with new password' : 'Moderator account updated successfully'
    });

  } catch (err) {
    handleError(res, err, 'Update moderator error');
  }
});

// RESET moderator password - Admin only
router.post('/moderators/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const moderatorId = req.params.id;

    const [moderators] = await pool.query(
      'SELECT id, email, name FROM users WHERE id = ? AND role = "moderator"',
      [moderatorId]
    );

    if (moderators.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Moderator not found'
      });
    }

    const moderator = moderators[0];
    const temporaryPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ? AND role = "moderator"',
      [hashedPassword, moderatorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Moderator not found'
      });
    }

    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, 'MODERATOR_PASSWORD_RESET', moderatorId, JSON.stringify({ 
          username: moderator.name,
          email: moderator.email,
          method: 'admin_reset' 
        })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    res.json({
      success: true,
      message: 'Moderator password reset successfully',
      temporaryPassword
    });
  } catch (err) {
    handleError(res, err, 'Reset moderator password error');
  }
});

// User status management
const updateUserStatus = async (userId, status, strikeCount, suspendedUntil, action, req) => {
  return executeTransaction(async (connection) => {
    // First, get current user data
    const [currentUser] = await connection.query(
      'SELECT status, strike_count FROM users WHERE id = ?',
      [userId]
    );

    if (currentUser.length === 0) {
      throw new Error('User not found');
    }

    const currentStrikeCount = currentUser[0].strike_count || 0;
    const currentStatus = currentUser[0].status;

    // Determine the final status based on strike count
    let finalStatus = status;
    let finalStrikeCount = strikeCount;
    let finalSuspendedUntil = suspendedUntil;

    // Auto-update status based on strike count
    if (finalStrikeCount === 0) {
      // If strikes reach 0, automatically set to active and clear suspension
      finalStatus = 'active';
      finalSuspendedUntil = null;
    } else if (finalStrikeCount === 1 || finalStrikeCount === 2) {
      // 1-2 strikes = warning status
      finalStatus = 'warning';
      finalSuspendedUntil = null;
    } else if (finalStrikeCount >= 3) {
      // 3+ strikes = suspended status (unless already banned)
      if (finalStatus !== 'banned') {
        finalStatus = 'suspended';
        // If no suspension date provided for 3+ strikes, set default 7 days
        if (!finalSuspendedUntil && finalStrikeCount >= 3) {
          finalSuspendedUntil = new Date();
          finalSuspendedUntil.setDate(finalSuspendedUntil.getDate() + 7);
        }
      }
    }

    const updateFields = ['status = ?', 'strike_count = ?'];
    const updateValues = [finalStatus, finalStrikeCount];

    if (finalSuspendedUntil) {
      updateFields.push('suspended_until = ?');
      updateValues.push(finalSuspendedUntil);
    } else {
      updateFields.push('suspended_until = NULL');
    }

    updateValues.push(userId);

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND role != "admin"`;
    
    const [userResult] = await connection.query(sql, updateValues);

    if (userResult.affectedRows === 0) {
      throw new Error('User not found or cannot modify admin');
    }

    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, action, userId, JSON.stringify({ 
          previous_status: currentStatus,
          previous_strikes: currentStrikeCount,
          status: finalStatus,
          strike_count: finalStrikeCount,
          suspended_until: finalSuspendedUntil,
          reason: `User ${action.toLowerCase().replace('_', ' ')} by admin`,
          auto_status_update: finalStatus !== status // Flag if status was auto-updated
        })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    return {
      previousStatus: currentStatus,
      previousStrikeCount: currentStrikeCount,
      newStatus: finalStatus,
      newStrikeCount: finalStrikeCount,
      suspendedUntil: finalSuspendedUntil
    };  
  });
};


// BAN user - Admin only
router.patch('/users/:id/ban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    
    await updateUserStatus(userId, 'banned', 3, null, 'USER_BANNED', req);
    
    res.json({
      success: true,
      message: 'User permanently banned'
    });

  } catch (err) {
    handleError(res, err, 'Ban user error');
  }
});

// REACTIVATE user - Accessible by both admin and moderators
router.patch('/users/:id/reactivate', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const result = await updateUserStatus(userId, 'active', 0, null, 'USER_REACTIVATED', req);
    
    res.json({
      success: true,
      message: 'User reactivated successfully',
      status: result.newStatus,
      strike_count: result.newStrikeCount
    });

  } catch (err) {
    handleError(res, err, 'Reactivate user error');
  }
});

router.patch('/users/:id/strikes', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { strike_count, reason } = req.body;
    
    if (strike_count === undefined || strike_count < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid strike count is required'
      });
    }

    const [users] = await pool.query(
      'SELECT status FROM users WHERE id = ?', 
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentStatus = users[0].status;
    const result = await updateUserStatus(userId, currentStatus, strike_count, null, 'STRIKES_ADJUSTED', req);

    try {
      let notificationMessage = `**Strike Count Adjusted**\n\n`;
      
      if (reason) {
        notificationMessage += `**Reason:** ${reason}\n\n`;
      }
      
      notificationMessage += `Your strike count has been adjusted.\n\n**Current Status:** ${result.newStatus}\n**Strikes:** ${result.newStrikeCount}/3\n\n`;
      
      if (result.newStrikeCount === 0) {
        notificationMessage += `Your account is now in good standing with no active strikes.`;
      } else if (result.newStrikeCount <= 2) {
        notificationMessage += `Please ensure future interactions comply with our community guidelines to avoid further penalties.`;
      } else {
        notificationMessage += `Your account has been suspended due to reaching the maximum strike count.`;
      }

      // Send notification from PeerFusion Team (NULL sender_id)
      await pool.query(
        'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (NULL, ?, ?, ?, NOW())',
        [userId, notificationMessage, 'strikes_adjusted']
      );
    } catch (notifyError) {
      console.warn('Could not send notification:', notifyError);
    }
    
    res.json({
      success: true,
      message: `Strike count adjusted to ${strike_count}. ${result.newStatus !== currentStatus ? `Status automatically updated to ${result.newStatus}.` : ''}`,
      strike_count: result.newStrikeCount,
      status: result.newStatus,
      previous_status: result.previousStatus
    });

  } catch (err) {
    handleError(res, err, 'Adjust strikes error');
  }
});

// UPDATE user role - Accessible by both admin and moderators
router.put('/users/:id/role', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ 
        success: false,
        error: 'Role is required' 
      });
    }

    const allowedRoles = ['Skill Sharer', 'Skill Learner', 'Skill Learner & Sharer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role assignment'
      });
    }

    await executeTransaction(async (connection) => {
      const [userResult] = await connection.query(
        'UPDATE users SET role = ? WHERE id = ?', 
        [role, userId]
      );

      if (userResult.affectedRows === 0) {
        throw new Error('User not found');
      }

      await connection.query(
        'UPDATE user_profiles SET role = ? WHERE user_id = ?', 
        [role, userId]
      );

      try {
        await pool.query(
          'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
          [req.user.id, 'ROLE_CHANGED', userId, JSON.stringify({ newRole: role })]
        );
      } catch (logError) {
        console.warn('Could not log admin action:', logError);
      }
    });

    res.json({
      success: true,
      message: 'User role updated successfully'
    });

  } catch (err) {
    handleError(res, err, 'Update user error');
  }
});

// GET user reports history
router.get('/users/:id/reports', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const sql = `
      SELECT 
        r.id,
        r.report_type,
        r.description,
        r.status,
        r.created_at,
        r.resolved_at,
        reporter_profile.username as reporter_username,
        reporter_user.email as reporter_email
      FROM reports r
      LEFT JOIN user_profiles reporter_profile ON r.reporter_id = reporter_profile.user_id
      LEFT JOIN users reporter_user ON r.reporter_id = reporter_user.id
      WHERE r.reported_user_id = ?
      ORDER BY r.created_at DESC
    `;

    const [rows] = await pool.query(sql, [userId]);
    
    res.json({
      success: true,
      reports: rows
    });
  } catch (err) {
    handleError(res, err, 'Error fetching user reports');
  }
});

// RESET user password - Admin only
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[0];
    const temporaryPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?', 
      [hashedPassword, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Send email with temporary password
    try {
      const mailOptions = {
        from: '"PeerFusion Admin" <onboarding@resend.dev>',
        to: user.email,
        subject: 'Your Password Has Been Reset - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Password Reset</title>
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
                <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Password Reset</h2>
                <p>Hello ${user.name || user.email},</p>
                <p>Your password has been reset by an administrator. Here is your temporary password:</p>
                <div style="text-align:center; margin: 30px 0;">
                  <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0d130dff; font-family: monospace;">${temporaryPassword}</span>
                  </div>
                </div>
                <p style="text-align: center; color: #666; font-size: 14px;">
                  Please use this temporary password to login and set a new password immediately.
                </p>
                <p style="color: #dc3545; font-weight: bold;">For security reasons, please change your password after logging in.</p>
                <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Admin Team</strong></p>
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
    } catch (emailError) {
      console.warn('Could not send password reset email:', emailError);
      // Continue with the response even if email fails
    }

    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, 'PASSWORD_RESET', userId, JSON.stringify({ 
          username: user.name || user.email,
          method: 'admin_reset',
          email_sent: true
        })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    res.json({
      success: true,
      message: 'Password reset successfully and email sent to user',
      temporaryPassword
    });
  } catch (err) {
    handleError(res, err, 'Reset password error');
  }
});

// UPDATE admin password - Accessible by both admin and moderators
router.put('/change-password', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const [admins] = await pool.query(
      'SELECT password, email FROM users WHERE id = ?', 
      [adminId]
    );
    
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    const admin = admins[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?', 
      [hashedNewPassword, adminId]
    );

    adminCheckCache.delete(adminId);
    moderatorCheckCache.delete(adminId);

    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [adminId, 'ADMIN_PASSWORD_CHANGED', null, JSON.stringify({ email: admin.email })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    handleError(res, err, 'Change password error');
  }
});

// GET admin logs - Admin only
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        al.id,
        al.admin_id,
        a.email as admin_email,
        al.action,
        al.target_user_id,
        t.email as target_user_email,
        up.username as target_username,
        al.details,
        al.timestamp
      FROM admin_logs al
      LEFT JOIN users a ON al.admin_id = a.id
      LEFT JOIN users t ON al.target_user_id = t.id
      LEFT JOIN user_profiles up ON al.target_user_id = up.user_id
      ORDER BY al.timestamp DESC
      LIMIT 100
    `;

    const [rows] = await pool.query(sql);
    
    res.json({
      success: true,
      logs: rows
    });
  } catch (err) {
    handleError(res, err, 'Error fetching admin logs');
  }
});

// GET all categories with their subjects - Accessible by both admin and moderators
router.get('/subjects', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id as category_id, 
        c.name as category_name,
        s.id as subject_id, 
        s.name as subject_name
      FROM subject_categories c
      LEFT JOIN subjects s ON c.id = s.category_id
      ORDER BY c.name, s.name
    `;
    
    const [results] = await pool.query(sql);
    
    const categoriesMap = new Map();
    
    results.forEach(row => {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          id: row.category_id,
          name: row.category_name,
          subjects: []
        });
      }
      
      if (row.subject_id) {
        categoriesMap.get(row.category_id).subjects.push({
          id: row.subject_id,
          name: row.subject_name,
          category_id: row.category_id
        });
      }
    });
    
    res.json({
      success: true,
      categories: Array.from(categoriesMap.values())
    });
  } catch (err) {
    handleError(res, err, 'Admin subjects fetch error');
  }
});

// Category management
const validateCategoryInput = (name) => {
  if (!name || name.trim() === '') {
    throw new Error('Category name is required');
  }
  return name.trim();
};

// POST - Create new category - Admin only
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = validateCategoryInput(req.body.name);
    
    const sql = 'INSERT INTO subject_categories (name) VALUES (?)';
    const [result] = await pool.query(sql, [name]);
    
    res.json({
      success: true,
      message: 'Category created successfully',
      category: {
        id: result.insertId,
        name
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists'
      });
    }
    handleError(res, err, 'Create category error');
  }
});

// POST - Create new subject - Admin only
router.post('/subjects', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category_id } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Subject name is required' 
      });
    }
    
    if (!category_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Category ID is required' 
      });
    }
    
    const [categories] = await pool.query(
      'SELECT id, name FROM subject_categories WHERE id = ?', 
      [category_id]
    );
    
    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }
    
    const subjectName = name.trim();
    const sql = 'INSERT INTO subjects (name, category_id) VALUES (?, ?)';
    const [result] = await pool.query(sql, [subjectName, category_id]);
    
    res.json({
      success: true,
      message: 'Subject created successfully',
      subject: {
        id: result.insertId,
        name: subjectName,
        category_id,
        category_name: categories[0].name
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Subject name already exists in this category'
      });
    }
    handleError(res, err, 'Create subject error');
  }
});

// PUT - Update category - Admin only
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const name = validateCategoryInput(req.body.name);
    
    const sql = 'UPDATE subject_categories SET name = ? WHERE id = ?';
    const [result] = await pool.query(sql, [name, categoryId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category updated successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists'
      });
    }
    handleError(res, err, 'Update category error');
  }
});

// DELETE - Delete category - Admin only
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    const [subjects] = await pool.query(
      'SELECT id, name FROM subjects WHERE category_id = ?', 
      [categoryId]
    );
    
    if (subjects.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category that has subjects. Please delete or move the subjects first.',
        subjects
      });
    }
    
    const sql = 'DELETE FROM subject_categories WHERE id = ?';
    const [result] = await pool.query(sql, [categoryId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    handleError(res, err, 'Delete category error');
  }
});

// DELETE - Delete subject - Admin only
router.delete('/subjects/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const subjectId = req.params.id;
    
    const sql = 'DELETE FROM subjects WHERE id = ?';
    const [result] = await pool.query(sql, [subjectId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (err) {
    handleError(res, err, 'Delete subject error');
  }
});

// DELETE moderator account (HARD DELETE - permanently removed) - Admin only
router.delete('/moderators/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const moderatorId = req.params.id;

    const [moderators] = await pool.query(
      'SELECT id, email, name as username FROM users WHERE id = ? AND role = "moderator"',
      [moderatorId]
    );

    if (moderators.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Moderator not found'
      });
    }

    const moderator = moderators[0];

    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ? AND role = "moderator"',
      [moderatorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Moderator not found'
      });
    }

    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, 'MODERATOR_DELETED', moderatorId, JSON.stringify({
          username: moderator.username,
          email: moderator.email
        })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    res.json({
      success: true,
      message: 'Moderator deleted successfully'
    });

  } catch (err) {
    handleError(res, err, 'Delete moderator error');
  }
});

// DELETE user account (HARD DELETE - permanently removed) - Admin only
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await pool.query(
      'SELECT id, email, name as username, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[0];

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin users'
      });
    }

    await executeTransaction(async (connection) => {
      await connection.query(
        'DELETE FROM user_profiles WHERE user_id = ?',
        [userId]
      );

      const [userResult] = await connection.query(
        'DELETE FROM users WHERE id = ? AND role != "admin"',
        [userId]
      );

      if (userResult.affectedRows === 0) {
        throw new Error('User not found');
      }

      try {
        await pool.query(
          'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
          [req.user.id, 'USER_DELETED', userId, JSON.stringify({
            username: user.username,
            email: user.email,
            role: user.role
          })]
        );
      } catch (logError) {
        console.warn('Could not log admin action:', logError);
      }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    handleError(res, err, 'Delete user error');
  }
});

router.get('/users/:id', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const sql = `
      SELECT 
        u.id,
        u.name as username,
        u.email,
        u.created_at,
        u.role,
        u.status,
        u.strike_count,
        u.total_reports,
        u.suspended_until,
        up.rating,
        up.total_reviews,
        up.availability,
        up.avatar,
        up.bio
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `;

    const [rows] = await pool.query(sql, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json(rows[0]);
  } catch (err) {
    handleError(res, err, 'Error fetching user details');
  }
});

// Auto-apply strikes based on reports
const checkAndApplyStrikes = async (reportedUserId, connection, adminId) => {
  const [userData] = await connection.query(
    'SELECT strike_count, status FROM users WHERE id = ?',
    [reportedUserId]
  );

  if (userData.length === 0) return;

  const currentStrikes = userData[0].strike_count || 0;
  const currentStatus = userData[0].status;

  const [recentReports] = await connection.query(
    `SELECT COUNT(*) as report_count 
     FROM reports 
     WHERE reported_user_id = ? 
     AND status = 'resolved' 
     AND resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [reportedUserId]
  );

  const recentReportCount = recentReports[0].report_count;

  if (recentReportCount >= 5 && currentStatus === 'active') {
    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + 7);
    
    await connection.query(
      'UPDATE users SET strike_count = 3, status = "suspended", suspended_until = ? WHERE id = ?',
      [suspendedUntil, reportedUserId]
    );

    // Send notification from PeerFusion Team (NULL sender_id)
    await connection.query(
      'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (NULL, ?, ?, ?, NOW())',
      [reportedUserId, 'Your account has been suspended for 7 days due to multiple violations reported by other users.', 'suspension']
    );

  } else if (recentReportCount >= 3 && currentStrikes < 2) {
    const newStrikeCount = currentStrikes + 1;
    await connection.query(
      'UPDATE users SET strike_count = ?, status = "warning" WHERE id = ?',
      [newStrikeCount, reportedUserId]
    );

    // Send notification from PeerFusion Team (NULL sender_id)
    await connection.query(
      'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (NULL, ?, ?, ?, NOW())',
      [reportedUserId, `You have received a strike due to multiple user reports. Current strikes: ${newStrikeCount}/3.`, 'warning']
    );
  }
};

// Reports management routes - Accessible by both admin and moderators
router.get('/reports', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        r.id,
        r.reporter_id,
        reporter_profile.username as reporter_username,
        reporter_user.email as reporter_email,
        r.reported_user_id,
        reported_profile.username as reported_username,
        reported_user.email as reported_email,
        r.report_type,
        r.description,
        r.status,
        r.severity,
        r.evidence,
        r.evidence_type,
        r.created_at,
        r.resolved_at,
        r.resolution_notes,
        r.resolved_by,
        r.source,
        resolver_profile.username as resolved_by_username,
        u.strike_count as reported_user_strikes,
        u.status as reported_user_status
      FROM reports r
      LEFT JOIN user_profiles reporter_profile ON r.reporter_id = reporter_profile.user_id
      LEFT JOIN users reporter_user ON r.reporter_id = reporter_user.id
      LEFT JOIN user_profiles reported_profile ON r.reported_user_id = reported_profile.user_id
      LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
      LEFT JOIN user_profiles resolver_profile ON r.resolved_by = resolver_profile.user_id
      LEFT JOIN users u ON r.reported_user_id = u.id
      ORDER BY 
        CASE r.severity 
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        r.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    
    // Parse evidence JSON safely with better error handling
    const reportsWithEvidence = rows.map(report => {
      let evidence = null;
      let evidence_urls = [];
      
      // Handle evidence parsing
      if (report.evidence) {
        try {
          // If it's already a string that looks like JSON, parse it
          if (typeof report.evidence === 'string') {
            // Check if it starts with [ or { (JSON indicators)
            const trimmedEvidence = report.evidence.trim();
            if (trimmedEvidence.startsWith('[') || trimmedEvidence.startsWith('{')) {
              evidence = JSON.parse(trimmedEvidence);
            } else {
              // It's a plain filename string, convert to proper JSON structure
              evidence = [{
                filename: report.evidence,
                originalname: report.evidence,
                mimetype: getMimeTypeFromFilename(report.evidence),
                size: 0,
                path: `/uploads/evidence/${report.evidence}`
              }];
            }
          } else {
            // If it's not a string, use it as-is (should be JSON object)
            evidence = report.evidence;
          }
        } catch (error) {
          console.error(`Error parsing evidence for report ${report.id}:`, error);
          // Fallback: treat it as a single filename
          evidence = [{
            filename: String(report.evidence),
            originalname: String(report.evidence),
            mimetype: 'unknown',
            size: 0,
            path: `/uploads/evidence/${report.evidence}`
          }];
        }
      }
      
      // Generate evidence URLs
      if (evidence && Array.isArray(evidence)) {
        evidence_urls = evidence.map(evidenceItem => ({
          ...evidenceItem,
          url: `/api/reports/evidence/${evidenceItem.filename}`
        }));
      }
      
      return {
        ...report,
        evidence: evidence,
        evidence_urls: evidence_urls
      };
    });
    
    res.json({
      success: true,
      reports: reportsWithEvidence
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching reports',
      details: err.message
    });
  }
});

// Helper function to guess MIME type from filename
function getMimeTypeFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp4': 'video/mp4',
    'avi': 'video/avi'
  };
  return mimeTypes[ext] || 'unknown';
}

// Add this function to your admin.js file
const applyStrikePenalty = async (reportedUserId, reportType, severity, connection, adminId) => {
  try {
    // Get current user status
    const [userData] = await connection.query(
      'SELECT strike_count, status FROM users WHERE id = ?',
      [reportedUserId]
    );

    if (userData.length === 0) {
      throw new Error('User not found');
    }

    const currentStrikes = userData[0].strike_count || 0;
    const currentStatus = userData[0].status;

    // Determine strike progression based on category
    let newStrikeCount = currentStrikes;
    let newStatus = currentStatus;
    let suspendedUntil = null;
    let penaltyAction = '';

    // Category 3: Zero-tolerance violations - Immediate permanent ban
    const zeroToleranceTypes = ['Hate Speech', 'Sexual Content', 'Violence or Threats', 'Self-harm'];
    if (zeroToleranceTypes.includes(reportType)) {
      newStrikeCount = 3;
      newStatus = 'banned';
      penaltyAction = 'USER_BANNED';
    }
    // Category 2: High-severity violations
    else if (severity === 'high') {
      if (currentStrikes === 0) {
        newStrikeCount = 1;
        newStatus = 'warning';
        penaltyAction = 'USER_WARNED';
      } else if (currentStrikes === 1) {
        newStrikeCount = 2;
        newStatus = 'warning';
        penaltyAction = 'USER_WARNED';
      } else {
        newStrikeCount = 3;
        newStatus = 'suspended';
        suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + 30); // 30-day suspension
        penaltyAction = 'USER_SUSPENDED';
      }
    }
    // Category 1: Low-severity violations
    else {
      if (currentStrikes === 0) {
        newStrikeCount = 1;
        newStatus = 'warning';
        penaltyAction = 'USER_WARNED';
      } else if (currentStrikes === 1) {
        newStrikeCount = 2;
        newStatus = 'warning';
        penaltyAction = 'USER_WARNED';
      } else if (currentStrikes === 2) {
        newStrikeCount = 3;
        newStatus = 'suspended';
        suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + 7); // 7-day suspension
        penaltyAction = 'USER_SUSPENDED';
      } else if (currentStrikes === 3) {
        newStrikeCount = 4;
        newStatus = 'suspended';
        suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + 30); // 30-day suspension
        penaltyAction = 'USER_SUSPENDED';
      } else {
        newStrikeCount = 5;
        newStatus = 'banned';
        penaltyAction = 'USER_BANNED';
      }
    }

    // Update user status
    if (suspendedUntil) {
      await connection.query(
        'UPDATE users SET strike_count = ?, status = ?, suspended_until = ? WHERE id = ?',
        [newStrikeCount, newStatus, suspendedUntil, reportedUserId]
      );
    } else {
      await connection.query(
        'UPDATE users SET strike_count = ?, status = ?, suspended_until = NULL WHERE id = ?',
        [newStrikeCount, newStatus, reportedUserId]
      );
    }

    // Log the action
    await connection.query(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [adminId, penaltyAction, reportedUserId, JSON.stringify({
        report_type: reportType,
        severity: severity,
        previous_strikes: currentStrikes,
        new_strikes: newStrikeCount,
        previous_status: currentStatus,
        new_status: newStatus,
        suspended_until: suspendedUntil
      })]
    );

    // Send professional notification to user
    let notificationMessage = '';

    if (newStatus === 'banned') {
      notificationMessage = `🚫 **Account Permanently Banned**\n\n**Violation:** ${reportType}\n**Severity:** ${severity}\n**Strikes:** ${newStrikeCount}/3\n\nYour account has been permanently banned due to severe violations of PeerFusion's community guidelines and Terms of Service.\n\n**Appeal Process:**\nIf you believe this action was taken in error, you may submit an appeal through our Support Center within 30 days.\n\n**Appeal Portal:** [Submit Appeal](/appeal)\n\nAll appeals are reviewed by our moderation team within 5-7 business days.\n\nPlease ensure future interactions comply with our platform standards [Terms and Conditions](/terms).`;
    } else if (newStatus === 'suspended') {
      notificationMessage = `⏸️ **Account Suspended**\n\n**Violation:** ${reportType}\n**Severity:** ${severity}\n**Strikes:** ${newStrikeCount}/3\n**Suspension End:** ${suspendedUntil.toLocaleDateString()}\n\nYour account has been temporarily suspended due to repeated violations of our community standards.\n\n**Appeal Process:**\nIf you believe this suspension was issued incorrectly, you can submit an appeal for review.\n\n**Appeal Portal:** [Submit Appeal](/appeal)\n\nDuring the suspension period, you will not be able to access most platform features.\n\nPlease ensure future interactions comply with our platform standards [Terms and Conditions](/terms).`;
    } else {
      notificationMessage = `⚠️ **Strike Issued**\n\n**Violation:** ${reportType}\n**Severity:** ${severity}\n**Current Strikes:** ${newStrikeCount}/3\n\nA strike has been added to your account for violating PeerFusion's community guidelines.\n\n**Consequences:**\n- ${newStrikeCount === 1 ? 'First warning - Please review our guidelines' : 
                      newStrikeCount === 2 ? 'Final warning - Next violation may result in suspension' : 
                      'Account suspension - Further violations may lead to permanent ban'}\n\n**Appeal Process:**\nIf you believe this strike was issued in error, you may appeal this decision.\n\n**Appeal Portal:** [Submit Appeal](/appeal)\n\nPlease ensure future interactions comply with our platform standards [Terms and Conditions](/terms).`;
    }

    await connection.query(
      'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (?, ?, ?, ?, NOW())',
      [adminId, reportedUserId, notificationMessage, 'penalty']
    );

    return {
      strikeCount: newStrikeCount,
      status: newStatus,
      suspendedUntil: suspendedUntil,
      action: penaltyAction
    };

  } catch (error) {
    console.error('Error applying strike penalty:', error);
    throw error;
  }
};

// UPDATE report status - Accessible by both admin and moderators
router.patch('/reports/:id/status', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { status, resolution_notes, apply_penalty } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const result = await executeTransaction(async (connection) => {
      // First get report details
      const [reportData] = await connection.query(
        `SELECT r.*, u.strike_count, u.status as user_status 
         FROM reports r 
         LEFT JOIN users u ON r.reported_user_id = u.id 
         WHERE r.id = ?`,
        [reportId]
      );
      
      if (reportData.length === 0) {
        throw new Error('Report not found');
      }

      const report = reportData[0];
      let penaltyResult = null;

      // Apply penalty if requested and report is being resolved
      if (apply_penalty && status === 'resolved') {
        penaltyResult = await applyStrikePenalty(
          report.reported_user_id, 
          report.report_type, 
          report.severity, 
          connection, 
          adminId
        );
      }

      // Update report status
      let sql, params;
      
      if (status === 'resolved' || status === 'dismissed') {
        sql = `
          UPDATE reports 
          SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        params = [status, resolution_notes, adminId, reportId];
      } else {
        sql = `
          UPDATE reports 
          SET status = ?, resolution_notes = ?
          WHERE id = ?
        `;
        params = [status, resolution_notes, reportId];
      }
      
      const [updateResult] = await connection.query(sql, params);
      
      if (updateResult.affectedRows === 0) {
        throw new Error('Report not found');
      }

      // Log the action
      await connection.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [adminId, 'REPORT_RESOLVED', report.reported_user_id, JSON.stringify({ 
          report_id: reportId, 
          status: status,
          resolution_notes: resolution_notes,
          penalty_applied: !!apply_penalty,
          penalty_details: penaltyResult
        })]
      );

      return {
        report: report,
        penalty: penaltyResult
      };
    });

    res.json({
      success: true,
      message: `Report ${status} successfully`,
      penalty_applied: !!apply_penalty,
      penalty_details: result.penalty
    });
  } catch (err) {
    console.error('Error updating report status:', err);
    res.status(500).json({
      success: false,
      error: 'Error updating report status',
      details: err.message
    });
  }
});

// GET report statistics - Accessible by both admin and moderators
router.get('/reports/stats', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        status,
        severity,
        COUNT(*) as count
      FROM reports 
      GROUP BY status, severity
      ORDER BY 
        CASE severity 
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        status
    `;

    const [rows] = await pool.query(sql);
    
    const stats = {
      total: 0,
      byStatus: {},
      bySeverity: {
        high: 0,
        medium: 0,
        low: 0
      },
      byType: {}
    };
    
    rows.forEach(row => {
      stats.total += row.count;
      
      // By status
      if (!stats.byStatus[row.status]) {
        stats.byStatus[row.status] = 0;
      }
      stats.byStatus[row.status] += row.count;
      
      // By severity
      if (stats.bySeverity.hasOwnProperty(row.severity)) {
        stats.bySeverity[row.severity] += row.count;
      }
    });
    
    const [typeRows] = await pool.query(`
      SELECT report_type, severity, COUNT(*) as count 
      FROM reports 
      GROUP BY report_type, severity
    `);
    
    stats.byType = {};
    typeRows.forEach(row => {
      if (!stats.byType[row.report_type]) {
        stats.byType[row.report_type] = {
          total: 0,
          bySeverity: { high: 0, medium: 0, low: 0 }
        };
      }
      stats.byType[row.report_type].total += row.count;
      if (stats.byType[row.report_type].bySeverity.hasOwnProperty(row.severity)) {
        stats.byType[row.report_type].bySeverity[row.severity] += row.count;
      }
    });
    
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Error fetching report statistics:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching report statistics',
      details: err.message
    });
  }
});

// GET single report details - Accessible by both admin and moderators
router.get('/reports/:id', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    
    const sql = `
      SELECT 
        r.*,
        reporter_profile.username as reporter_username,
        reporter_user.email as reporter_email,
        reported_profile.username as reported_username,
        reported_user.email as reported_email,
        resolver_profile.username as resolved_by_username
      FROM reports r
      LEFT JOIN user_profiles reporter_profile ON r.reporter_id = reporter_profile.user_id
      LEFT JOIN users reporter_user ON r.reporter_id = reporter_user.id
      LEFT JOIN user_profiles reported_profile ON r.reported_user_id = reported_profile.user_id
      LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
      LEFT JOIN user_profiles resolver_profile ON r.resolved_by = resolver_profile.user_id
      WHERE r.id = ?
    `;
    
    const [rows] = await pool.query(sql, [reportId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      report: rows[0]
    });
  } catch (err) {
    console.error('Error fetching report details:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching report details',
      details: err.message
    });
  }
});

// GET all feedback with user details - Accessible by both admin and moderators
router.get('/feedback', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        f.id,
        f.sender_id,
        sender_profile.username as sender_username,
        sender_user.email as sender_email,
        f.receiver_id,
        receiver_profile.username as receiver_username,
        receiver_user.email as receiver_email,
        f.rating,
        f.message,
        f.is_recommended,
        f.created_at
      FROM feedback f
      LEFT JOIN user_profiles sender_profile ON f.sender_id = sender_profile.user_id
      LEFT JOIN users sender_user ON f.sender_id = sender_user.id
      LEFT JOIN user_profiles receiver_profile ON f.receiver_id = receiver_profile.user_id
      LEFT JOIN users receiver_user ON f.receiver_id = receiver_user.id
      ORDER BY f.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    
    res.json({
      success: true,
      feedback: rows
    });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching feedback',
      details: err.message
    });
  }
});

// GET feedback for specific user - Accessible by both admin and moderators
router.get('/feedback/user/:userId', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const sql = `
      SELECT 
        f.id,
        f.sender_id,
        sender_profile.username as sender_username,
        sender_profile.avatar as sender_avatar,
        sender_user.email as sender_email,
        f.receiver_id,
        receiver_profile.username as receiver_username,
        receiver_profile.avatar as receiver_avatar,
        receiver_user.email as receiver_email,
        f.rating,
        f.message,
        f.is_recommended,
        f.created_at
      FROM feedback f
      LEFT JOIN user_profiles sender_profile ON f.sender_id = sender_profile.user_id
      LEFT JOIN users sender_user ON f.sender_id = sender_user.id
      LEFT JOIN user_profiles receiver_profile ON f.receiver_id = receiver_profile.user_id
      LEFT JOIN users receiver_user ON f.receiver_id = receiver_user.id
      WHERE f.receiver_id = ? OR f.sender_id = ?
      ORDER BY f.created_at DESC
    `;

    const [rows] = await pool.query(sql, [userId, userId]);
    
    res.json({
      success: true,
      feedback: rows
    });
  } catch (err) {
    console.error('Error fetching user feedback:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching user feedback',
      details: err.message
    });
  }
});

// GET feedback statistics - Accessible by both admin and moderators
router.get('/feedback/stats', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN is_recommended = true THEN 1 END) as total_recommended,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM feedback
    `;

    const [rows] = await pool.query(sql);
    
    res.json({
      success: true,
      stats: rows[0]
    });
  } catch (err) {
    console.error('Error fetching feedback statistics:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching feedback statistics',
      details: err.message
    });
  }
});

// GET unique users with their latest feedback for the main view - Accessible by both admin and moderators
router.get('/feedback/unique-users', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT 
        u.id as user_id,
        up.username,
        u.email,
        up.avatar,
        up.rating,
        up.total_reviews,
        (
          SELECT f2.id 
          FROM feedback f2 
          WHERE f2.sender_id = u.id OR f2.receiver_id = u.id 
          ORDER BY f2.created_at DESC 
          LIMIT 1
        ) as latest_feedback_id,
        (
          SELECT COUNT(*) 
          FROM feedback f3 
          WHERE f3.sender_id = u.id OR f3.receiver_id = u.id
        ) as total_feedbacks
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id IN (
        SELECT DISTINCT sender_id FROM feedback
        UNION
        SELECT DISTINCT receiver_id FROM feedback
      )
      ORDER BY latest_feedback_id DESC
    `;

    const [rows] = await pool.query(sql);
    
    res.json({
      success: true,
      users: rows
    });
  } catch (err) {
    console.error('Error fetching unique users:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching unique users',
      details: err.message
    });
  }
});

// GET unique users with their recommended status - Accessible by both admin and moderators
router.get('/feedback/unique-users-with-recommended', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT 
        u.id as user_id,
        up.username,
        u.email,
        up.avatar,
        up.rating,
        up.total_reviews,
        (
          SELECT f2.id 
          FROM feedback f2 
          WHERE f2.sender_id = u.id OR f2.receiver_id = u.id 
          ORDER BY f2.created_at DESC 
          LIMIT 1
        ) as latest_feedback_id,
        (
          SELECT COUNT(*) 
          FROM feedback f3 
          WHERE f3.sender_id = u.id OR f3.receiver_id = u.id
        ) as total_feedbacks,
        (
          SELECT COUNT(*) > 0
          FROM feedback f4 
          WHERE (f4.sender_id = u.id OR f4.receiver_id = u.id) 
          AND (f4.is_recommended = true OR f4.is_recommended = 1)
        ) as has_recommended
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id IN (
        SELECT DISTINCT sender_id FROM feedback
        UNION
        SELECT DISTINCT receiver_id FROM feedback
      )
      ORDER BY latest_feedback_id DESC
    `;

    const [rows] = await pool.query(sql);
    
    const usersWithBoolean = rows.map(user => ({
      ...user,
      has_recommended: Boolean(user.has_recommended)
    }));
    
    res.json({
      success: true,
      users: usersWithBoolean
    });
  } catch (err) {
    console.error('Error fetching unique users with recommended:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching unique users',
      details: err.message
    });
  }
});

//-----------------------------Appeal Page ---------------------------------//
// Appeals Management Routes - Accessible by both admin and moderators

router.get('/appeals', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        a.id,
        a.user_id,
        u.email as user_email,
        up.username as user_username,
        a.report_id,
        r.report_type,
        r.severity as report_severity,
        a.appeal_type,
        a.reason,
        a.status,
        a.evidence,
        a.created_at,
        a.reviewed_at,
        a.reviewed_by,
        reviewer.email as reviewer_email,
        reviewer_profile.username as reviewer_username,
        a.resolution_notes,
        u.status as user_status,
        u.strike_count,
        u.suspended_until,
        a.appellant_name,
        a.appellant_email,
        a.appellant_role,
        -- Determine if it's a public appeal
        CASE 
          WHEN a.user_id IS NULL THEN 'public'
          ELSE 'user'
        END as appeal_source
      FROM appeals a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles up ON a.user_id = up.user_id
      LEFT JOIN reports r ON a.report_id = r.id
      LEFT JOIN users reviewer ON a.reviewed_by = reviewer.id
      LEFT JOIN user_profiles reviewer_profile ON a.reviewed_by = reviewer_profile.user_id
      ORDER BY 
        CASE a.status 
          WHEN 'pending' THEN 1
          WHEN 'under_review' THEN 2
          WHEN 'approved' THEN 3
          ELSE 4
        END,
        a.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    
    // Parse evidence JSON and add file URLs
    const appealsWithEvidence = rows.map(appeal => {
      let evidence = null;
      let evidence_urls = [];
      
      // Handle evidence parsing
      if (appeal.evidence) {
        try {
          if (typeof appeal.evidence === 'string') {
            const trimmedEvidence = appeal.evidence.trim();
            if (trimmedEvidence.startsWith('[') || trimmedEvidence.startsWith('{')) {
              evidence = JSON.parse(trimmedEvidence);
            } else {
              // Fallback for plain filename strings
              evidence = [{
                filename: appeal.evidence,
                originalname: appeal.evidence,
                mimetype: getMimeTypeFromFilename(appeal.evidence),
                size: 0,
                path: `/uploads/evidence/${appeal.evidence}`
              }];
            }
          } else {
            evidence = appeal.evidence;
          }
        } catch (error) {
          console.error(`Error parsing evidence for appeal ${appeal.id}:`, error);
          evidence = [{
            filename: String(appeal.evidence),
            originalname: String(appeal.evidence),
            mimetype: 'unknown',
            size: 0,
            path: `/uploads/evidence/${appeal.evidence}`
          }];
        }
      }
      
      // Generate evidence URLs for admin access
      if (evidence && Array.isArray(evidence)) {
        evidence_urls = evidence.map(evidenceItem => ({
          ...evidenceItem,
          url: `${API_BASE}/admin/appeals/evidence/${evidenceItem.filename}`,
          previewUrl: evidenceItem.mimetype?.startsWith('image/') ? 
            `${API_BASE}/admin/appeals/evidence/${evidenceItem.filename}` : null
        }));
      }
      
      return {
        ...appeal,
        evidence: evidence,
        evidence_urls: evidence_urls,
        // Add appeal source flag
        is_public_appeal: appeal.appeal_source === 'public',
        display_name: appeal.appeal_source === 'public' ? 
          appeal.appellant_name : (appeal.user_username || 'Unknown User'),
        display_email: appeal.appeal_source === 'public' ? 
          appeal.appellant_email : appeal.user_email,
        display_role: appeal.appeal_source === 'public' ? 
          appeal.appellant_role : (appeal.user_role || 'User')
      };
    });
    
    res.json({
      success: true,
      appeals: appealsWithEvidence
    });
  } catch (err) {
    handleError(res, err, 'Error fetching appeals');
  }
});

// Helper function to guess MIME type from filename
function getMimeTypeFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'avi': 'video/avi'
  };
  return mimeTypes[ext] || 'unknown';
}

// GET appeal evidence file - ADMIN ACCESS
router.get('/appeals/evidence/:filename', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security check: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    const evidencePath = path.join(__dirname, '../uploads/evidence', filename);
    
    console.log('Looking for evidence file:', evidencePath);
    
    if (!fs.existsSync(evidencePath)) {
      console.log('Evidence file not found:', evidencePath);
      return res.status(404).json({
        success: false,
        error: 'Evidence file not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(evidencePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file'
      });
    }

    const ext = path.extname(filename).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const videoExtensions = ['.mp4', '.avi'];
    
    if (imageExtensions.includes(ext)) {
      const mimeType = ext === '.png' ? 'image/png' : 
                      ext === '.gif' ? 'image/gif' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
    } else if (videoExtensions.includes(ext)) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    console.log('Serving evidence file:', filename);
    res.sendFile(evidencePath);
    
  } catch (err) {
    console.error('Error serving appeal evidence file:', err);
    res.status(500).json({
      success: false,
      error: 'Error serving evidence file',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// GET appeal statistics
router.get('/appeals/stats', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        status,
        appeal_type,
        COUNT(*) as count
      FROM appeals 
      GROUP BY status, appeal_type
      ORDER BY status, appeal_type
    `;

    const [rows] = await pool.query(sql);
    
    const stats = {
      total: 0,
      byStatus: {},
      byType: {}
    };
    
    rows.forEach(row => {
      stats.total += row.count;
      
      // By status
      if (!stats.byStatus[row.status]) {
        stats.byStatus[row.status] = 0;
      }
      stats.byStatus[row.status] += row.count;
      
      // By type
      if (!stats.byType[row.appeal_type]) {
        stats.byType[row.appeal_type] = 0;
      }
      stats.byType[row.appeal_type] += row.count;
    });
    
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    handleError(res, err, 'Error fetching appeal statistics');
  }
});

// UPDATE appeal status
router.patch('/appeals/:id/status', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const appealId = req.params.id;
    const { status, resolution_notes, apply_user_action } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['pending', 'under_review', 'approved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const result = await executeTransaction(async (connection) => {
      // First get appeal details with source information
      const [appealData] = await connection.query(
        `SELECT a.*, u.status as user_status, u.strike_count, u.suspended_until, 
                CASE WHEN a.user_id IS NULL THEN 'public' ELSE 'user' END as appeal_source
         FROM appeals a 
         LEFT JOIN users u ON a.user_id = u.id 
         WHERE a.id = ?`,
        [appealId]
      );
      
      if (appealData.length === 0) {
        throw new Error('Appeal not found');
      }

      const appeal = appealData[0];
      const isPublicAppeal = appeal.appeal_source === 'public';
      let userActionResult = null;

      // Apply user action only for user appeals (not public) and when approved
      if (status === 'approved' && apply_user_action && !isPublicAppeal && appeal.user_id) {
        switch (appeal.appeal_type) {
          case 'account_reactivation':
            // Reactivate user account
            await connection.query(
              'UPDATE users SET status = "active", suspended_until = NULL WHERE id = ?',
              [appeal.user_id]
            );
            userActionResult = { action: 'account_reactivated', details: 'User account reactivated' };
            break;
            
          case 'strike_removal':
            // Reduce strike count by 1 (minimum 0)
            const newStrikeCount = Math.max(0, (appeal.strike_count || 0) - 1);
            await connection.query(
              'UPDATE users SET strike_count = ? WHERE id = ?',
              [newStrikeCount, appeal.user_id]
            );
            userActionResult = { 
              action: 'strike_removed', 
              details: `Strike count reduced from ${appeal.strike_count} to ${newStrikeCount}` 
            };
            break;
            
          case 'content_review':
            // For content review appeals, we might need to update report status
            if (appeal.report_id) {
              await connection.query(
                'UPDATE reports SET status = "dismissed", resolved_by = ?, resolved_at = NOW() WHERE id = ?',
                [adminId, appeal.report_id]
              );
              userActionResult = { action: 'report_dismissed', details: 'Associated report dismissed' };
            }
            break;
        }

        // Send notification to user as "PeerFusion Team"
        let approvalMessage = `**Appeal Approved**\n\nYour ${appeal.appeal_type.replace('_', ' ')} appeal has been approved by the PeerFusion Team.`;
        
        if (userActionResult) {
          approvalMessage += `\n\n**Action Taken:** ${userActionResult.details}`;
        }
        
        if (resolution_notes) {
          approvalMessage += `\n\n**Notes:** ${resolution_notes}`;
        }
        
        approvalMessage += `\n\nIf you have any questions, please contact our support team.`;

        await connection.query(
          'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (?, ?, ?, ?, NOW())',
          [adminId, appeal.user_id, approvalMessage, 'appeal_approved']
        );
      } else if (status === 'approved' && apply_user_action && isPublicAppeal) {
        // Public appeal - can't apply user actions since we don't have user_id
        userActionResult = { 
          action: 'no_action', 
          details: 'Public appeal - no user account actions available. User must login to see changes.' 
        };
        
        // For public appeals, we can still send an email notification if needed
        // (You would implement email sending logic here)
        console.log(`Public appeal ${appealId} approved. Would send email to: ${appeal.appellant_email}`);
      } else if (status === 'rejected') {
        // Send rejection notification
        let rejectionMessage = `**Appeal Rejected**\n\nYour ${appeal.appeal_type.replace('_', ' ')} appeal has been reviewed and rejected by the PeerFusion Team.`;
        
        if (resolution_notes) {
          rejectionMessage += `\n\n**Reason:** ${resolution_notes}`;
        } else {
          rejectionMessage += `\n\n**Reason:** The appeal did not meet the criteria for approval based on our community guidelines and review process.`;
        }
        
        rejectionMessage += `\n\nYou may submit a new appeal with additional evidence or clarification if you have new information to present.`;

        // Send notification to user if it's a user appeal, or log for public appeal
        if (!isPublicAppeal && appeal.user_id) {
          await connection.query(
            'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (?, ?, ?, ?, NOW())',
            [adminId, appeal.user_id, rejectionMessage, 'appeal_rejected']
          );
        } else if (isPublicAppeal) {
          // For public appeals, log that we would send email
          console.log(`Public appeal ${appealId} rejected. Would send email to: ${appeal.appellant_email}`);
        }
      }

      // Update appeal status
      const updateSql = `
        UPDATE appeals 
        SET status = ?, resolution_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      const [updateResult] = await connection.query(updateSql, [
        status, 
        resolution_notes, 
        adminId, 
        appealId
      ]);
      
      if (updateResult.affectedRows === 0) {
        throw new Error('Appeal not found');
      }

      // Log the action
      await connection.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [adminId, 'APPEAL_REVIEWED', appeal.user_id, JSON.stringify({ 
          appeal_id: appealId,
          appeal_type: appeal.appeal_type,
          status: status,
          resolution_notes: resolution_notes,
          user_action_applied: !!apply_user_action,
          user_action_details: userActionResult,
          is_public_appeal: isPublicAppeal,
          appellant_email: isPublicAppeal ? appeal.appellant_email : null,
          appellant_name: isPublicAppeal ? appeal.appellant_name : null
        })]
      );

      return {
        appeal: appeal,
        user_action: userActionResult,
        is_public_appeal: isPublicAppeal
      };
    });

    res.json({
      success: true,
      message: `Appeal ${status} successfully`,
      user_action_applied: !!apply_user_action,
      user_action_details: result.user_action,
      is_public_appeal: result.is_public_appeal
    });
  } catch (err) {
    console.error('Error updating appeal status:', err);
    res.status(500).json({
      success: false,
      error: 'Error updating appeal status',
      details: err.message
    });
  }
});

// GET single appeal details
router.get('/appeals/:id', authenticateToken, requireModeratorOrAdmin, async (req, res) => {
  try {
    const appealId = req.params.id;
    
    const sql = `
      SELECT 
        a.*,
        u.email as user_email,
        up.username as user_username,
        u.status as user_status,
        u.strike_count,
        u.suspended_until,
        r.report_type,
        r.description as report_description,
        r.severity as report_severity,
        reviewer.email as reviewer_email,
        reviewer_profile.username as reviewer_username,
        -- Determine if it's a public appeal
        CASE 
          WHEN a.user_id IS NULL THEN 'public'
          ELSE 'user'
        END as appeal_source
      FROM appeals a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles up ON a.user_id = up.user_id
      LEFT JOIN reports r ON a.report_id = r.id
      LEFT JOIN users reviewer ON a.reviewed_by = reviewer.id
      LEFT JOIN user_profiles reviewer_profile ON a.reviewed_by = reviewer_profile.user_id
      WHERE a.id = ?
    `;
    
    const [rows] = await pool.query(sql, [appealId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appeal not found'
      });
    }

    const appeal = rows[0];
    
    // Parse evidence if exists
    let evidenceData = null;
    if (appeal.evidence) {
      try {
        evidenceData = typeof appeal.evidence === 'string' ? 
          JSON.parse(appeal.evidence) : appeal.evidence;
      } catch (error) {
        console.error('Error parsing evidence:', error);
        evidenceData = null;
      }
    }

    // Add appeal source information and display fields
    const enhancedAppeal = {
      ...appeal,
      evidence: evidenceData,
      is_public_appeal: appeal.appeal_source === 'public',
      display_name: appeal.appeal_source === 'public' ? 
        appeal.appellant_name : (appeal.user_username || 'Unknown User'),
      display_email: appeal.appeal_source === 'public' ? 
        appeal.appellant_email : appeal.user_email,
      display_role: appeal.appeal_source === 'public' ? 
        appeal.appellant_role : 'User'
    };
    
    res.json({
      success: true,
      appeal: enhancedAppeal
    });
  } catch (err) {
    console.error('Error fetching appeal details:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching appeal details',
      details: err.message
    });
  }
});

// User appeal submission route (for regular users)
router.post('/appeals/submit', authenticateToken, async (req, res) => {
  try {
    const { appeal_type, reason, report_id } = req.body;
    const userId = req.user.id;

    if (!appeal_type || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Appeal type and reason are required'
      });
    }

    // Validate appeal type
    const allowedTypes = ['account_reactivation', 'strike_removal', 'content_review'];
    if (!allowedTypes.includes(appeal_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appeal type'
      });
    }

    // Check if user exists and can appeal
    const [users] = await pool.query(
      'SELECT status, strike_count FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[0];

    // Validate appeal type against user status
    if (appeal_type === 'account_reactivation' && user.status !== 'suspended' && user.status !== 'banned') {
      return res.status(400).json({
        success: false,
        error: 'Account reactivation appeals are only for suspended or banned accounts'
      });
    }

    if (appeal_type === 'strike_removal' && user.strike_count === 0) {
      return res.status(400).json({
        success: false,
        error: 'No strikes to remove'
      });
    }

    // Check for duplicate pending appeal
    const [existingAppeals] = await pool.query(
      'SELECT id FROM appeals WHERE user_id = ? AND status = "pending" AND appeal_type = ?',
      [userId, appeal_type]
    );

    if (existingAppeals.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending appeal of this type'
      });
    }

    // Insert the appeal
    const sql = `
      INSERT INTO appeals (user_id, report_id, appeal_type, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', NOW())
    `;

    const [result] = await pool.query(sql, [userId, report_id || null, appeal_type, reason]);

    res.json({
      success: true,
      message: 'Appeal submitted successfully',
      appeal_id: result.insertId
    });

  } catch (err) {
    console.error('Error submitting appeal:', err);
    res.status(500).json({
      success: false,
      error: 'Error submitting appeal',
      details: err.message
    });
  }
});

// GET user's own appeals
router.get('/appeals/my-appeals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `
      SELECT 
        a.id,
        a.appeal_type,
        a.reason,
        a.status,
        a.evidence,
        a.created_at,
        a.reviewed_at,
        a.resolution_notes,
        r.report_type,
        reviewer_profile.username as reviewer_username
      FROM appeals a
      LEFT JOIN reports r ON a.report_id = r.id
      LEFT JOIN user_profiles reviewer_profile ON a.reviewed_by = reviewer_profile.user_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `;
    
    const [rows] = await pool.query(sql, [userId]);
    
    res.json({
      success: true,
      appeals: rows
    });
  } catch (err) {
    console.error('Error fetching user appeals:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching your appeals',
      details: err.message
    });
  }
});
//-------------------------------------Appeal page end -------------------------------//

module.exports = router;