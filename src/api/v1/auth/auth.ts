import { NextFunction, Request, Response } from 'express';
import { body, header } from 'express-validator';
import {
  errorResponse,
  sendResponse,
  successfullResponse,
} from '../../../utils/sendResponse';
import { medplum } from '../../../config/medplum';
import {
  createUser,
  createLoginCreds,
  createOtp,
  verifyOtp,
  createWhatsappOtp,
  createSecureCookie,
  updateProfile,
} from './user';
import { db } from '../../../config/database';
import { ReasonPhrases } from 'http-status-codes';
import { OperationOutcome, ProjectMembership } from '@medplum/fhirtypes';
import { eq } from 'drizzle-orm';
import { schema } from '../../../db';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../../../config/env';
import { emailValidators } from './genericValidators';
import { asyncWrap } from '../../../utils/asyncWrap';

export const newPatientValidator = [
  body('firstname').notEmpty().withMessage('Missing First name'),
  body('lastname').notEmpty().withMessage('Missing Last name'),
  body('email').trim().isEmail().withMessage('Missing valid email address'),
  // body('password').isLength({ min: 8 }).withMessage('Missing field password'),
  body('email').custom(async (value) => {
    const user = await db.query.user.findFirst({
      where(fields, operators) {
        return operators.eq(fields.email, value);
      },
    });
    if (user) {
      throw new Error('E-mail already in use');
    }
  }),
];

/**
 * Handles a HTTP request to /auth/newpatient.
 * @param req - The HTTP request.
 * @param res - The HTTP response.
 */
export const newPatientHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  //
  try {
    const {
      email,
      password,
      firstname,
      lastname,
    }: {
      email: string;
      password: string;
      firstname: string;
      lastname: string;
    } = req.body;

    const medplumPatient: ProjectMembership | OperationOutcome =
      await medplum.invite(process.env.PROJECT_ID!, {
        resourceType: 'Patient',
        firstName: firstname,
        lastName: lastname,
        email: email,
        password: password,
        sendEmail: false,
      });

    if (medplumPatient.resourceType === 'ProjectMembership') {
      const projectId = medplumPatient.project?.reference?.replaceAll(
        'Project/',
        ''
      );
      const userId = medplumPatient.user?.reference?.replaceAll('User/', '');

      const userDetails = await createUser({
        email: email,
        fullName: firstname + ' ' + lastname,
        password: password,
        role: 'patient',
        projectId,
        userId,
      });

      sendResponse(
        res,
        successfullResponse({
          ...userDetails,
          message: 'User created successfully.',
        })
      );
    }
  } catch (err) {
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error)
    );
    console.error(err);
  }
};

export const loginRequestValidator = [
  ...emailValidators,
  body('otp')
    .notEmpty()
    .isString()
    .withMessage(
      'Otp is a required field and must be a string of 6 characters'
    ),
  // body('password').notEmpty().withMessage('Password is required.'),
];

/**
 * Handles a HTTP request to /auth/login.
 * @param req - The HTTP request.
 * @param res - The HTTP response.
 */
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password, otp } = req.body;

    const user: typeof schema.user.$inferSelect = req.body.currentUser;
    //TODO: handle not found error using validators
    // if (!req.body.currentUser) {
    //   sendResponse(
    //     res,
    //     errorResponse(ReasonPhrases.NOT_FOUND, new Error('User not found.'))
    //   );
    //   return;
    // }

    // NOTE: password based auth is not in the UX flow.
    // if (!user?.userKey?.password) throw new Error('Password not found. Please use reset password to assign one.');
    // const isValidPassword = bcrypt.compareSync(password, user?.userKey?.password);
    // if (!isValidPassword) {
    //     sendResponse(res, errorResponse(ReasonPhrases.UNAUTHORIZED, Error('Passwords dont match.')));
    //     return;
    // }

    await verifyOtp(user.id, otp);

    if (!user.emailVerified) {
      await db.update(schema.user).set({ emailVerified: 1 });
    }

    const loginDetails: {
      accessToken: string;
      expiry: Date;
      refreshToken?: string;
    } = await createLoginCreds(user.id);

    createSecureCookie(res, {
      session: loginDetails.refreshToken!,
    });

    delete loginDetails.refreshToken;

    sendResponse(
      res,
      successfullResponse({ ...loginDetails, user: user.id, email: user.email })
    );
  } catch (err) {
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error)
    );
  }
};

export const authTokenValidator = asyncWrap(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let authToken = req.headers.authorization;

      if (!authToken) throw new Error('Missing auth token.');
      authToken = authToken.replaceAll('Bearer', '').trim();
      const decoded: any = jwt.verify(authToken, env.JWT_SECRET);
      const user = await db.query.user.findFirst({
        where: eq(schema.user.email, decoded.email),
      });
      if (!user) {
        throw new Error('User not found. Please signup.');
      }
      req.body.authenticated = true;
      req.body.currentUser = user;
    } catch (err) {
      sendResponse(
        res,
        errorResponse(ReasonPhrases.UNAUTHORIZED, err as Error)
      );
    }

    next();
  }
);

/**
 * Handles a HTTP request to /auth/me.
 * @param req - The HTTP request.
 * @param res - The HTTP response.
 */
export const userDetailsHandler = async (req: Request, res: Response) => {
  //
  try {
    sendResponse(
      res,
      successfullResponse({
        user: req.body.currentUser,
      })
    );
  } catch (err) {
    throw new Error(
      "Something went wrong. Patient doesn't exist for this user"
    );
  }
};

export const createOtpValidator = [...emailValidators];

export const createOtpHandler = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    const otpData = await createOtp(email as string);
    sendResponse(
      res,
      successfullResponse({
        userId: otpData.userId,
        message: 'OTP sent to registered mail address.',
      })
    );
  } catch (err) {
    console.error(err);
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error)
    );
  }
};

export const verifyOtpValidator = [
  ...emailValidators,
  body('otp')
    .notEmpty()
    .isString()
    .withMessage(
      'Otp is a required field and must be a string of 6 characters'
    ),
];

export const verifyOtpHandler = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;

    await verifyOtp(req.body.currentUser.id, otp);

    sendResponse(
      res,
      successfullResponse({ message: 'Otp verified successfully' })
    );
  } catch (err) {
    console.error(err);
    sendResponse(res, errorResponse(ReasonPhrases.UNAUTHORIZED, err as Error));
  }
};

export const createWhatsappOtpHandler = async (req: Request, res: Response) => {
  try {
    const { phone, userId } = req.body;

    if (!phone || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await createWhatsappOtp(phone, userId);

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    // Destructuring refreshToken from cookie
    const refreshToken = req.cookies?.session;
    if (!refreshToken) throw new Error('Refresh token not found.');

    const decoded: JwtPayload = jwt.verify(
      refreshToken,
      env.REFRESH_TOKEN_SECRET
    ) as JwtPayload;

    const loginCreds: {
      accessToken: string;
      expiry: Date;
      refreshToken?: string;
    } = await createLoginCreds(decoded.userId);
    createSecureCookie(res, {
      session: loginCreds.refreshToken!,
    });

    delete loginCreds.refreshToken;

    return res.json({ ...loginCreds });
  } catch (err) {
    console.error(err);
    sendResponse(res, errorResponse(ReasonPhrases.UNAUTHORIZED, err as Error));
  }
};

export const updateProfileHandler = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phoneNumber, profilePictureUrl, emailVerified } = req.body;
    const id = req.params.userId;
    await updateProfile(id, { fullName, email, phoneNumber, profilePictureUrl, emailVerified });

    sendResponse(
      res,
      successfullResponse({
        message: 'Profile updated successfully'
      })
    );
  } catch (error) {
    console.error(error);
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
    );
  }
};