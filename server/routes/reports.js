// routes/reports.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// POST new report (for users)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { reported_user_id, report_type, description } = req.body;
    const reporter_id = req.user.id;

    if (!reported_user_id || !report_type) {
      return res.status(400).json({
        success: false,
        error: 'Reported user ID and report type are required'
      });
    }

    // Check if reported user exists
    const [userCheck] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [reported_user_id]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reported user not found'
      });
    }

    // Check if user is trying to report themselves
    if (parseInt(reporter_id) === parseInt(reported_user_id)) {
      return res.status(400).json({
        success: false,
        error: 'You cannot report yourself'
      });
    }

    const sql = `
      INSERT INTO reports (reporter_id, reported_user_id, report_type, description, status) 
      VALUES (?, ?, ?, ?, 'pending')
    `;
    
    const [result] = await pool.query(sql, [reporter_id, reported_user_id, report_type, description]);
    
    res.json({
      success: true,
      message: 'Report submitted successfully',
      report_id: result.insertId
    });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({
      success: false,
      error: 'Error submitting report',
      details: err.message
    });
  }
});

// GET user's own reports (optional - for users to see their reporting history)
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
        r.created_at,
        r.resolved_at
      FROM reports r
      LEFT JOIN user_profiles up ON r.reported_user_id = up.user_id
      WHERE r.reporter_id = ?
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await pool.query(sql, [userId]);
    
    res.json({
      success: true,
      reports: rows
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

module.exports = router;