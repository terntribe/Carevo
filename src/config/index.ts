export const config = {
  // Application configuration
  env: process.env.ENV || 'local',
  port: process.env.PORT || '3000',
  log_level: process.env.LOG_LEVEL || 'info',
  phone_hash_secret: process.env.PHONE_HASH_SECRET || '',

  // database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    name: process.env.DB_NAME || '',
  },

  // Storage configuration
  storage: {
    messages_location: process.env.MESSAGES_FILE_LOCATION || './messages.json',
    audio_files: process.env.AUDIO_FILES_LOCATION || './audio_files/',
  },

  // WhatsApp API configuration
  whatsapp: {
    access_token: process.env.WA_ACCESS_TOKEN || '',
    reciepient_id: process.env.WA_RECIPIENT_WAID || '',
    phone_number_id: process.env.WA_PHONE_NUMBER_ID || '',
    api_version: process.env.WA_VERSION || 'v22.0',
    wa_verify_token: process.env.WA_VERIFY_TOKEN || '',
  },

  // third-party APIs
  api_keys: {
    gemini: process.env.GEMINI_API_KEY || '',
  },
};
