const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const adminCheckCache = new Map();

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
    
    // Check cache first
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
    
    // Cache the result for 5 minutes
    adminCheckCache.set(userId, {
      isAdmin,
      role: user.role,
      expires: Date.now() + 300000 // 5 minutes
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

// GET all regular users (excluding admins and moderators)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        up.user_id AS id,
        up.username,
        u.email,
        u.created_at,
        up.role AS role,
        up.rating,
        up.total_reviews,
        up.availability,
        up.avatar,
        u.status
      FROM user_profiles up
      INNER JOIN users u ON up.user_id = u.id
      WHERE u.role NOT IN ('admin', 'moderator')
        AND up.role IS NOT NULL
      ORDER BY u.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    
    res.json(rows);
  } catch (err) {
    handleError(res, err, 'Error fetching users');
  }
});

// GET all moderators
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

// CREATE moderator account
router.post('/moderators', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
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

    // Check if email already exists
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

// UPDATE moderator account details
router.put('/moderators/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const moderatorId = req.params.id;
    const { username, email, password } = req.body;

    // Validation
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

    // Check if email already exists (excluding current moderator)
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

      // Always update name and email
      updateFields.push('name = ?', 'email = ?');
      updateValues.push(username, email);

      // Update password only if provided
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

      // Log admin action
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

// RESET moderator password
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
    const temporaryPassword = Math.random().toString(36).slice(-10) + 'A1!'; // More secure temp password
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

    // Log admin action
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
const updateUserStatus = async (userId, status, action, req) => {
  return executeTransaction(async (connection) => {
    const [userResult] = await connection.query(
      'UPDATE users SET status = ? WHERE id = ? AND role != "admin"', 
      [status, userId]
    );

    if (userResult.affectedRows === 0) {
      throw new Error('User not found or cannot modify admin');
    }

    await connection.query(
      'UPDATE user_profiles SET status = ? WHERE user_id = ?', 
      [status, userId]
    );

    // Log admin action
    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, action, userId, JSON.stringify({ reason: `Admin ${status}` })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    return userResult;
  });
};

// SOFT DELETE user (deactivate)
router.patch('/users/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    await updateUserStatus(userId, 'inactive', 'USER_DEACTIVATED', req);
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (err) {
    handleError(res, err, 'Deactivate user error');
  }
});

// REACTIVATE user
router.patch('/users/:id/reactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    await updateUserStatus(userId, 'active', 'USER_REACTIVATED', req);
    
    res.json({
      success: true,
      message: 'User reactivated successfully'
    });

  } catch (err) {
    handleError(res, err, 'Reactivate user error');
  }
});

// UPDATE user role
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
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

// RESET user password
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
    const temporaryPassword = Math.random().toString(36).slice(-8);
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

    // Log admin action
    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [req.user.id, 'PASSWORD_RESET', userId, JSON.stringify({ 
          username: user.name || user.email,
          method: 'admin_reset' 
        })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword
    });
  } catch (err) {
    handleError(res, err, 'Reset password error');
  }
});

// UPDATE admin password
router.put('/change-password', authenticateToken, requireAdmin, async (req, res) => {
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

    // Clear admin cache for this user
    adminCheckCache.delete(adminId);

    // Log admin action
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

// GET admin logs
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

// GET all categories with their subjects
router.get('/subjects', authenticateToken, requireAdmin, async (req, res) => {
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
    
    // Group by category
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

// POST - Create new category
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

// POST - Create new subject
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
    
    // Verify category exists
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

// PUT - Update category
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

// DELETE - Delete category
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Check if category has subjects
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

// DELETE - Delete subject
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

// DELETE moderator account (HARD DELETE - permanently removed)
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

    // Log admin action
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

// DELETE user account (HARD DELETE - permanently removed)
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
      // Delete from user_profiles first (foreign key constraint)
      await connection.query(
        'DELETE FROM user_profiles WHERE user_id = ?',
        [userId]
      );

      // Then delete from users table
      const [userResult] = await connection.query(
        'DELETE FROM users WHERE id = ? AND role != "admin"',
        [userId]
      );

      if (userResult.affectedRows === 0) {
        throw new Error('User not found');
      }

      // Log admin action
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

// Reports management routes

// GET all reports with user details
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
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
        r.created_at,
        r.resolved_at,
        r.resolution_notes,
        resolver_profile.username as resolved_by_username
      FROM reports r
      LEFT JOIN user_profiles reporter_profile ON r.reporter_id = reporter_profile.user_id
      LEFT JOIN users reporter_user ON r.reporter_id = reporter_user.id
      LEFT JOIN user_profiles reported_profile ON r.reported_user_id = reported_profile.user_id
      LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
      LEFT JOIN user_profiles resolver_profile ON r.resolved_by = resolver_profile.user_id
      ORDER BY r.created_at DESC
    `;

    const [rows] = await pool.query(sql);
    
    res.json({
      success: true,
      reports: rows
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

// UPDATE report status
router.patch('/reports/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { status, resolution_notes } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // For pending -> resolved/dismissed, set resolved_by and resolved_at
    // For other status changes, just update the status
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
    
    const [result] = await pool.query(sql, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Log admin action
    try {
      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [adminId, 'REPORT_RESOLVED', null, JSON.stringify({ 
          report_id: reportId, 
          status: status,
          resolution_notes: resolution_notes 
        })]
      );
    } catch (logError) {
      console.warn('Could not log admin action:', logError);
    }

    res.json({
      success: true,
      message: `Report ${status} successfully`
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

// GET report statistics
router.get('/reports/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM reports 
      GROUP BY status
    `;

    const [rows] = await pool.query(sql);
    
    const stats = {
      total: 0,
      byStatus: {}
    };
    
    rows.forEach(row => {
      stats.total += row.count;
      stats.byStatus[row.status] = row.count;
    });
    
    // Get report type statistics
    const [typeRows] = await pool.query(`
      SELECT report_type, COUNT(*) as count 
      FROM reports 
      GROUP BY report_type
    `);
    
    stats.byType = {};
    typeRows.forEach(row => {
      stats.byType[row.report_type] = row.count;
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

// GET single report details
router.get('/reports/:id', authenticateToken, requireAdmin, async (req, res) => {
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

// GET all feedback with user details
router.get('/feedback', authenticateToken, requireAdmin, async (req, res) => {
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

// GET feedback for specific user
router.get('/feedback/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
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

// GET feedback statistics
router.get('/feedback/stats', authenticateToken, requireAdmin, async (req, res) => {
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

// GET unique users with their latest feedback for the main view
router.get('/feedback/unique-users', authenticateToken, requireAdmin, async (req, res) => {
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

// GET unique users with their recommended status
router.get('/feedback/unique-users-with-recommended', authenticateToken, requireAdmin, async (req, res) => {
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
    
    // Convert has_recommended from tinyint to boolean for consistent handling
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

module.exports = router;