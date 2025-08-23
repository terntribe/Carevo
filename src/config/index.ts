export const config = {
  // Application configuration
  env: process.env.ENV || 'local',
  port: process.env.PORT || '3000',

  // Storage configuration
  storage: {
    messages_location: process.env.MESSAGES_FILE_LOCATION || './messages.json',
    audio_files: process.env.AUDIO_FILES_LOCATION || './audio_files/',
  },

  // WhatsApp API configuration
  whatsapp: {
    acess_token: process.env.WA_ACCESS_TOKEN || '',
    reciepient_id: process.env.WA_RECIPIENT_WAID || '',
    phone_number_id: process.env.WA_PHONE_NUMBER_ID || '',
    api_version: process.env.WA_VERSION || 'v22.0',
  },
};
