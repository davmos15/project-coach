import dotenv from 'dotenv';

dotenv.config();

export const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    stage: process.env.STAGE || 'dev'
  },
  email: {
    from: process.env.EMAIL_FROM,
    sendgridApiKey: process.env.SENDGRID_API_KEY
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1'
  }
};

export const isDevelopment = config.app.nodeEnv === 'development';
export const isProduction = config.app.nodeEnv === 'production';