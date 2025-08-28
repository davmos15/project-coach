import { jest } from '@jest/globals';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback';
process.env.BASE_URL = 'http://localhost:3000';
process.env.EMAIL_FROM = 'test@example.com';
process.env.SENDGRID_API_KEY = 'test_sendgrid_key';

// Mock external dependencies
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        generateAuthUrl: jest.fn(),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn()
      }))
    },
    calendar: jest.fn(() => ({
      calendars: {
        insert: jest.fn(),
        list: jest.fn()
      },
      events: {
        list: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        watch: jest.fn()
      },
      freebusy: {
        query: jest.fn()
      }
    })),
    tasks: jest.fn(() => ({
      tasklists: {
        list: jest.fn()
      },
      tasks: {
        list: jest.fn(),
        update: jest.fn()
      }
    })),
    drive: jest.fn(() => ({
      files: {
        create: jest.fn(),
        list: jest.fn(),
        get: jest.fn(),
        update: jest.fn()
      }
    })),
    oauth2: jest.fn(() => ({
      userinfo: {
        get: jest.fn()
      }
    }))
  }
}));

jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn()
  }))
}));