const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const transporter = require('../config/mailer');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//-------------------------- Register --------------------------//
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email exists
    const checkEmailSql = 'SELECT email FROM users WHERE email = ?';
    const [existingUsers] = await db.query(checkEmailSql, [email]);

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    // Hash password and create user
    const hashed = await bcrypt.hash(password, 10);
    const insertSql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    
    const [result] = await db.query(insertSql, [name, email, hashed]);
    
    res.status(201).json({ message: 'Registered successfully', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration process failed', details: error.message });
  }
});

//-------------------------- Login --------------------------//
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Email and password are required' 
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing from environment variables');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error' 
    });
  }

  try {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const [users] = await db.query(sql, [email]);

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Check if user is suspended
    if (user.status === 'inactive') {
      console.log(`Login attempt for suspended user: ${email}`);
      return res.status(403).json({ 
        success: false,
        error: 'Your account has been suspended. Please contact support.' 
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role || 'user',
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Extended to 24 hours for better UX
    );

    console.log(`Successful login for user: ${email}`);
    
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role || 'user' 
      } 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//-------------------------- Google Login Route --------------------------//
router.post('/google-login', async (req, res) => {
  const { token: googleToken } = req.body;

  // Validate input
  if (!googleToken) {
    return res.status(400).json({ 
      success: false,
      error: 'Google token is required' 
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing from environment variables');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error' 
    });
  }

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { name, email, sub: googleId, picture } = ticket.getPayload();
    console.log(`Google login attempt for: ${email}`);

    // Check if user exists
    const findUserSql = 'SELECT * FROM users WHERE email = ?';
    const [users] = await db.query(findUserSql, [email]);

    if (users.length > 0) {
      // User exists - login
      const existingUser = users[0];
      
      // Check if user is suspended
      if (existingUser.status === 'inactive') {
        console.log(`Google login attempt for suspended user: ${email}`);
        return res.status(403).json({ 
          success: false,
          error: 'Your account has been suspended. Please contact support.' 
        });
      }
      
      // Update user with latest Google info if needed
      if (!existingUser.google_id) {
        await db.query(
          'UPDATE users SET google_id = ?, name = ? WHERE id = ?',
          [googleId, name, existingUser.id]
        );
      }
      
      // Generate app JWT token
      const appToken = jwt.sign(
        { 
          id: existingUser.id, 
          role: existingUser.role || 'user',
          email: existingUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log(`Successful Google login for user: ${email}`);
      
      return res.json({ 
        success: true,
        token: appToken, 
        user: { 
          id: existingUser.id, 
          name: existingUser.name, 
          email: existingUser.email,
          role: existingUser.role || 'user'
        }
      });
    }

    // User doesn't exist - create new user
    console.log(`Creating new user via Google login: ${email}`);
    
    const insertSql = 'INSERT INTO users (name, email, google_id, status, role) VALUES (?, ?, ?, ?, ?)';
    const [result] = await db.query(insertSql, [name, email, googleId, 'active', 'user']);
    
    const newUserId = result.insertId;
    
    // Generate app JWT token
    const appToken = jwt.sign(
      { 
        id: newUserId, 
        role: 'user',
        email: email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    console.log(`New user created via Google login: ${email}`);
    
    res.status(201).json({ 
      success: true,
      token: appToken, 
      user: { 
        id: newUserId, 
        name: name, 
        email: email,
        role: 'user'
      } 
    });

  } catch (error) {
    console.error('Google login error:', error);
    
    if (error.message.includes('Token used too late')) {
      return res.status(401).json({ 
        success: false,
        error: 'Google token has expired. Please try again.' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      error: 'Invalid Google token' 
    });
  }
});

//-------------------------- Forgot Password --------------------------//
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const findUserSql = 'SELECT * FROM users WHERE email = ?';
    const [users] = await db.query(findUserSql, [email]);

    if (users.length === 0) {
      // Return success even if user doesn't exist (security best practice)
      return res.status(200).json({ 
        message: 'If an account with that email exists, a reset link has been sent.' 
      });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenExpires = new Date(Date.now() + 3600000);

    // Update user with reset token
    const updateUserSql = 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?';
    await db.query(updateUserSql, [hashedToken, tokenExpires, user.id]);

    // Send email
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    const mailOptions = {
      from: '"PeerFusion" <onboarding@resend.dev>',
      to: user.email,
      subject: 'Your PeerFusion Password Reset Request',
      html: `<p>Hi,</p>
             <p>You requested to reset your password. Please click the link below to set a new one:</p>
             <a href="${resetLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
             <p>This link will expire in one hour.</p>
             <p>If you did not request this, please ignore this email.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ 
      message: 'If an account with that email exists, a reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset process.' });
  }
});

//-------------------------- Reset Password --------------------------//
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const findTokenSql = 'SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()';
    const [users] = await db.query(findTokenSql, [hashedToken]);

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Password reset link is invalid or has expired.' 
      });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    const updatePasswordSql = 'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?';
    await db.query(updatePasswordSql, [hashedPassword, user.id]);
    
    res.status(200).json({ 
      message: 'Your password has been updated successfully.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password.' });
  }
});

module.exports = router;