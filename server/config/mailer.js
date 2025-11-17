// config/mailer.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = {
  sendMail: async function(mailOptions) {
    try {
      const { data, error } = await resend.emails.send({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Resend API error:', error);
      throw error;
    }
  },
  
  verify: function(callback) {
    console.log('Resend API is ready');
    callback(null, true);
  }
};

module.exports = transporter;