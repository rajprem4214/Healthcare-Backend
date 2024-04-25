import { Router } from 'express';
import { getRateLimiter } from '../../../utils/rateLimiter';
import { asyncWrap } from '../../../utils/asyncWrap';
import {
  loginRequestValidator,
  loginHandler,
  newPatientHandler,
  newPatientValidator,
  userDetailsHandler,
  authTokenValidator,
  createOtpHandler,
  verifyOtpHandler,
  verifyOtpValidator,
  createOtpValidator,
  refreshTokenHandler,
  updateProfileHandler,
} from './auth';

const authRouter = Router();

authRouter.use(getRateLimiter());

authRouter.post('/login', loginRequestValidator, asyncWrap(loginHandler));
authRouter.post('/refresh', asyncWrap(refreshTokenHandler));
authRouter.post(
  '/newPatient',
  newPatientValidator,
  asyncWrap(newPatientHandler)
);

authRouter.get('/me', authTokenValidator, asyncWrap(userDetailsHandler));
authRouter.patch('/:userId', authTokenValidator, asyncWrap(updateProfileHandler));
authRouter.get('/getOtp', createOtpValidator, asyncWrap(createOtpHandler));
authRouter.post('/verifyOtp', verifyOtpValidator, asyncWrap(verifyOtpHandler));

export { authRouter };
