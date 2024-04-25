import dotenv from 'dotenv';
import path from 'path';
import { toBool } from './utils';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

export const env = {
  // MEDPLUM
  MEDPLUM_CLIENT_ID: process.env.MEDPLUM_CLIENT_ID,
  MEDPLUM_CLIENT_SECRET: process.env.MEDPLUM_CLIENT_SECRET,
  MEDPLUM_BASE_URL: process.env.MEDPLUM_BASE_URL,
  MEDPLUM_LOGGING_ENABLED: toBool(process.env.MEDPLUM_LOGGING_ENABLED),

  PROJECT_ID: process.env.PROJECT_ID,

  // DATABASE
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_USERNAME: process.env.DATABASE_USERNAME,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  DATABASE: process.env.DATABASE,
  DATABASE_URL: `mysql://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}/${process.env.DATABASE}?ssl={"rejectUnauthorized":true}`,
  DATABASE_LOGGING_ENABLED: toBool(process.env.DATABASE_LOGGING_ENABLED),

  // NODE RELATED
  NODE_ENV: process.env.NODE_ENV ?? 'production',
  PORT: process.env.PORT,
  MAX_JSON_SIZE: process.env.SYSTEM_MAX_JSON_SIZE ?? '1mb',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: parseInt(process.env.JWT_EXPIRY ?? '86400') ?? 86400,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_ACCESS_KEY_ID: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  CLOUDFLARE_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  CLOUDFLARE_BUCKET_NAME: process.env.CLOUDFLARE_BUCKET_NAME,
  NOVU_API_KEY: process.env.NOVU_API_KEY,

  //SENTRY DSN
  SENTRY_DSN: process.env.SENTRY_DSN,

  // WHATSAPP RELATED
  WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID,
  WA_ACCESS_TOKEN: process.env.WA_ACCESS_TOKEN,

  // GOOGLE OAUTH RELATED
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_OAUTH_REDIRECT_URL: process.env.GOOGLE_OAUTH_REDIRECT_URL,
  CLIENT_ORIGIN_URL: process.env.CLIENT_ORIGIN_URL
};

export const validateEnvironmentConfig = () => {
  const requiredVars = [
    'MEDPLUM_CLIENT_ID',
    'MEDPLUM_CLIENT_SECRET',
    'MEDPLUM_BASE_URL',
    'PROJECT_ID',
    'DATABASE_HOST',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_ACCESS_KEY_ID',
    'CLOUDFLARE_SECRET_ACCESS_KEY',
    'CLOUDFLARE_BUCKET_NAME',
    'NOVU_API_KEY',
    'SENTRY_DSN',
    'WA_ACCESS_TOKEN',
    'WA_ACCESS_TOKEN',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URL',
    'CLIENT_ORIGIN_URL'
  ];

  const missingValues = Object.entries(env).filter(
    ([key, value]) => requiredVars.includes(key) && !value
  );

  if (missingValues.length) {
    throw Error('Missing environment variables: ' + missingValues.join(''));
  }
};
