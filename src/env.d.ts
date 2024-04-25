declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production';
    readonly PORT: string;
    readonly JWT_SECRET: string;
    readonly REFRESH_TOKEN_SECRET: string;
    readonly MEDPLUM_CLIENT_ID: string;
    readonly MEDPLUM_CLIENT_SECRET: string;
    readonly MEDPLUM_BASE_URL: string;
    readonly PROJECT_ID: string;
    readonly DATABASE: string;
    readonly DATABASE_HOST: string;
    readonly DATABASE_USERNAME: string;
    readonly DATABASE_PASSWORD: string;
  }
}
