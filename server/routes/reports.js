const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for evidence uploads
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
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// POST new report with evidence
router.post('/', authenticateToken, upload.array('evidence', 5), async (req, res) => {
  try {
    const { reported_user_id, report_type, description, source = 'chat' } = req.body;
    const reporter_id = req.user.id;

    if (!reported_user_id || !report_type) {
      // Clean up uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Reported user ID and report type are required'
      });
    }
    // Validate source or set default
    const validSources = ['chat_message', 'chat_page', 'video_call'];
    const reportSource = validSources.includes(source) ? source : 'chat_message';

    // Check if reported user exists
    const [userCheck] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [reported_user_id]
    );

    if (userCheck.length === 0) {
      // Clean up uploaded files if user not found
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(404).json({
        success: false,
        error: 'Reported user not found'
      });
    }

    // Check if user is trying to report themselves
    if (parseInt(reporter_id) === parseInt(reported_user_id)) {
      // Clean up uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({
        success: false,
        error: 'You cannot report yourself'
      });
    }

    // Determine severity based on report type
  const detectSeverity = (reportType, description = '') => {
    let severity = 'low';
    const highSeverityTypes = ['Harassment', 'Hate Speech', 'Sexual Content', 'Violence or Threats', 'Self-harm', 'Scam or Fraud'];
    const mediumSeverityTypes = ['Inappropriate Behavior', 'False Information'];
    
    // High severity keywords that trigger immediate attention
    const highSeverityKeywords = [
      'kill', 'suicide', 'murder', 'harm', 'hurt', 'attack', 'bomb', 'weapon',
      'die', 'death', 'dead', 'shoot', 'stab', 'violence', 'threat', 'threaten',
      'rape', 'assault', 'abuse', 'terrorist', 'explosive', 'gun', 'knife'
    ];
    
    // Medium severity keywords
    const mediumSeverityKeywords = [
      'stupid', 'idiot', 'moron', 'hate', 'ugly', 'fat', 'stupid', 'dumb'
    ];
    
    const descLower = description.toLowerCase();
    
    // Check for high severity keywords
    const hasHighSeverityKeyword = highSeverityKeywords.some(keyword => 
      descLower.includes(keyword.toLowerCase())
    );
    
    // Check for medium severity keywords
    const hasMediumSeverityKeyword = mediumSeverityKeywords.some(keyword =>
      descLower.includes(keyword.toLowerCase())
    );
    
    if (hasHighSeverityKeyword) {
      severity = 'high';
    } else if (highSeverityTypes.includes(reportType)) {
      severity = 'high';
    } else if (mediumSeverityTypes.includes(reportType) || hasMediumSeverityKeyword) {
      severity = 'medium';
    }
    
    return severity;
  };

    let severity = detectSeverity(report_type, description);

    // Process evidence files
    let evidenceData = [];
    if (req.files && req.files.length > 0) {
      evidenceData = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      }));
    }

    const sql = `
      INSERT INTO reports (
        reporter_id, 
        reported_user_id, 
        report_type, 
        description, 
        status, 
        severity,
        evidence,
        evidence_type,
        source
      ) 
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `;
    
    // Convert evidence data to JSON string safely
    const evidenceJSON = evidenceData.length > 0 ? JSON.stringify(evidenceData) : null;
    const evidenceType = evidenceData.length > 0 ? 
      (evidenceData[0].mimetype.startsWith('image/') ? 'image' : 
       evidenceData[0].mimetype.startsWith('video/') ? 'video' : 'document') : null;
    
    const [result] = await pool.query(sql, [
      reporter_id, 
      reported_user_id, 
      report_type, 
      description, 
      severity,
      evidenceJSON,
      evidenceType,
      reportSource 
    ]);
    
    res.json({
      success: true,
      message: 'Report submitted successfully',
      report_id: result.insertId,
      evidence_count: evidenceData.length
    });
  } catch (err) {
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    console.error('Error submitting report:', err);
    res.status(500).json({
      success: false,
      error: 'Error submitting report',
      details: err.message
    });
  }
});

// GET evidence file
router.get('/evidence/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const evidencePath = path.join(__dirname, '../uploads/evidence', filename);
    
    if (!fs.existsSync(evidencePath)) {
      return res.status(404).json({
        success: false,
        error: 'Evidence file not found'
      });
    }

    // Check if user has permission to view this evidence
    const [reportCheck] = await pool.query(
      `SELECT r.id FROM reports r 
       WHERE r.evidence LIKE ? AND (r.reporter_id = ? OR ? IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')))`,
      [`%${filename}%`, req.user.id, req.user.id]
    );

    if (reportCheck.length === 0 && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this evidence'
      });
    }

    res.sendFile(evidencePath);
  } catch (err) {
    console.error('Error serving evidence file:', err);
    res.status(500).json({
      success: false,
      error: 'Error serving evidence file'
    });
  }
});

// GET user's own reports
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `
      SELECT 
        r.id,
        r.reported_user_id,
        up.username as reported_username,
        r.report_type,
        r.description,
        r.status,
        r.severity,
        r.evidence,
        r.evidence_type,
        r.created_at,
        r.resolved_at,
        r.resolution_notes
      FROM reports r
      LEFT JOIN user_profiles up ON r.reported_user_id = up.user_id
      WHERE r.reporter_id = ?
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await pool.query(sql, [userId]);
    
    // Parse evidence JSON
    const reportsWithEvidence = rows.map(report => ({
      ...report,
      evidence: report.evidence ? JSON.parse(report.evidence) : null
    }));
    
    res.json({
      success: true,
      reports: reportsWithEvidence
    });
  } catch (err) {
    console.error('Error fetching user reports:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching reports',
      details: err.message
    });
  }
});

// Apply strike penalty based on report
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
        suspendedUntil.setDate(suspendedUntil.getDate() + 7);
        penaltyAction = 'USER_SUSPENDED';
      } else if (currentStrikes === 3) {
        newStrikeCount = 4;
        newStatus = 'suspended';
        suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + 30);
        penaltyAction = 'USER_SUSPENDED';
      } else {
        newStrikeCount = 5;
        newStatus = 'banned';
        penaltyAction = 'USER_BANNED';
      }
    }

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

    let notificationMessage = '';

    if (newStatus === 'banned') {
      notificationMessage = `🚫 **Account Permanently Banned**\n\n**Violation:** ${reportType}\n**Severity:** ${severity}\n**Strikes:** ${newStrikeCount}/3\n\nYour account has been permanently banned due to severe violations of PeerFusion's community guidelines and Terms of Service.\n\n**Appeal Process:**\nIf you believe this action was taken in error, you may submit an appeal through our Support Center within 30 days.\n\n**Appeal Portal:** [Submit Appeal](/appeal)\n\nAll appeals are reviewed by our moderation team within 5-7 business days.`;
    } else if (newStatus === 'suspended') {
      notificationMessage = `⏸️ **Account Suspended**\n\n**Violation:** ${reportType}\n**Severity:** ${severity}\n**Strikes:** ${newStrikeCount}/3\n**Suspension End:** ${suspendedUntil.toLocaleDateString()}\n\nYour account has been temporarily suspended due to repeated violations of our community standards.\n\n**Appeal Process:**\nIf you believe this suspension was issued incorrectly, you can submit an appeal for review.\n\n**Appeal Portal:** [Submit Appeal](/appeal)\n\nDuring the suspension period, you will not be able to access most platform features.`;
    } else {
      notificationMessage = `⚠️ **Strike Issued**\n\n**Violation:** ${reportType}\n**Severity:** ${severity}\n**Current Strikes:** ${newStrikeCount}/3\n\nA strike has been added to your account for violating PeerFusion's community guidelines.\n\n**Consequences:**\n- ${newStrikeCount === 1 ? 'First warning - Please review our guidelines' : 
                        newStrikeCount === 2 ? 'Final warning - Next violation may result in suspension' : 
                        'Account suspension - Further violations may lead to permanent ban'}\n\n**Appeal Process:**\nIf you believe this strike was issued in error, you may appeal this decision.\n\n**Appeal Portal:** [Submit Appeal](/appeal)\n\nPlease ensure future interactions comply with our platform standards.`;
    }

    await connection.query(
      'INSERT INTO notifications (sender_id, receiver_id, message, type, created_at) VALUES (NULL, ?, ?, ?, NOW())',
      [reportedUserId, notificationMessage, 'penalty']
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

module.exports = router;