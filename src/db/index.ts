import * as userSchema from './schemas/user';
import * as walletSchema from './schemas/wallet';
import * as uploadSchema from './schemas/upload';
import * as rewardSchema from './schemas/reward';
import * as notificationSchema from './schemas/notifications';

export const schema = {
  ...userSchema,
  ...uploadSchema,
  ...walletSchema,
  ...notificationSchema,
  ...rewardSchema,
};
