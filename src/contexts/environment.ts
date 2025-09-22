// src/config/environment.ts
export const getEnvironmentConfig = () => {
  // Validate required environment variables
  const requiredVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    firebase: {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY!,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.REACT_APP_FIREBASE_APP_ID!,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID!
    },
    encryption: {
      key: process.env.REACT_APP_ENCRYPTION_KEY || (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('ENCRYPTION_KEY must be set in production!');
        }
        console.warn('Using default encryption key - CHANGE IN PRODUCTION!');
        return 'dev-key-change-in-production';
      })()
    },
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  };
};