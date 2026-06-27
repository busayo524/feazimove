require('dotenv').config()
const { sendOtpEmail } = require('./services/emailService')

sendOtpEmail('olowookerebusayo66@gmail.com', 'Busayomi', '123456')
  .then(() => console.log('✅ Email sent successfully!'))
  .catch(err => console.error('❌ Failed:', err.message))