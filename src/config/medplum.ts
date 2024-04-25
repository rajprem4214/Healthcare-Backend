import { MedplumClient } from '@medplum/core';
import { env } from './env';

const medplum = new MedplumClient({
  baseUrl: 'https://dev.uwell.tech/backend/medplum',
  clientId: env.MEDPLUM_CLIENT_ID,
  clientSecret: env.MEDPLUM_CLIENT_SECRET,
  verbose: env.MEDPLUM_LOGGING_ENABLED,
});

export { medplum };
