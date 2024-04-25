import { NextFunction, Request, RequestHandler, Response } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse, sendResponse } from './sendResponse';
import { ReasonPhrases } from 'http-status-codes';

/**
 * Wraps an express handler with an async handler.
 * See: https://zellwk.com/blog/async-await-express/
 * This is almost the exact same as express-async-handler,
 * except that package is out of date and lacks TypeScript bindings.
 * https://www.npmjs.com/package/express-async-handler/v/1.1.4
 * @param callback - The handler.
 * @returns Async wrapped handler.
 */
export function asyncWrap(
  callback: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      // if not user and validating email
      if (
        errors
          .array()
          .some(
            (error) =>
              error.type === 'field' &&
              error.path === 'email' &&
              error.msg === 'Email not in use.'
          ) &&
        !req.body.currentUser
      ) {
        sendResponse(res, errorResponse(ReasonPhrases.NOT_FOUND, errors));
        return;
      }

      sendResponse(
        res,
        errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors)
      );
      return;
    }
    callback(req, res, next).catch(next);
  };
}
