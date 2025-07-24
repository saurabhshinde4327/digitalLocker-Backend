const nodemailer = require('nodemailer');
const { SerialPort } = require('serialport');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS
  }
});

const ARDUINO_PORT = process.env.ARDUINO_PORT || 'COM3';
let arduinoPort;
try {
  arduinoPort = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
  arduinoPort.on('open', () => console.log('Arduino serial port opened:', ARDUINO_PORT));
  arduinoPort.on('error', (err) => {
    console.error('Serial port error:', err.message);
  });
} catch (err) {
  console.error('Could not open Arduino serial port:', err);
}

async function sendAlertEmail(subject, text) {
  const mailOptions = {
    from: process.env.ALERT_EMAIL_USER,
    to: 'rahulwaghamare1980@gmail.com',
    subject,
    text
  };
  console.log('Preparing to send email with options:', mailOptions);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Alert email sent:', info);
    // Blink Arduino LED (or turn on)
    if (arduinoPort && arduinoPort.isOpen) {
      arduinoPort.write('B', (err) => {
        if (err) {
          console.error('Error writing to Arduino:', err.message);
        } else {
          console.log('Sent blink command to Arduino.');
        }
      });
    } else {
      console.log('Arduino port not open, could not send blink command.');
    }
  } catch (err) {
    console.error('Error sending alert email:', err);
  }
}

module.exports = { sendAlertEmail }; 