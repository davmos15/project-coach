import { describe, it, expect, beforeEach } from '@jest/globals';
import AuthService from '../../services/auth.js';

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid auth URL', () => {
      const authUrl = authService.generateAuthUrl();

      expect(authUrl).toBeDefined();
      expect(typeof authUrl).toBe('string');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const mockTokens = {
        access_token: 'access_token',
        refresh_token: 'refresh_token'
      };

      authService.oauth2Client.getToken.mockResolvedValue({
        tokens: mockTokens
      });

      const result = await authService.exchangeCodeForTokens('test_code');

      expect(result).toEqual(mockTokens);
      expect(authService.oauth2Client.getToken).toHaveBeenCalledWith('test_code');
    });

    it('should handle token exchange errors', async () => {
      authService.oauth2Client.getToken.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      await expect(
        authService.exchangeCodeForTokens('invalid_code')
      ).rejects.toThrow('Invalid authorization code');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const mockCredentials = {
        access_token: 'new_access_token'
      };

      authService.oauth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials
      });

      const result = await authService.refreshAccessToken('refresh_token');

      expect(result).toEqual(mockCredentials);
    });
  });
});