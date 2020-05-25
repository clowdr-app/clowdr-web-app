require('dotenv').config()

module.exports = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKey: process.env.TWILIO_API_KEY,
    apiSecret: process.env.TWILIO_API_SECRET,
    token: process.env.TWILIO_AUTH_TOKEN,
    chatServiceSid: process.env.TWILIO_CHAT_SERVICE_SID

  }
};
