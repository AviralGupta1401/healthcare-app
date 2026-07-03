import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),
  SENDGRID_API_KEY: optional('SENDGRID_API_KEY', ''),
  FROM_EMAIL: optional('FROM_EMAIL', 'noreply@healthcare.app'),
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_REDIRECT_URI: optional('GOOGLE_REDIRECT_URI', ''),
  GOOGLE_REFRESH_TOKEN: optional('GOOGLE_REFRESH_TOKEN', ''),
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),
  PORT: parseInt(optional('PORT', '4000')),
  NODE_ENV: optional('NODE_ENV', 'development'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),
};
