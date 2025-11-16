const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 587,
  secure: false,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY,
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

async function sendEmailResendAPI(to, subject, html, from = 'PeerFusion <noreply@peerfusionskillshare.com>') {
  try {
    const { data, error } = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html
    });

    if (error) throw error;
    console.log('Email sent via Resend API');
    return data;
  } catch (error) {
    console.error('Resend API failed:', error);
    throw error;
  }
}

async function sendEmail(to, subject, html, from = 'PeerFusion <noreply@peerfusionskillshare.com>') {
  try {
    // Try Resend API first
    return await sendEmailResendAPI(to, subject, html, from);
  } catch (apiError) {
    console.log('API failed, trying SMTP...');
    
    // Fallback to SMTP
    try {
      const mailOptions = { from, to, subject, html };
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent via SMTP');
      return result;
    } catch (smtpError) {
      console.error('Both API and SMTP failed:');
      console.error('API Error:', apiError.message);
      console.error('SMTP Error:', smtpError.message);
      throw new Error(`Email sending failed: ${apiError.message}`);
    }
  }
}

module.exports = { transporter, sendEmail, sendEmailResendAPI };