const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const transporter = require('../config/mailer');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const temporaryRegistrations = new Map();

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanupExpiredRegistrations() {
  const now = Date.now();
  for (const [email, data] of temporaryRegistrations.entries()) {
    if (data.expiresAt < now) {
      temporaryRegistrations.delete(email);
    }
  }
}

setInterval(cleanupExpiredRegistrations, 5 * 60 * 1000);
//-------------------------- Register --------------------------//
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email exists in database (permanent users)
    const checkEmailSql = 'SELECT email FROM users WHERE email = ?';
    const [existingUsers] = await db.query(checkEmailSql, [email]);

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    // Check if there's a pending registration for this email
    if (temporaryRegistrations.has(email)) {
      const existingReg = temporaryRegistrations.get(email);
      if (existingReg.expiresAt > Date.now()) {
        // Remove existing temporary registration to create new one
        temporaryRegistrations.delete(email);
      }
    }

    // Generate verification code - 15 minutes
    const verificationCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in temporary registration (not in database yet)
    const tempRegistration = {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      verificationToken: hashedCode,
      verificationExpires: codeExpires,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes total
    };

    temporaryRegistrations.set(email, tempRegistration);

    // Send verification email
    const mailOptions = {
      from: '"PeerFusion" <noreply@peerfusionskillshare.com>',
      to: email,
      subject: 'Verify Your Email - PeerFusion',
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .header { text-align: center; padding: 30px 0; background-color: #0d130d; }
          .content { padding: 30px; font-size: 16px; }
          .code { background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .code-text { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130d; }
          .footer { background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;">
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #0ea050; text-align:center;">Verify Your Email Address</h2>
            <p>Hello ${name},</p>
            <p>Welcome to PeerFusion! To complete your registration and start learning with our community, please verify your email address using the code below:</p>
            <div class="center">
              <div class="code">
                <span class="code-text">${verificationCode}</span>
              </div>
            </div>
            <p class="center" style="color: #666; font-size: 14px;">
              This code will expire in <strong>15 minutes</strong>.
            </p>
            <p>If you didn't create an account with PeerFusion, please ignore this email.</p>
            <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
          </div>
          <div class="footer">
            &copy; 2025 PeerFusion. All rights reserved.
          </div>
        </div>
      </body>
      </html>`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      email: email,
      tempRegistration: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration process failed', details: error.message });
  }
});
//-------------------------- Verify Email --------------------------//
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  try {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // Check temporary registrations first
    if (temporaryRegistrations.has(email)) {
      const tempReg = temporaryRegistrations.get(email);
      
      // Check if verification code matches and is not expired
      if (tempReg.verificationToken === hashedCode && new Date(tempReg.verificationExpires) > new Date()) {
        
        // Create permanent user in database
        const insertSql = 'INSERT INTO users (name, email, password, is_verified, status, role, created_at) VALUES (?, ?, ?, true, "active", "user", NOW())';
        const [result] = await db.query(insertSql, [tempReg.name, tempReg.email, tempReg.password]);
        
        // Remove from temporary storage
        temporaryRegistrations.delete(email);
        
        return res.status(200).json({ 
          success: true,
          message: 'Email verified successfully! You can now login to your account.',
          userId: result.insertId
        });
      } else {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid or expired verification code.' 
        });
      }
    }

    // Fallback: Check database for existing users (for backward compatibility)
    const findUserSql = 'SELECT * FROM users WHERE email = ? AND verification_token = ? AND verification_expires > NOW()';
    const [users] = await db.query(findUserSql, [email, hashedCode]);

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired verification code.' 
      });
    }

    const user = users[0];

    // Mark user as verified and clear verification token
    await db.query(
      'UPDATE users SET is_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    res.status(200).json({ 
      success: true,
      message: 'Email verified successfully! You can now login to your account.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Email verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//-------------------------- Resend Verification Code --------------------------//
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  try {
    // Check temporary registrations first
    if (temporaryRegistrations.has(email)) {
      const tempReg = temporaryRegistrations.get(email);
      
      // Generate new verification code
      const verificationCode = generateSixDigitCode();
      const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
      const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

      // Update temporary registration
      tempReg.verificationToken = hashedCode;
      tempReg.verificationExpires = codeExpires;
      temporaryRegistrations.set(email, tempReg);

      // Send new verification email
      const mailOptions = {
        from: '"PeerFusion" <verify@peerfusionskillshare.com>',
        to: email,
        subject: 'New Verification Code - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Verification Code</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            .header { text-align: center; padding: 30px 0; background-color: #0d130d; }
            .content { padding: 30px; font-size: 16px; }
            .code { background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0; }
            .code-text { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130d; }
            .footer { background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;">
            </div>
            <div class="content">
              <h2 style="margin-top: 0; color: #0ea050; text-align:center;">New Verification Code</h2>
              <p>Hello ${tempReg.name},</p>
              <p>Here is your new verification code for PeerFusion:</p>
              <div class="center">
                <div class="code">
                  <span class="code-text">${verificationCode}</span>
                </div>
              </div>
              <p class="center" style="color: #666; font-size: 14px;">
                This code will expire in <strong>15 minutes</strong>.
              </p>
              <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
            </div>
            <div class="footer">
              &copy; 2025 PeerFusion. All rights reserved.
            </div>
          </div>
        </body>
        </html>`
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ 
        success: true,
        message: 'New verification code sent to your email.'
      });
    }

    // Fallback for existing database users
    const findUserSql = 'SELECT * FROM users WHERE email = ? AND is_verified = false';
    const [users] = await db.query(findUserSql, [email]);

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User not found or already verified.' 
      });
    }

    const user = users[0];
    
    // Generate new verification code - 15 minutes
    const verificationCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Update verification token in database
    await db.query(
      'UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?',
      [hashedCode, codeExpires, user.id]
    );

    // Send verification email
    const mailOptions = {
      from: '"PeerFusion" <verify@peerfusionskillshare.com>',
      to: email,
      subject: 'New Verification Code - PeerFusion',
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .header { text-align: center; padding: 30px 0; background-color: #0d130d; }
          .content { padding: 30px; font-size: 16px; }
          .code { background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .code-text { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130d; }
          .footer { background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;">
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #0ea050; text-align:center;">New Verification Code</h2>
            <p>Hello ${user.name},</p>
            <p>Here is your new verification code for PeerFusion:</p>
            <div class="center">
              <div class="code">
                <span class="code-text">${verificationCode}</span>
              </div>
            </div>
            <p class="center" style="color: #666; font-size: 14px;">
              This code will expire in <strong>15 minutes</strong>.
            </p>
            <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
          </div>
          <div class="footer">
            &copy; 2025 PeerFusion. All rights reserved.
          </div>
        </div>
      </body>
      </html>`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true,
      message: 'New verification code sent to your email.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to resend verification code'
    });
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

    // Check user status with comprehensive handling
    if (user.status === 'suspended') {
      // Check if suspension period has ended
      if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
        const timeLeft = Math.ceil((new Date(user.suspended_until) - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          success: false,
          error: `Your account has been suspended. It will be reactivated in ${timeLeft} days.`,
          status: 'suspended',
          suspended_until: user.suspended_until,
          timeLeft: timeLeft,
          strike_count: user.strike_count || 0
        });
      } else {
        // Auto-reactivate if suspension period has passed
        console.log('Auto-reactivating user:', user.id);
        await db.query(
          'UPDATE users SET status = "active", suspended_until = NULL WHERE id = ?',
          [user.id]
        );
        user.status = 'active';
      }
    } else if (user.status === 'banned') {
      console.log(`Login attempt for banned user: ${email}`);
      return res.status(403).json({ 
        success: false,
        error: 'Your account has been permanently banned. Please contact support.',
        status: 'banned',
        strike_count: user.strike_count || 0
      });
    } else if (user.status === 'deletion_pending') {
      // Check if deletion period has passed
      if (user.scheduled_for_deletion_at && new Date(user.scheduled_for_deletion_at) <= new Date()) {
        console.log('User deletion period has passed, account should be deleted:', user.id);
        return res.status(403).json({ 
          success: false,
          error: 'Your account has been permanently deleted. Please contact support if you believe this is an error.',
          status: 'deleted'
        });
      } else {
        // Allow users pending deletion to login so they can cancel deletion
        console.log('User is pending deletion but can login to cancel:', user.id);
        // Continue with login - user can access platform to cancel deletion
      }
    } else if (user.status === 'deactivated') {
      // Allow deactivated users to login so they can reactivate
      console.log('User is deactivated but can login to reactivate:', user.id);
      // Continue with login - user can access platform to reactivate
    } else if (user.status === 'warning') {
      // User can still login but has warnings
      console.log(`Login for user with warning status: ${email}, strike count: ${user.strike_count}`);
    } else if (user.status === 'active') {
      console.log('User is active and can proceed:', user.id);
      // Normal active user, no special handling needed
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
        email: user.email,
        status: user.status
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`Successful login for user: ${email}, status: ${user.status}`);
    
    // Return comprehensive user data including all status information
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role || 'user',
        status: user.status,
        strike_count: user.strike_count || 0,
        suspended_until: user.suspended_until,
        deactivation_requested_at: user.deactivation_requested_at,
        deletion_scheduled_at: user.deletion_scheduled_at,
        scheduled_for_deletion_at: user.scheduled_for_deletion_at
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
      
      // Check user status with comprehensive handling
      if (existingUser.status === 'suspended') {
        if (existingUser.suspended_until && new Date(existingUser.suspended_until) > new Date()) {
          const timeLeft = Math.ceil((new Date(existingUser.suspended_until) - new Date()) / (1000 * 60 * 60 * 24));
          return res.status(403).json({ 
            success: false,
            error: `Your account has been suspended. It will be reactivated in ${timeLeft} days.`,
            status: 'suspended',
            suspended_until: existingUser.suspended_until,
            timeLeft: timeLeft,
            strike_count: existingUser.strike_count || 0
          });
        } else {
          // Auto-reactivate if suspension period has passed
          await db.query(
            'UPDATE users SET status = "active", suspended_until = NULL WHERE id = ?',
            [existingUser.id]
          );
          existingUser.status = 'active';
        }
      } else if (existingUser.status === 'banned') {
        console.log(`Google login attempt for banned user: ${email}`);
        return res.status(403).json({ 
          success: false,
          error: 'Your account has been permanently banned. Please contact support.',
          status: 'banned',
          strike_count: existingUser.strike_count || 0
        });
      } else if (existingUser.status === 'deletion_pending') {
        // Check if deletion period has passed
        if (existingUser.scheduled_for_deletion_at && new Date(existingUser.scheduled_for_deletion_at) <= new Date()) {
          console.log('User deletion period has passed, account should be deleted:', existingUser.id);
          return res.status(403).json({ 
            success: false,
            error: 'Your account has been permanently deleted. Please contact support if you believe this is an error.',
            status: 'deleted'
          });
        } else {
          // Allow users pending deletion to login so they can cancel deletion
          console.log('User is pending deletion but can login to cancel:', existingUser.id);
          // Continue with login - user can access platform to cancel deletion
        }
      } else if (existingUser.status === 'deactivated') {
        // Allow deactivated users to login so they can reactivate
        console.log('User is deactivated but can login to reactivate:', existingUser.id);
        // Continue with login - user can access platform to reactivate
      } else if (existingUser.status === 'warning') {
        // User can still login but has warnings
        console.log(`Google login for user with warning status: ${email}, strike count: ${existingUser.strike_count}`);
      } else if (existingUser.status === 'active') {
        console.log('User is active and can proceed:', existingUser.id);
        // Normal active user, no special handling needed
      }
      
      // Update user with latest Google info if needed
      if (!existingUser.google_id) {
        await db.query(
          'UPDATE users SET google_id = ?, name = ? WHERE id = ?',
          [googleId, name, existingUser.id]
        );
        existingUser.name = name; // Update local object for response
      }
      
      // Generate app JWT token
      const appToken = jwt.sign(
        { 
          id: existingUser.id, 
          role: existingUser.role || 'user',
          email: existingUser.email,
          status: existingUser.status
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log(`Successful Google login for user: ${email}, status: ${existingUser.status}`);
      
      return res.json({ 
        success: true,
        token: appToken, 
        user: { 
          id: existingUser.id, 
          name: existingUser.name, 
          email: existingUser.email,
          role: existingUser.role || 'user',
          status: existingUser.status,
          strike_count: existingUser.strike_count || 0,
          suspended_until: existingUser.suspended_until,
          deactivation_requested_at: existingUser.deactivation_requested_at,
          deletion_scheduled_at: existingUser.deletion_scheduled_at,
          scheduled_for_deletion_at: existingUser.scheduled_for_deletion_at
        }
      });
    }

    // User doesn't exist - create new user
    console.log(`Creating new user via Google login: ${email}`);
    
    const insertSql = 'INSERT INTO users (name, email, google_id, status, role) VALUES (?, ?, ?, "active", "user")';
    const [result] = await db.query(insertSql, [name, email, googleId]);
    
    const newUserId = result.insertId;
    
    // Generate app JWT token
    const appToken = jwt.sign(
      { 
        id: newUserId, 
        role: 'user',
        email: email,
        status: 'active'
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
        role: 'user',
        status: 'active',
        strike_count: 0,
        suspended_until: null,
        deactivation_requested_at: null,
        deletion_scheduled_at: null,
        scheduled_for_deletion_at: null
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

  if (!email || !email.includes('@')) {
    return res.status(400).json({ 
      message: 'Please provide a valid email address.' 
    });
  }

  try {
    const findUserSql = 'SELECT * FROM users WHERE email = ?';
    const [users] = await db.query(findUserSql, [email]);

    const responseMessage = 'If an account with that email exists, a reset link has been sent.';

    if (users.length === 0) {
      return res.status(200).json({ 
        message: responseMessage 
      });
    }

    const user = users[0];
    
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    const updateUserSql = 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?';
    await db.query(updateUserSql, [hashedToken, tokenExpires, user.id]);

    const resetLink = `${process.env.FRONTEND_ORIGIN}/reset-password/${token}`;

    // Send password reset email - UPDATED DESIGN
    const mailOptions = {
      from: '"PeerFusion" <noreply@peerfusionskillshare.com>',
      to: user.email,
      subject: 'Reset Your Password - PeerFusion',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .header { text-align: center; padding: 30px 0; background-color: #0d130d; }
          .content { padding: 30px; font-size: 16px; }
          .footer { background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777; }
          .center { text-align: center; }
          .button { background-color: #0ea050; color: #ffffff; padding: 12px 20px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;">
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #0ea050; text-align:center;">Reset Your Password</h2>
            <p>Hello ${user.name || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to create a new one:</p>
            <div class="center" style="margin: 30px 0;">
              <a href="${resetLink}" class="button">
                Reset Password
              </a>
            </div>
            <p>This link will expire in <strong>15 minutes</strong>.</p>
            <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Team</strong></p>
          </div>
          <div class="footer">
            &copy; 2025 PeerFusion. All rights reserved.
          </div>
        </div>
      </body>
      </html>`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: responseMessage 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset process.' 
    });
  }
});

//-------------------------- Reset Password --------------------------//
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    if (!token) {
      return res.status(400).json({ 
        message: 'Invalid reset token.' 
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const findTokenSql = 'SELECT * FROM users WHERE resetPasswordToken = ?';
    const [users] = await db.query(findTokenSql, [hashedToken]);
    
    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Password reset link is invalid or has already been used.' 
      });
    }

    const user = users[0];
    
    if (!user.resetPasswordExpires) {
      return res.status(400).json({ 
        message: 'Password reset link is invalid.' 
      });
    }

    const now = new Date();
    const expires = new Date(user.resetPasswordExpires);
    
    if (expires < now) {
      await db.query(
        'UPDATE users SET resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?',
        [user.id]
      );
      return res.status(400).json({ 
        message: 'Password reset link has expired. Please request a new one.' 
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long.' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatePasswordSql = 'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?';
    await db.query(updatePasswordSql, [hashedPassword, user.id]);
    
    res.status(200).json({ 
      message: 'Your password has been updated successfully.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Error resetting password.'
    });
  }
});

// -------------------------- Admin/Moderator Forgot Password -------------------------- //
router.post('/admin-forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email exists and user is admin/moderator
    const findUserSql = 'SELECT * FROM users WHERE email = ? AND role IN ("admin", "moderator")';
    const [users] = await db.query(findUserSql, [email]);

    // Always return the same message for security
    const responseMessage = 'If an admin/moderator account with that email exists, a reset code has been sent.';

    if (users.length === 0) {
      console.log('Admin forgot password: No admin/moderator found with email:', email);
      return res.status(200).json({ 
        message: responseMessage 
      });
    }

    const user = users[0];
    const resetCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log(`Admin reset code for ${user.email}: ${resetCode}, expires: ${codeExpires}`);

    // Store the hashed reset code and expiration
    const updateUserSql = 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?';
    await db.query(updateUserSql, [hashedCode, codeExpires, user.id]);

    // Send email with reset code using Resend - UPDATED DESIGN
    try {
      const mailOptions = {
        from: '"PeerFusion Admin" <noreply@peerfusionskillshare.com>',
        to: user.email,
        subject: 'Admin Password Reset Code - PeerFusion',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            .header { text-align: center; padding: 30px 0; background-color: #0d130d; }
            .content { padding: 30px; font-size: 16px; }
            .code { background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0; }
            .code-text { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130d; }
            .footer { background: #f0f0f0; text-align: center; padding: 15px; font-size: 13px; color: #777; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://i.imghippo.com/files/nfyb3992ADQ.png" alt="PeerFusion Logo" width="140" style="display:block; margin: 0 auto;">
            </div>
            <div class="content">
              <h2 style="margin-top: 0; color: #0ea050; text-align:center;">Admin Password Reset</h2>
              <p>Hello ${user.name || user.email},</p>
              <p>You requested to reset your password. Use the following 6-digit verification code:</p>
              <div class="center">
                <div class="code">
                  <span class="code-text">${resetCode}</span>
                </div>
              </div>
              <p class="center" style="color: #666; font-size: 14px;">
                This code will expire in <strong>15 minutes</strong>.
              </p>
              <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
              <p style="margin-top: 30px;">Thank you,<br><strong>PeerFusion Admin Team</strong></p>
            </div>
            <div class="footer">
              &copy; 2025 PeerFusion. All rights reserved.
            </div>
          </div>
        </body>
        </html>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`Admin reset code email sent successfully to: ${user.email}`);

    } catch (emailError) {
      console.error('Failed to send admin reset email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(200).json({ 
      message: responseMessage,
      email: email // Return email for frontend to use in next step
    });

  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset process.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// -------------------------- Verify Reset Code -------------------------- //
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const findUserSql = 'SELECT * FROM users WHERE email = ? AND resetPasswordToken = ? AND role IN ("admin", "moderator")';
    const [users] = await db.query(findUserSql, [email, hashedCode]);

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset code.' 
      });
    }

    const user = users[0];
    
    const now = new Date();
    const expires = new Date(user.resetPasswordExpires);
    
    if (expires < now) {
      return res.status(400).json({ 
        message: 'Reset code has expired. Please request a new one.' 
      });
    }

    const tempToken = crypto.randomBytes(32).toString('hex');
    const hashedTempToken = crypto.createHash('sha256').update(tempToken).digest('hex');
    
    const newExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await db.query(
      'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?',
      [hashedTempToken, newExpiry, user.id]
    );

    res.status(200).json({ 
      message: 'Code verified successfully.',
      tempToken: tempToken,
      email: email
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Error verifying reset code.' });
  }
});

// -------------------------- Reset Password with Token -------------------------- //
router.post('/admin-reset-password', async (req, res) => {
  const { tempToken, password, email } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(tempToken).digest('hex');

    const findUserSql = 'SELECT * FROM users WHERE email = ? AND resetPasswordToken = ? AND role IN ("admin", "moderator")';
    const [users] = await db.query(findUserSql, [email, hashedToken]);

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token.' 
      });
    }

    const user = users[0];
    
    const now = new Date();
    const expires = new Date(user.resetPasswordExpires);
    
    if (expires < now) {
      return res.status(400).json({ 
        message: 'Reset session has expired. Please start over.' 
      });
    }
    
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long.' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatePasswordSql = 'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?';
    await db.query(updatePasswordSql, [hashedPassword, user.id]);
    
    res.status(200).json({ 
      message: 'Password has been reset successfully.' 
    });

  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ message: 'Error resetting password.' });
  }
});

module.exports = router;