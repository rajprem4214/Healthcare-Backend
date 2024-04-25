import { Router } from 'express';
import { getRateLimiter } from '../../../utils/rateLimiter';
import { asyncWrap } from '../../../utils/asyncWrap';
import { createNotificationHandler, getNotificationHandler, getNotificationsHandler, sendCustomNotificationHandler, sendCustomWhatsappMessageHandler, sendOtpViaWhatsappHandler, updateNotificationHandler } from './handlers';
import { authTokenValidator } from '../auth/auth';

const notiRouter = Router();

notiRouter.use(getRateLimiter());
notiRouter.get('/', asyncWrap(getNotificationsHandler))
notiRouter.post('/create', asyncWrap(createNotificationHandler))
notiRouter.patch('/:notificationId', asyncWrap(updateNotificationHandler))
notiRouter.get('/:notificationId', asyncWrap(getNotificationHandler))
notiRouter.post('/sendCustom', asyncWrap(sendCustomNotificationHandler))
notiRouter.post('/waMsg', asyncWrap(sendCustomWhatsappMessageHandler))
notiRouter.post('/waOtp', asyncWrap(sendOtpViaWhatsappHandler))
export { notiRouter };
