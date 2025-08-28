import AuthService from '../services/auth.js';
import GoogleCalendarService from '../services/googleCalendar.js';
import GoogleDriveService from '../services/googleDrive.js';
import logger from '../utils/logger.js';
import { config } from '../config/environment.js';

export const callbackHandler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  try {
    const { code, error } = event.queryStringParameters || {};

    if (error) {
      logger.error('OAuth error:', error);
      return {
        statusCode: 302,
        headers: {
          ...headers,
          Location: `${config.app.baseUrl}/?error=oauth_denied`
        }
      };
    }

    if (!code) {
      return {
        statusCode: 302,
        headers: {
          ...headers,
          Location: `${config.app.baseUrl}/?error=no_code`
        }
      };
    }

    const authService = new AuthService();
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

    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${config.app.baseUrl}/?success=true`
      }
    };

  } catch (error) {
    logger.error('Error in auth callback:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${config.app.baseUrl}/?error=${encodeURIComponent(error.message)}`
      }
    };
  }
};