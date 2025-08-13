import * as dotenv from 'dotenv';

dotenv.config();

// Database Constants
export const DB_PROVIDER = 'DbConnectionToken';
export const SERVICE = 'DB_POSTGRES_SERVICE';
export const DATABASE_SERVICE = process.env.DATABASE_SERVICE || 'DATABASE_SERVICE';

// Application Constants
export const APP_NAME = process.env.APP_NAME || 'clean.architecture';
export const APP_PORT = parseInt(process.env.PORT || '4000', 10);
export const APP_HOST = process.env.APP_HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';

// PostgreSQL Constants
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://nestjs_user:nestjs_password@localhost:5432/nestjs_postgres';
export const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);

// JWT Constants
export const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-default-refresh-secret';
export const JWT_EXPIRATION_TIME = process.env.JWT_EXPIRATION_TIME || '3600s';
export const JWT_REFRESH_EXPIRATION_TIME = process.env.JWT_REFRESH_EXPIRATION_TIME || '7d';

// Google OAuth Constants (Web)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// Mobile Google OAuth Constants (Platform-specific)
export const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID;
export const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID;
export const GOOGLE_MOBILE_CALLBACK_IOS_URL = process.env.GOOGLE_MOBILE_CALLBACK_IOS_URL;
export const GOOGLE_MOBILE_CALLBACK_ANDROID_URL = process.env.GOOGLE_MOBILE_CALLBACK_ANDROID_URL;

// Encryption Constants
if (!process.env.EMAIL_ENCRYPTION_KEY) {
  throw new Error('FATAL ERROR: EMAIL_ENCRYPTION_KEY is not defined in environment variables.');
}
if (!process.env.EMAIL_BLIND_INDEX_SECRET) {
  throw new Error('FATAL ERROR: EMAIL_BLIND_INDEX_SECRET is not defined in environment variables.');
}
export const EMAIL_ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
export const EMAIL_BLIND_INDEX_SECRET = process.env.EMAIL_BLIND_INDEX_SECRET;

// Grafana Constants
export const GRAFANA_USER = process.env.GRAFANA_USER || 'admin';
export const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD || 'admin';

// Prometheus Constants
export const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9090', 10);
export const GRAFANA_PORT = parseInt(process.env.GRAFANA_PORT || '3000', 10);