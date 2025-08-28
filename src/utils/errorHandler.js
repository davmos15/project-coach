import logger from './logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class GoogleAPIError extends AppError {
  constructor(message, statusCode = 500) {
    super(`Google API Error: ${message}`, statusCode);
    this.name = 'GoogleAPIError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const handleLambdaAsync = (fn) => {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (error) {
      return handleLambdaError(error);
    }
  };
};

export const handleLambdaError = (error) => {
  logger.error('Lambda function error:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: true,
      message: isOperational ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error
      })
    })
  };
};

export const retryWithExponentialBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      if (error.code === 'ENOTFOUND' || 
          error.code === 'ECONNRESET' || 
          error.code === 'ETIMEDOUT' ||
          (error.response && error.response.status >= 500)) {
        
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1} after ${delay}ms`, {
          error: error.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
};

export const handleGoogleAPIError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 401:
        throw new AuthenticationError('Google API authentication failed');
      case 403:
        throw new GoogleAPIError('Google API access forbidden - check permissions', 403);
      case 404:
        throw new GoogleAPIError('Google API resource not found', 404);
      case 429:
        throw new GoogleAPIError('Google API rate limit exceeded', 429);
      case 500:
      case 502:
      case 503:
        throw new GoogleAPIError('Google API server error', 502);
      default:
        throw new GoogleAPIError(`Unexpected Google API error: ${data?.error?.message || error.message}`, status);
    }
  } else if (error.code === 'ENOTFOUND') {
    throw new GoogleAPIError('Network error - could not reach Google API', 503);
  } else {
    throw new GoogleAPIError(error.message);
  }
};

export const validateEnvironmentVariables = () => {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
  ];

  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}`,
      500,
      false
    );
  }
};

export const sanitizeError = (error) => {
  const sanitized = {
    message: error.message,
    name: error.name,
    statusCode: error.statusCode || 500
  };

  if (process.env.NODE_ENV === 'development') {
    sanitized.stack = error.stack;
  }

  return sanitized;
};