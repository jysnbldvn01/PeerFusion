const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const evidenceDir = path.join(__dirname, '../uploads/evidence');
    
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    
    cb(null, evidenceDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, 'evidence_' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Please upload images, PDFs, or documents.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  }
});

// POST - Create support ticket (public route - no auth required)
router.post('/tickets', upload.array('evidence', 5), async (req, res) => {
  let connection;
  try {
    const { name, email, subject, category, message } = req.body;
    const files = req.files || [];

    // Validation
    if (!name || !email || !subject || !category || !message) {
      files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(400).json({ 
        success: false,
        error: 'Please enter a valid email address' 
      });
    }

    connection = await pool.getConnection();

    // Prepare evidence data
    let evidenceData = null;
    if (files.length > 0) {
      evidenceData = files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `/uploads/evidence/${file.filename}`,
        url: `/api/support/evidence/${file.filename}`
      }));
    }

    // Insert support ticket
    const [result] = await connection.execute(
      'INSERT INTO support_tickets (name, email, subject, category, message, evidence, status) VALUES (?, ?, ?, ?, ?, ?, "open")',
      [name, email, subject, category, message, evidenceData ? JSON.stringify(evidenceData) : null]
    );

    // Log the support ticket creation
    try {
      await connection.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (NULL, ?, NULL, ?, NOW())',
        ['SUPPORT_TICKET_CREATED', JSON.stringify({
          ticket_id: result.insertId,
          name: name,
          email: email,
          subject: subject,
          category: category,
          has_evidence: files.length > 0,
          file_count: files.length
        })]
      );
    } catch (logError) {
      console.warn('Could not log support ticket creation:', logError);
    }

    res.status(201).json({ 
      success: true,
      message: 'Support ticket created successfully',
      ticketId: result.insertId,
      filesUploaded: files.length
    });

  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    console.error('Support ticket creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET - Serve evidence files (public route)
router.get('/evidence/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    const evidencePath = path.join(__dirname, '../uploads/evidence', filename);
    
    if (!fs.existsSync(evidencePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const stats = fs.statSync(evidencePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file'
      });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    if (mimeType.startsWith('image/')) {
      res.sendFile(evidencePath);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.sendFile(evidencePath);
    }

  } catch (error) {
    console.error('Error serving evidence file:', error);
    res.status(500).json({
      success: false,
      error: 'Error serving file',
      details: error.message
    });
  }
});

// GET - Get all support tickets 
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching tickets with params:', { status, page, limit, offset, search });

    let whereConditions = [];
    let queryParams = [];
    let countParams = [];

    if (status && status !== 'all') {
      whereConditions.push('st.status = ?');
      queryParams.push(status);
      countParams.push(status);
    }

    if (search && search.trim() !== '') {
      whereConditions.push('(st.subject LIKE ? OR st.message LIKE ? OR st.name LIKE ? OR st.email LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? 
      ' WHERE ' + whereConditions.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM support_tickets st ${whereClause}`;
    console.log('Count Query:', countQuery, countParams);
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    const dataQuery = `
      SELECT 
        st.id,
        st.name,
        st.email,
        st.subject,
        st.category,
        st.message,
        st.evidence,
        st.status,
        st.created_at,
        st.updated_at,
        (SELECT COUNT(*) FROM support_responses sr WHERE sr.ticket_id = st.id) as response_count
      FROM support_tickets st
      ${whereClause}
      ORDER BY 
        CASE st.status 
          WHEN 'open' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'resolved' THEN 3
          ELSE 4
        END,
        st.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    console.log('Data Query:', dataQuery, queryParams);
    
    const [tickets] = whereConditions.length > 0 
      ? await pool.execute(dataQuery, queryParams)
      : await pool.execute(dataQuery);

    console.log('Tickets found:', tickets.length);

    const ticketsWithEvidence = tickets.map(ticket => {
      let evidence = null;
      if (ticket.evidence) {
        try {
          evidence = typeof ticket.evidence === 'string' ? 
            JSON.parse(ticket.evidence) : ticket.evidence;
        } catch (error) {
          console.error('Error parsing evidence for ticket:', ticket.id, error);
          evidence = null;
        }
      }
      
      return {
        ...ticket,
        evidence: evidence
      };
    });

    res.json({
      success: true,
      tickets: ticketsWithEvidence,
      total: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching support tickets',
      details: error.message
    });
  }
});


// GET - Get single support ticket with responses
router.get('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;

    // Get ticket details
    const [tickets] = await pool.execute(
      `SELECT 
        st.id,
        st.name,
        st.email,
        st.subject,
        st.category,
        st.message,
        st.evidence,
        st.status,
        st.assigned_to,
        st.created_at,
        st.updated_at
       FROM support_tickets st
       WHERE st.id = ?`,
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Get responses with admin names
    const [responses] = await pool.execute(
      `SELECT 
        sr.id,
        sr.message,
        sr.created_at,
        sr.admin_id,
        u.name as admin_name,
        u.role as admin_role
       FROM support_responses sr
       LEFT JOIN users u ON sr.admin_id = u.id
       WHERE sr.ticket_id = ?
       ORDER BY sr.created_at ASC`,
      [ticketId]
    );

    // Parse evidence
    const ticket = tickets[0];
    let evidence = null;
    let evidence_urls = [];
    
    if (ticket.evidence) {
      try {
        evidence = typeof ticket.evidence === 'string' ? 
          JSON.parse(ticket.evidence) : ticket.evidence;
          
        if (evidence && Array.isArray(evidence)) {
          evidence_urls = evidence.map(file => ({
            ...file,
            url: `/api/support/evidence/${file.filename}`,
            previewUrl: file.mimetype?.startsWith('image/') ? 
              `/api/support/evidence/${file.filename}` : null
          }));
        }
      } catch (error) {
        console.error('Error parsing evidence for ticket:', ticket.id, error);
        evidence = null;
      }
    }

    res.json({
      success: true,
      ticket: {
        ...ticket,
        evidence: evidence,
        evidence_urls: evidence_urls,
        responses: responses || []
      }
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching support ticket',
      details: error.message 
    });
  }
});

// POST - Add response to support ticket
router.post('/tickets/:id/responses', authenticateToken, async (req, res) => {
  let connection;
  try {
    const ticketId = req.params.id;
    const { message } = req.body;
    const adminId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if ticket exists
    const [tickets] = await connection.execute(
      'SELECT id, status FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Get admin info
    const [admins] = await connection.execute(
      'SELECT name, role FROM users WHERE id = ?',
      [adminId]
    );

    const adminName = admins.length > 0 ? admins[0].name : 'Support Team';
    const adminRole = admins.length > 0 ? admins[0].role : 'admin';

    // Add response
    const [result] = await connection.execute(
      'INSERT INTO support_responses (ticket_id, admin_id, message, is_internal) VALUES (?, ?, ?, FALSE)',
      [ticketId, adminId, message.trim()]
    );

    // Update ticket status to in_progress if it was open
    if (tickets[0].status === 'open') {
      await connection.execute(
        'UPDATE support_tickets SET status = "in_progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [ticketId]
      );
    } else {
      // Still update the timestamp to show activity
      await connection.execute(
        'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [ticketId]
      );
    }

    // Log the response
    try {
      await connection.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, NULL, ?, NOW())',
        [adminId, 'SUPPORT_RESPONSE_ADDED', JSON.stringify({
          ticket_id: ticketId,
          response_id: result.insertId
        })]
      );
    } catch (logError) {
      console.warn('Could not log support response:', logError);
    }

    await connection.commit();

    // Return the complete response data
    res.json({
      success: true,
      message: 'Response added successfully',
      response: {
        id: result.insertId,
        message: message.trim(),
        admin_name: adminName,
        admin_role: adminRole,
        admin_id: adminId,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error adding support response:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error adding response',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// PATCH - Update ticket status
router.patch('/tickets/:id/status', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const [result] = await pool.execute(
      'UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Log the status change
    try {
      await pool.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, NULL, ?, NOW())',
        [adminId, 'SUPPORT_TICKET_STATUS_CHANGED', JSON.stringify({
          ticket_id: ticketId,
          new_status: status
        })]
      );
    } catch (logError) {
      console.warn('Could not log status change:', logError);
    }

    res.json({
      success: true,
      message: `Ticket status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error updating ticket status',
      details: error.message 
    });
  }
});

// PATCH - Assign ticket to current admin
router.patch('/tickets/:id/assign-to-me', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const adminId = req.user.id;

    const [result] = await pool.execute(
      'UPDATE support_tickets SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [adminId, ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Log the assignment
    try {
      await pool.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, NULL, ?, NOW())',
        [adminId, 'SUPPORT_TICKET_ASSIGNED', JSON.stringify({
          ticket_id: ticketId
        })]
      );
    } catch (logError) {
      console.warn('Could not log ticket assignment:', logError);
    }

    res.json({
      success: true,
      message: 'Ticket assigned to you successfully'
    });

  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error assigning ticket',
      details: error.message 
    });
  }
});

// PATCH - Unassign ticket
router.patch('/tickets/:id/unassign', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE support_tickets SET assigned_to = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket unassigned successfully'
    });

  } catch (error) {
    console.error('Error unassigning ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error unassigning ticket',
      details: error.message 
    });
  }
});

// GET - Support statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [statusStats] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM support_tickets 
      GROUP BY status
    `);

    const [recentActivity] = await pool.execute(`
      SELECT 
        COUNT(*) as tickets_today
      FROM support_tickets 
      WHERE DATE(created_at) = CURDATE()
    `);

    const [categoryStats] = await pool.execute(`
      SELECT 
        category,
        COUNT(*) as count
      FROM support_tickets 
      GROUP BY category
      ORDER BY count DESC
    `);

    const stats = {
      byStatus: {},
      recentActivity: recentActivity[0],
      byCategory: categoryStats
    };

    // Organize by status
    statusStats.forEach(stat => {
      stats.byStatus[stat.status] = stat.count;
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching support statistics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching statistics',
      details: error.message 
    });
  }
});

// DELETE - Delete support ticket
router.delete('/tickets/:id', authenticateToken, async (req, res) => {
  let connection;
  try {
    const ticketId = req.params.id;
    const adminId = req.user.id;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get ticket evidence first to delete files
    const [tickets] = await connection.execute(
      'SELECT evidence FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Delete evidence files
    const ticket = tickets[0];
    if (ticket.evidence) {
      try {
        const evidence = typeof ticket.evidence === 'string' ? 
          JSON.parse(ticket.evidence) : ticket.evidence;
          
        if (evidence && Array.isArray(evidence)) {
          evidence.forEach(file => {
            const filePath = path.join(__dirname, '../uploads/evidence', file.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        }
      } catch (error) {
        console.error('Error deleting evidence files:', error);
      }
    }

    // Delete responses first (foreign key constraint)
    await connection.execute(
      'DELETE FROM support_responses WHERE ticket_id = ?',
      [ticketId]
    );

    // Delete ticket
    const [result] = await connection.execute(
      'DELETE FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Log the deletion
    try {
      await connection.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, NULL, ?, NOW())',
        [adminId, 'SUPPORT_TICKET_DELETED', JSON.stringify({
          ticket_id: ticketId
        })]
      );
    } catch (logError) {
      console.warn('Could not log ticket deletion:', logError);
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Support ticket deleted successfully'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting support ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting support ticket',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// DELETE - Delete support ticket
router.delete('/tickets/:id', authenticateToken, async (req, res) => {
  let connection;
  try {
    const ticketId = req.params.id;
    const adminId = req.user.id;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get ticket evidence first to delete files
    const [tickets] = await connection.execute(
      'SELECT evidence FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (tickets.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Delete evidence files
    const ticket = tickets[0];
    if (ticket.evidence) {
      try {
        const evidence = typeof ticket.evidence === 'string' ? 
          JSON.parse(ticket.evidence) : ticket.evidence;
          
        if (evidence && Array.isArray(evidence)) {
          evidence.forEach(file => {
            const filePath = path.join(__dirname, '../uploads/evidence', file.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted evidence file: ${filePath}`);
            }
          });
        }
      } catch (error) {
        console.error('Error deleting evidence files:', error);
        // Continue with deletion even if file deletion fails
      }
    }

    // Delete responses first (foreign key constraint)
    await connection.execute(
      'DELETE FROM support_responses WHERE ticket_id = ?',
      [ticketId]
    );

    // Delete ticket
    const [result] = await connection.execute(
      'DELETE FROM support_tickets WHERE id = ?',
      [ticketId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Log the deletion
    try {
      await connection.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, NULL, ?, NOW())',
        [adminId, 'SUPPORT_TICKET_DELETED', JSON.stringify({
          ticket_id: ticketId
        })]
      );
    } catch (logError) {
      console.warn('Could not log ticket deletion:', logError);
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Support ticket deleted successfully'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting support ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting support ticket',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// DELETE - Delete multiple tickets (bulk delete)
router.delete('/tickets', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { ticketIds } = req.body;
    const adminId = req.user.id;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Ticket IDs are required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get all tickets with evidence first
    const [tickets] = await connection.execute(
      'SELECT id, evidence FROM support_tickets WHERE id IN (?)',
      [ticketIds]
    );

    // Delete evidence files for all tickets
    for (const ticket of tickets) {
      if (ticket.evidence) {
        try {
          const evidence = typeof ticket.evidence === 'string' ? 
            JSON.parse(ticket.evidence) : ticket.evidence;
            
          if (evidence && Array.isArray(evidence)) {
            evidence.forEach(file => {
              const filePath = path.join(__dirname, '../uploads/evidence', file.filename);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted evidence file: ${filePath}`);
              }
            });
          }
        } catch (error) {
          console.error(`Error deleting evidence files for ticket ${ticket.id}:`, error);
        }
      }
    }

    // Delete responses first
    await connection.execute(
      'DELETE FROM support_responses WHERE ticket_id IN (?)',
      [ticketIds]
    );

    // Delete tickets
    const [result] = await connection.execute(
      'DELETE FROM support_tickets WHERE id IN (?)',
      [ticketIds]
    );

    // Log the bulk deletion
    try {
      await connection.execute(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, NULL, ?, NOW())',
        [adminId, 'SUPPORT_TICKETS_BULK_DELETED', JSON.stringify({
          ticket_ids: ticketIds,
          deleted_count: result.affectedRows
        })]
      );
    } catch (logError) {
      console.warn('Could not log bulk ticket deletion:', logError);
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} ticket(s)`,
      deletedCount: result.affectedRows
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting support tickets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting support tickets',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;