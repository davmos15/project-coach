import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import AuthService from '../services/auth.js';
import GoogleCalendarService from '../services/googleCalendar.js';
import GoogleDriveService from '../services/googleDrive.js';
import logger from '../utils/logger.js';
import { config } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'https:']
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

const authService = new AuthService();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.get('/auth/google', (req, res) => {
  try {
    const authUrl = authService.generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Error initiating Google auth:', error);
    res.redirect('/?error=auth_failed');
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
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

    const groundTruthCalendar = await calendarService.getCalendarByName(userInfo.email);
    if (groundTruthCalendar) {
      const webhookUrl = `${config.app.baseUrl}/webhook/calendar`;
      await calendarService.setupWebhookNotification(groundTruthCalendar.id, webhookUrl);
    }

    await driveService.createConfigFile();

    logger.info(`Successfully onboarded user: ${userInfo.email}`);
    res.redirect('/?success=true');

  } catch (error) {
    logger.error('Error in auth callback:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export const handler = (event, context) => {
  const serverlessExpress = require('serverless-express');
  return serverlessExpress.createServer(app)(event, context);
};