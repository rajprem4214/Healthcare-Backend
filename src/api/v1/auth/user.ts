import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../../../config/database';
import { schema } from '../../../db';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { env } from '../../../config/env';
import { eq } from 'drizzle-orm';
import { sendOTPByEmail } from '../notifications/emailNotifications';
import { sendOtpViaWhatsApp } from '../notifications/whatsapp';
import { Response } from 'express';
import { addNewSubscriber, sendWelcomeEmail } from '../notifications/emailNotifications';

const createPasswordHash = async (password: string) => {
  const hashedPassword = await bcrypt.hash(password, 11);
  return hashedPassword;
};

export const createUser = async (
  userDetails: UserDetails
): Promise<UserDetails & { userId: string }> => {
  //
  const {
    fullName,
    email,
    password,
    projectId = randomUUID(),
    userId = randomUUID(),
  } = userDetails;
  
  let hashedPassword: string | null = null;
  if (password) {
    hashedPassword = await createPasswordHash(password);
  }

  await db.transaction(async (tx) => {
    try {
      await tx.insert(schema.user).values({
        id: userId,
        email: email,
        fullName: fullName,
        projectId: projectId,
        roles: 'patient',
        active: 1,
        admin: 0,
      });
      await tx.insert(schema.userKeys).values({
        id: randomUUID(),
        userId: userId,
        password: hashedPassword,
      });
      // await addNewSubscriber(email, userId, fullName);
      // await sendWelcomeEmail(userId, fullName);
    } catch (err) {
      console.error(err);
      tx.rollback();
      throw Error('Unable to create user');
    }
    return;
  });

  return { ...userDetails, userId };
};

export const createSecureCookie = (
  res: Response,
  data: Record<string, string>
) => {
  Object.entries(data).forEach(([key, value]) => {
    res.cookie(key, value, {
      sameSite: 'none',
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
  });
};

export const createLoginCreds = async (userId: string) => {
  const user = await db.query.user.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, userId);
    },
  });

  if (!user) throw new Error('User not found');

  try {
    const currentTime = dayjs();

    const token = jwt.sign(
      {
        email: user.email,
        role: user.roles,
        iat: currentTime.unix(),
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRY,
      }
    );

    const refreshToken = jwt.sign(
      {
        email: user.email,
        userId: user.id,
      },
      env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: '30d',
      }
    );

    const tokenExpiry = currentTime.add(env.JWT_EXPIRY, 'seconds').toDate();

    await db.insert(schema.session).values({
      userId,
      authToken: token,
      refreshToken,
      expiry: tokenExpiry,
    });

    return {
      accessToken: token,
      refreshToken,
      expiry: tokenExpiry,
    };
  } catch (err) {
    console.error(err);
    throw new Error('Login Failed');
  }
};

export const updateProfile = async (id: string, updateInfo: { fullName?: string, email?: string, phoneNumber?: string, profilePictureUrl?: string, emailVerified?: number }) => {
  try {
    const existingUser = await db.query.user.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, id);
      },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedFields: { [key: string]: any } = {};

    if (updateInfo.fullName !== undefined) {
      updatedFields.fullName = updateInfo.fullName;
    }

    if (updateInfo.email !== undefined) {
      updatedFields.email = updateInfo.email;
    }

    if (updateInfo.phoneNumber !== undefined) {
      updatedFields.phoneNumber = updateInfo.phoneNumber;
    }

    if (updateInfo.profilePictureUrl !== undefined) {
      updatedFields.profilePictureUrl = updateInfo.profilePictureUrl;
    }

    if (updateInfo.profilePictureUrl !== undefined) {
      updatedFields.profilePictureUrl = updateInfo.profilePictureUrl != null ? updateInfo.profilePictureUrl : null;
    }

    if (updateInfo.emailVerified !== undefined) {
      updatedFields.emailVerified = updateInfo.emailVerified
    }

    await db.update(schema.user).set(updatedFields).where(eq(schema.user.id, id));

  } catch (error) {
    console.log(error);
    throw new Error('Error in updating user');
  }
}

export const createOtp = async (email: string) => {
  const user = await db.query.user.findFirst({
    where: eq(schema.user.email, email),
    with: {
      userKey: true,
    },
  });

  if (!user) throw new Error('User not found');

  const otp = generateOTP();
  const secretToken = createSecretOtpToken(otp);

  try {
    // Store OTP and secret token in the userKeys table
    if (!(user as any).userKey) {
      await db
        .insert(schema.userKeys)
        .values({ userId: user.id, otp, otpSecret: secretToken });
    } else {
      await db
        .update(schema.userKeys)
        .set({ otp, otpSecret: secretToken })
        .where(eq(schema.userKeys.userId, user.id));
    }

    // Send OTP via email
    await sendOTPByEmail(email, otp);
    return { userId: user.id, secretToken: secretToken };
  } catch (err) {
    console.error(err);
    throw new Error('Failed to create OTP');
  }
};

export const verifyOtp = async (userId: string, otpInput: string) => {
  console.debug(userId, otpInput);

  const user: any = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    with: {
      userKey: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const userKey = (user as any)?.userKey;

  if (!userKey || !userKey?.otpSecret || userKey.otp !== otpInput) {
    throw new Error('Invalid OTP.');
  }

  try {
    jwt.verify(userKey?.otpSecret, env.JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid OTP.');
  }

  // Clear OTP and secret token
  await clearTokens(userId);
};

export const createWhatsappOtp = async (phone: string, userId: string) => {
  const user = await db.query.user.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, userId);
    },
  });

  if (!user) throw new Error('User not found');

  const otp = generateOTP();
  const secretToken = createSecretOtpToken(otp);

  try {
    // Store OTP and secret token in the userKeys table
    await db
      .update(schema.userKeys)
      .set({ otp, otpSecret: secretToken, updatedAt: new Date() })
      .where(eq(schema.userKeys.userId, user.id));

    phone = '91' + phone;
    // Send OTP via WhatsApp
    await sendOtpViaWhatsApp(phone, otp);

    return { userId: user.id, secretToken: secretToken };
  } catch (err) {
    console.error(err);
    throw new Error('Failed to create WhatsApp OTP');
  }
};

const generateOTP = () => {
  const min = 100000;
  const max = 999999;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

const createSecretOtpToken = (otp: string) => {
  return jwt.sign(
    {
      otp: otp,
      secret: randomUUID(),
    },
    env.JWT_SECRET,
    {
      expiresIn: '5m',
    }
  );
};

const clearTokens = async (userId: string) => {
  await db
    .update(schema.userKeys)
    .set({ otp: null, otpSecret: null })
    .where(eq(schema.userKeys.userId, userId));
};
