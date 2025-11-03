const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const evidenceDir = path.join(__dirname, '../uploads/evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    cb(null, evidenceDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'appeal-evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// GET user's own appeals
router.get('/my-appeals', authenticateToken, async (req, res) => {
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
        a.appellant_name,
        a.appellant_email,
        a.appellant_role,
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

// POST submit new appeal - USER VERSION (authenticated)
router.post('/submit', authenticateToken, upload.array('evidence_files', 5), async (req, res) => {
  let uploadedFiles = [];
  
  try {
    const { appeal_type, reason, report_id } = req.body;
    const userId = req.user.id;

    if (req.files) {
      uploadedFiles = req.files;
    }

    if (!appeal_type || !reason) {
      cleanupFiles(uploadedFiles);
      return res.status(400).json({
        success: false,
        error: 'Appeal type and reason are required'
      });
    }

    const allowedTypes = ['account_reactivation', 'strike_removal', 'content_review'];
    if (!allowedTypes.includes(appeal_type)) {
      cleanupFiles(uploadedFiles);
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
      cleanupFiles(uploadedFiles);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[0];

    // Validate appeal type against user status
    if (appeal_type === 'account_reactivation' && user.status !== 'suspended' && user.status !== 'banned') {
      cleanupFiles(uploadedFiles);
      return res.status(400).json({
        success: false,
        error: 'Account reactivation appeals are only for suspended or banned accounts'
      });
    }

    if (appeal_type === 'strike_removal' && user.strike_count === 0) {
      cleanupFiles(uploadedFiles);
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
      cleanupFiles(uploadedFiles);
      return res.status(400).json({
        success: false,
        error: 'You already have a pending appeal of this type'
      });
    }

    // Process evidence files
    let evidenceData = [];
    if (uploadedFiles.length > 0) {
      evidenceData = uploadedFiles.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path.replace(/\\/g, '/')
      }));
    }

    // Get user profile data for appellant information
    let finalAppellantName = '';
    let finalAppellantEmail = '';
    let finalAppellantRole = '';

    const [userProfiles] = await pool.query(
      `SELECT u.name, u.email, up.username, u.role 
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [userId]
    );
    
    if (userProfiles.length > 0) {
      const userData = userProfiles[0];
      finalAppellantName = userData.username || userData.name || 'Unknown User';
      finalAppellantEmail = userData.email || 'unknown@example.com';
      finalAppellantRole = userData.role || 'Skill Learner';
    } else {
      // Fallback values
      finalAppellantName = 'Unknown User';
      finalAppellantEmail = 'unknown@example.com';
      finalAppellantRole = 'Skill Learner';
    }

    console.log('Inserting user appeal with data:', {
      userId,
      report_id: report_id || null,
      appeal_type,
      reason,
      evidenceCount: evidenceData.length,
      appellantName: finalAppellantName,
      appellantEmail: finalAppellantEmail,
      appellantRole: finalAppellantRole
    });

    // Insert the appeal
    const sql = `
      INSERT INTO appeals (
        user_id, 
        report_id, 
        appeal_type, 
        reason, 
        evidence, 
        status, 
        created_at,
        appellant_name,
        appellant_email,
        appellant_role
      ) VALUES (?, ?, ?, ?, ?, 'pending', NOW(), ?, ?, ?)
    `;

    const evidenceJSON = evidenceData.length > 0 ? JSON.stringify(evidenceData) : null;
    
    const [result] = await pool.query(sql, [
      userId,
      report_id || null, 
      appeal_type, 
      reason, 
      evidenceJSON,
      finalAppellantName,
      finalAppellantEmail,
      finalAppellantRole
    ]);

    console.log('User appeal inserted successfully, ID:', result.insertId);

    // Create notification for admins/moderators about new appeal
    try {
      const [admins] = await pool.query(
        `SELECT id FROM users WHERE role IN ('admin', 'moderator') AND status = 'active'`
      );
      
      const notificationMessage = `📋 New User Appeal Submitted\n\nType: ${appeal_type.replace('_', ' ')}\nUser: ${finalAppellantName}\nStatus: Pending Review`;
      
      for (const admin of admins) {
        await pool.query(
          'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, admin.id, notificationMessage, 'appeal_submitted']
        );
      }
    } catch (notifyError) {
      console.warn('Could not send admin notifications:', notifyError);
    }

    res.json({
      success: true,
      message: 'Appeal submitted successfully',
      appeal_id: result.insertId
    });

  } catch (err) {
    // Clean up uploaded files on error
    cleanupFiles(uploadedFiles);
    console.error('Error submitting user appeal:', err);
    res.status(500).json({
      success: false,
      error: 'Error submitting appeal',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Helper function to clean up uploaded files
function cleanupFiles(files) {
  if (files && files.length > 0) {
    files.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log('Cleaned up file:', file.path);
        }
      } catch (cleanupError) {
        console.warn('Could not delete file:', file.path, cleanupError);
      }
    });
  }
}

// GET user's strike information - SIMPLE VERSION
router.get('/strike-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current strike information directly from users table
    const sql = `
      SELECT 
        id,
        name as username,
        email,
        status,
        strike_count,
        suspended_until,
        created_at,
        total_reports
      FROM users 
      WHERE id = ?
    `;

    const [rows] = await pool.query(sql, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = rows[0];
    
    res.json({
      success: true,
      userData: {
        username: user.username,
        email: user.email,
        status: user.status,
        strike_count: user.strike_count || 0,
        suspended_until: user.suspended_until,
        total_reports: user.total_reports || 0,
        account_created: user.created_at
      }
    });

  } catch (err) {
    console.error('Error fetching strike info:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching strike information',
      details: err.message
    });
  }
});

// GET single appeal details for user
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const appealId = req.params.id;
    const userId = req.user.id;
    
    const sql = `
      SELECT 
        a.*,
        r.report_type,
        r.description as report_description,
        r.severity as report_severity,
        reviewer_profile.username as reviewer_username
      FROM appeals a
      LEFT JOIN reports r ON a.report_id = r.id
      LEFT JOIN user_profiles reviewer_profile ON a.reviewed_by = reviewer_profile.user_id
      WHERE a.id = ? AND a.user_id = ?
    `;
    
    const [rows] = await pool.query(sql, [appealId, userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appeal not found'
      });
    }
    
    res.json({
      success: true,
      appeal: rows[0]
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

// POST submit public appeal (no authentication required)
router.post('/public-submit', upload.array('evidence_files', 5), async (req, res) => {
  let uploadedFiles = [];
  
  try {
    console.log('Received public appeal submission:', {
      body: req.body,
      files: req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'No files'
    });

    const { appeal_type, reason, report_id, appellant_name, appellant_email, appellant_role } = req.body;

    if (req.files) {
      uploadedFiles = req.files;
    }

    if (!appeal_type || !reason || !appellant_name || !appellant_email) {
      cleanupFiles(uploadedFiles);
      return res.status(400).json({
        success: false,
        error: 'Appeal type, reason, name, and email are required'
      });
    }

    const allowedTypes = ['account_reactivation', 'strike_removal', 'content_review'];
    if (!allowedTypes.includes(appeal_type)) {
      cleanupFiles(uploadedFiles);
      return res.status(400).json({
        success: false,
        error: 'Invalid appeal type'
      });
    }

    // Process evidence files
    let evidenceData = [];
    if (uploadedFiles.length > 0) {
      evidenceData = uploadedFiles.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path.replace(/\\/g, '/')
      }));
    }

    console.log('Inserting public appeal with data:', {
      appellant_name,
      appellant_email,
      appellant_role: appellant_role || 'Skill Learner',
      appeal_type,
      reason,
      evidenceCount: evidenceData.length
    });

    // Insert the appeal with user_id as NULL (public appeal)
    const sql = `
      INSERT INTO appeals (
        user_id, 
        report_id, 
        appeal_type, 
        reason, 
        evidence, 
        status, 
        created_at,
        appellant_name,
        appellant_email,
        appellant_role
      ) VALUES (NULL, ?, ?, ?, ?, 'pending', NOW(), ?, ?, ?)
    `;

    const evidenceJSON = evidenceData.length > 0 ? JSON.stringify(evidenceData) : null;
    
    const [result] = await pool.query(sql, [
      report_id || null, 
      appeal_type, 
      reason, 
      evidenceJSON,
      appellant_name,
      appellant_email,
      appellant_role || 'Skill Learner'
    ]);

    console.log('Public appeal inserted successfully, ID:', result.insertId);

    // Create notification for admins/moderators about new public appeal
    try {
      const [admins] = await pool.query(
        `SELECT id FROM users WHERE role IN ('admin', 'moderator') AND status = 'active'`
      );
      
      const notificationMessage = `📋 Public Appeal Submitted\n\nType: ${appeal_type.replace('_', ' ')}\nUser: ${appellant_name} (${appellant_email})\nStatus: Pending Review\n\nNote: This appeal was submitted via public form.`;
      
      for (const admin of admins) {
        await pool.query(
          'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (?, ?, ?, ?, NOW())',
          [null, admin.id, notificationMessage, 'public_appeal_submitted']
        );
      }
    } catch (notifyError) {
      console.warn('Could not send admin notifications:', notifyError);
    }

    res.json({
      success: true,
      message: 'Appeal submitted successfully. Our team will review it within 3-5 business days.',
      appeal_id: result.insertId
    });

  } catch (err) {
    // Clean up uploaded files on error
    cleanupFiles(uploadedFiles);
    console.error('Error submitting public appeal:', err);
    res.status(500).json({
      success: false,
      error: 'Error submitting appeal',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

module.exports = router;