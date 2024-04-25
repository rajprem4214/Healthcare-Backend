import { Response } from 'express';
import { Result, ValidationError } from 'express-validator';
import { ReasonPhrases, getStatusCode } from 'http-status-codes';
import { ApiResponse } from '../interfaces/apiResponse';
import * as Sentry from '@sentry/node';
import { env } from '../config/env';

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

export const inValidRequestResponse = (
  errors: Result<ValidationError>
): ApiResponse => {
  return {
    message: ReasonPhrases.BAD_REQUEST,
    id: '',
    issue: errors.array().map((error) => ({
      expression: getValidationErrorExpression(error),
      details: { text: error.msg },
    })),
  };
};

export const errorResponse = (
  message: ReasonPhrases,
  errors: Result<ValidationError> | Error
): ApiResponse => {
  //
  if (errors instanceof Error) {
    Sentry.captureException(errors)
    return {
      id: '',
      message,
      issue: [
        {
          details: errors.message,
        },
      ],
    };
  } else {
    return {
      message: message,
      id: '',
      issue: errors.array().map((error) => ({
        expression: getValidationErrorExpression(error),
        details: { text: error.msg },
      })),
    };
  }
};

export const successfullResponse = (data: any): ApiResponse => {
  return {
    message: ReasonPhrases.OK,
    id: '',
    data,
  };
};

function getValidationErrorExpression(error: ValidationError): string[] | any {
  // ValidationError can be AlternativeValidationError | GroupedAlternativeValidationError | UnknownFieldsError | FieldValidationError
  if (error.type === 'field') {
    return [error.path];
  }
  return error;
}

export const sendResponse = (res: Response, data: ApiResponse) => {
  res.status(getStatusCode(data.message)).send(data);
};
