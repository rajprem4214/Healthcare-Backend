import { Router } from 'express';
import { getRateLimiter } from '../../../utils/rateLimiter';
import { asyncWrap } from '../../../utils/asyncWrap';
import { googleOauthSignUpHandler } from './handler';

const oauthRouter = Router();

oauthRouter.use(getRateLimiter());

oauthRouter.get('/google', googleOauthSignUpHandler)


export { oauthRouter }