import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

import * as middlewares from './middlewares';
import { apiV1Router } from './api/v1';
import { ContentType } from '@medplum/core';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from "@sentry/profiling-node";
import { env } from './config/env';
import { asyncWrap } from './utils/asyncWrap';
import { healthcheckHandler } from './api/healthcheck';
import cookieParser from 'cookie-parser';

const app = express();
export function initializeSentry() {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}
initializeSentry();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(
  express.json({
    // type: ["application/json"],
    type: [ContentType.JSON, ContentType.FHIR_JSON, ContentType.JSON_PATCH],
    limit: env.MAX_JSON_SIZE,
  })
);

app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);
app.use(Sentry.Handlers.tracingHandler());

app.get('/healthcheck', asyncWrap(healthcheckHandler));

app.use('/api/v1', apiV1Router);

app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
