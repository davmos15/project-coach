import { google } from 'googleapis';
import { config } from '../config/environment.js';
import { GOOGLE_SCOPES } from '../config/constants.js';
import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  generateAuthUrl() {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'consent'
      });

      logger.info('Generated OAuth URL');
      return authUrl;
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      throw error;
    }
  }

  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      logger.info('Successfully exchanged code for tokens');
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      logger.info('Successfully refreshed access token');
      return credentials;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw error;
    }
  }

  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  getOAuth2Client() {
    return this.oauth2Client;
  }

  async getUserInfo(accessToken) {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      logger.info(`Retrieved user info for: ${data.email}`);
      return data;
    } catch (error) {
      logger.error('Error getting user info:', error);
      throw error;
    }
  }
}

export default AuthService;