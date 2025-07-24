require('dotenv').config();
const { sendAlertEmail } = require('./emailUtils');

sendAlertEmail('Test Alert', 'This is a test alert email from Digital Locker backend.').then(() => {
  console.log('sendAlertEmail function completed.');
  process.exit(0);
}).catch((err) => {
  console.error('Error in sendAlertEmail:', err);
  process.exit(1);
}); 