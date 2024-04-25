import { Router } from 'express';
import { getRateLimiter } from '../../../utils/rateLimiter';
import { asyncWrap } from '../../../utils/asyncWrap';
import { getSignedUrlHandler, uploadFileHandler } from './handler';

const uploadRouter = Router();

uploadRouter.use(getRateLimiter());

uploadRouter.post('/upload', asyncWrap(uploadFileHandler))
uploadRouter.get('/getSignedUrl/:insertId', asyncWrap(getSignedUrlHandler))

export { uploadRouter };