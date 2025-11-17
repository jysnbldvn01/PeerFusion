// config/mailer.js

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
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