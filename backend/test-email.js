require('dotenv').config()
const { sendOtpEmail } = require('./services/emailService')

sendOtpEmail('YOUR_TEST_EMAIL@gmail.com', 'Busayomi', '123456')
  .then(() => console.log('✅ Email sent successfully!'))
  .catch(err => console.error('❌ Failed:', err.message))