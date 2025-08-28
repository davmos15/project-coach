import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, isDevelopment } from './config/environment.js';
import { validateEnvironmentVariables, handleAsync } from './utils/errorHandler.js';
import logger from './utils/logger.js';

import AuthService from './services/auth.js';
import GoogleCalendarService from './services/googleCalendar.js';
import GoogleDriveService from './services/googleDrive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

validateEnvironmentVariables();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const authService = new AuthService();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/auth/google', handleAsync(async (req, res) => {
  const authUrl = authService.generateAuthUrl();
  res.redirect(authUrl);
}));

app.get('/auth/callback', handleAsync(async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.error('OAuth error:', error);
    return res.redirect('/?error=oauth_denied');
  }

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const tokens = await authService.exchangeCodeForTokens(code);
  authService.setCredentials(tokens);

  const calendarService = new GoogleCalendarService(authService.getOAuth2Client());
  const driveService = new GoogleDriveService(authService.getOAuth2Client());

  await calendarService.createSuggestionCalendar();

  const suggestionCalendar = await calendarService.getCalendarByName('AI Coach');
  if (suggestionCalendar) {
    const webhookUrl = `${config.app.baseUrl}/webhook/calendar`;
    await calendarService.setupWebhookNotification(suggestionCalendar.id, webhookUrl);
  }

  const userInfo = await authService.getUserInfo(tokens.access_token);
  
  const primaryCalendar = await calendarService.getCalendarByName('primary');
  if (primaryCalendar) {
    const webhookUrl = `${config.app.baseUrl}/webhook/calendar`;
    await calendarService.setupWebhookNotification('primary', webhookUrl);
  }

  await driveService.createConfigFile();

  logger.info(`Successfully onboarded user: ${userInfo.email}`);
  res.redirect('/?success=true');
}));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '5.0.0',
    environment: config.app.nodeEnv
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  
  res.status(statusCode).json({ 
    error: true,
    message,
    timestamp: new Date().toISOString()
  });
});

const PORT = config.app.port;

if (isDevelopment) {
  app.listen(PORT, () => {
    logger.info(`Project Coach development server running on port ${PORT}`);
    logger.info(`Visit http://localhost:${PORT} to get started`);
  });
}

export default app;