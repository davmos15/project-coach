// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback';
process.env.BASE_URL = 'http://localhost:3000';
process.env.EMAIL_FROM = 'test@example.com';
process.env.SENDGRID_API_KEY = 'test_sendgrid_key';

// Basic setup for tests
global.console.log = () => {};
global.console.info = () => {};
global.console.warn = () => {};
// Keep console.error for debugging test failures
// global.console.error = () => {};