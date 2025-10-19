// config/mailer.js

const nodemailer = require('nodemailer');

// Configure the transporter for sending emails using Resend SMTP
const transporter = nodemailer.createTransport({
  host: process.env.RESEND_EMAIL_HOST,
  port: process.env.RESEND_EMAIL_PORT,
  secure: true, 
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY, 
  },
});

module.exports = transporter;
