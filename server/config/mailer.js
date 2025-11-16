const nodemailer = require('nodemailer');

// Configure the transporter for sending emails using Resend SMTP
const transporter = nodemailer.createTransport({
  host: process.env.RESEND_EMAIL_HOST || 'smtp.resend.com',
  port: process.env.RESEND_EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY, 
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Connection failed:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});

module.exports = transporter;