const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const transporter = require('../config/mailer');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    
    // Generate verification code
    const verificationCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const codeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with verification token (not verified yet)
    const insertSql = 'INSERT INTO users (name, email, password, verification_token, verification_expires, is_verified, status) VALUES (?, ?, ?, ?, ?, false, "active")';
    
    const [result] = await db.query(insertSql, [name, email, hashed, hashedCode, codeExpires]);
    
    // Send verification email
    const mailOptions = {
      from: '"PeerFusion" <onboarding@resend.dev>',
      to: email,
      subject: 'Verify Your Email - PeerFusion',
      html: `
      <!DOCTYPE html>
      <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
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
              <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Verify Your Email Address</h2>
              <p>Hello ${name},</p>
              <p>Welcome to PeerFusion! To complete your registration and start learning with our community, please verify your email address using the code below:</p>
              <div style="text-align:center; margin: 30px 0;">
                <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130dff;">${verificationCode}</span>
                </div>
              </div>
              <p style="text-align: center; color: #666; font-size: 14px;">
                This code will expire in <strong>24 hours</strong>.
              </p>
              <p>If you didn't create an account with PeerFusion, please ignore this email.</p>
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

    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      userId: result.insertId,
      email: email
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

    // Find user with valid verification code
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
    // Check if user exists and is not verified
    const findUserSql = 'SELECT * FROM users WHERE email = ? AND is_verified = false';
    const [users] = await db.query(findUserSql, [email]);

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User not found or already verified.' 
      });
    }

    const user = users[0];
    
    // Generate new verification code
    const verificationCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const codeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update verification token
    await db.query(
      'UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?',
      [hashedCode, codeExpires, user.id]
    );

    // Send verification email
    const mailOptions = {
      from: '"PeerFusion" <onboarding@resend.dev>',
      to: email,
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
              <p>Hello ${user.name},</p>
              <p>Here is your new verification code for PeerFusion:</p>
              <div style="text-align:center; margin: 30px 0;">
                <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130dff;">${verificationCode}</span>
                </div>
              </div>
              <p style="text-align: center; color: #666; font-size: 14px;">
                This code will expire in <strong>24 hours</strong>.
              </p>
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

  try {
    const findUserSql = 'SELECT * FROM users WHERE email = ?';
    const [users] = await db.query(findUserSql, [email]);

    if (users.length === 0) {
      return res.status(200).json({ 
        message: 'If an account with that email exists, a reset link has been sent.' 
      });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const updateUserSql = 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?';
    await db.query(updateUserSql, [hashedToken, tokenExpires, user.id]);

    const resetLink = `${process.env.FRONTEND_ORIGIN}/reset-password/${token}`;

    const mailOptions = {
      from: '"PeerFusion" <onboarding@resend.dev>',
      to: user.email,
      subject: 'Reset Your Password - PeerFusion',
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
              <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Reset Your Password</h2>
              <p>Hello ${user.name || ''},</p>
              <p>We received a request to reset your password. Click the button below to create a new one:</p>
              <div style="text-align:center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color:#1a73e8; color:#ffffff; padding:12px 20px; text-decoration:none; font-size:16px; border-radius:5px; display:inline-block;">
                  Reset Password
                </a>
              </div>
              <p>This link will expire in <strong>1 hour</strong>. If you didn’t request this, you can safely ignore this email.</p>
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

// -------------------------- Admin/Moderator Forgot Password -------------------------- //
router.post('/admin-forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email exists and user is admin/moderator
    const findUserSql = 'SELECT * FROM users WHERE email = ? AND role IN ("admin", "moderator")';
    const [users] = await db.query(findUserSql, [email]);

    if (users.length === 0) {
      // Return same message for security
      return res.status(200).json({ 
        message: 'If an admin/moderator account with that email exists, a reset code has been sent.' 
      });
    }

    const user = users[0];
    const resetCode = generateSixDigitCode();
    const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the hashed reset code and expiration
    const updateUserSql = 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?';
    await db.query(updateUserSql, [hashedCode, codeExpires, user.id]);

    // Send email with reset code
    const mailOptions = {
      from: '"PeerFusion Admin" <onboarding@resend.dev>',
      to: user.email,
      subject: 'Admin Password Reset Code - PeerFusion',
      html: `
      <!DOCTYPE html>
      <html lang="en" style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Admin Password Reset</title>
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
              <h2 style="margin-top: 0; color: #0ea050ff; text-align:center;">Admin Password Reset</h2>
              <p>Hello ${user.name || user.email},</p>
              <p>You requested to reset your password. Use the following 6-digit verification code:</p>
              <div style="text-align:center; margin: 30px 0;">
                <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; border-radius: 8px; display: inline-block;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d130dff;">${resetCode}</span>
                </div>
              </div>
              <p style="text-align: center; color: #666; font-size: 14px;">
                This code will expire in <strong>15 minutes</strong>.
              </p>
              <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
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

    res.status(200).json({ 
      message: 'If an admin/moderator account with that email exists, a reset code has been sent.',
      email: email // Return email for frontend to use in next step
    });

  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset process.' });
  }
});

// -------------------------- Verify Reset Code -------------------------- //
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const findUserSql = 'SELECT * FROM users WHERE email = ? AND resetPasswordToken = ? AND resetPasswordExpires > NOW() AND role IN ("admin", "moderator")';
    const [users] = await db.query(findUserSql, [email, hashedCode]);

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset code.' 
      });
    }

    // Code is valid - generate a temporary token for password reset
    const user = users[0];
    const tempToken = crypto.randomBytes(32).toString('hex');
    const hashedTempToken = crypto.createHash('sha256').update(tempToken).digest('hex');
    
    // Store temporary token (valid for 10 minutes)
    await db.query(
      'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?',
      [hashedTempToken, user.id]
    );

    res.status(200).json({ 
      message: 'Code verified successfully.',
      tempToken,
      email
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

    const findUserSql = 'SELECT * FROM users WHERE email = ? AND resetPasswordToken = ? AND resetPasswordExpires > NOW() AND role IN ("admin", "moderator")';
    const [users] = await db.query(findUserSql, [email, hashedToken]);

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token.' 
      });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset fields
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