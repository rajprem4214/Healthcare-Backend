import { body, check } from 'express-validator';
import { db } from '../../../config/database';

export const emailValidators = [
  check('email').trim().isEmail().withMessage('Missing valid email address'),
  check('email').custom(async (value, { req }) => {
    const user = await db.query.user.findFirst({
      where(fields, operators) {
        return operators.eq(fields.email, value);
      },
    });
    if (!user) {
      throw new Error('Email not in use.');
    }
    req.body.currentUser = user;
    return;
  }),
];
