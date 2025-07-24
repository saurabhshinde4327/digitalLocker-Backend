const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER, // sender email
    pass: process.env.ALERT_EMAIL_PASS  // sender app password
  }
});

async function sendAlertEmail(subject, text) {
  const mailOptions = {
    from: process.env.ALERT_EMAIL_USER,
    to: 'shindesaurabh0321@gmail.com',
    subject,
    text
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log('Alert email sent');
  } catch (err) {
    console.error('Error sending alert email:', err);
  }
}

module.exports = { sendAlertEmail }; 