import { Request, Response } from 'express';
import {
  errorResponse,
  sendResponse,
  successfullResponse,
} from '../../../utils/sendResponse';
import { ReasonPhrases } from 'http-status-codes';
import { db } from '../../../config/database';
import { userWallets } from '../../../db/schemas/wallet';
import { schema } from '../../../db';
import { InferSelectModel, eq } from 'drizzle-orm';
import { body } from 'express-validator';
import { logTransaction } from './transaction';

const WALLET_URL = 'http://localhost:4998';
const HEALTH_CARE_SERVICE_URL = 'http://localhost:4997';

export const createWalletValidator = [
  body('currentUser')
    .notEmpty()
    .withMessage('User not found.')
    .custom(async (value) => {
      if (!value) return;
      const walletExists = await db.query.userWallets.findFirst({
        where: eq(schema.userWallets.userId, value.id),
      });

      if (!walletExists?.walletAddress) return;
      else throw new Error('User and wallet already exists.');
    }),
];

export const createWalletHandler = async (req: Request, res: Response) => {
  //
  try {
    let response = await fetch(WALLET_URL + '/createWallet', {
      method: 'POST',
    });
    if (!response.ok) {
      sendResponse(
        res,
        errorResponse(
          ReasonPhrases.INTERNAL_SERVER_ERROR,
          new Error('Unable to create a wallet')
        )
      );
    }

    const walletData: {
      address: string;
      encryptedPrivateKey: string;
      encryptedSeed: string;
      userSeed: string;
      token: string;
    } = await response.json();

    await db.insert(userWallets).values({
      userId: req.body.currentUser.id,
      walletAddress: walletData.address,
      encryptedPrivateKey: walletData.encryptedPrivateKey,
      encryptedSeed: walletData.encryptedSeed,
    });

    sendResponse(
      res,
      successfullResponse({
        address: walletData.address,
        userSeed: walletData.userSeed,
        token: walletData.token,
      })
    );
  } catch (err: any) {
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, new Error(err.message))
    );
  }
};

const createHealthId = async (user: InferSelectModel<typeof schema.user>) => {
  const walletDetails = await db.query.userWallets.findFirst({
    where: eq(schema.userWallets.userId, user.id),
  });

  if (!walletDetails) throw new Error('Wallet details not found.');
  if (!walletDetails.seedVerified) throw new Error('Seed is not verified.');
  if (user.healthId) throw new Error('Health ID already exist');

  const healthIdResponse = await fetch(
    HEALTH_CARE_SERVICE_URL + `/registerPatient/${walletDetails.walletAddress}`,
    {
      method: 'POST',
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoibGxld2N1c2VyIiwiaWF0IjoxNzAxMzcyMjYxLCJleHAiOjE3MzI5MDgyNjF9.p__ImXZH32vZKqArwQs1r-u2JV7d7JLs9PgFXXyr0Xo',
      },
    }
  );

  if (!healthIdResponse.ok) {
    throw new Error("Couldn't create healthID");
  }

  const healthIdResponseAsJson: HealthIdApiResponse =
    await healthIdResponse.json();

  await db.transaction(async (tx) => {
    try {
      await tx
        .update(schema.user)
        .set({
          healthId: healthIdResponseAsJson.patientID,
        })
        .where(eq(schema.user.id, user.id));

      await logTransaction(healthIdResponseAsJson, tx as any);
    } catch (err) {
      console.error(err);
      tx.rollback();
      throw err;
    }
    return;
  });

  return healthIdResponseAsJson.patientID;
};

export const verifySeedValidator = [
  body('seed').trim().notEmpty().withMessage('Seed is required.'),
  body('token').notEmpty().withMessage('Validation token must be present.'),
];

export const verifySeedHandler = async (req: Request, res: Response) => {
  const { seed, token, currentUser } = req.body;

  const userWallet = await db.query.userWallets.findFirst({
    where: eq(schema.userWallets.userId, currentUser.id),
  });

  const payload = JSON.stringify({
    userSeed: seed,
    token: token,
    encryptedPrivateKey: userWallet?.encryptedPrivateKey,
    encryptedSeed: userWallet?.encryptedPrivateKey,
  });

  try {
    if (!userWallet?.seedVerified) {
      console.log(payload);
      const response = await fetch(WALLET_URL + '/verifySeed', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(response.statusText);
        sendResponse(
          res,
          errorResponse(
            ReasonPhrases.INTERNAL_SERVER_ERROR,
            new Error(
              'Verification failed. Please make sure seed and token are valid.'
            )
          )
        );
        return;
      }

      await db
        .update(schema.userWallets)
        .set({
          seedVerified: true,
        })
        .where(eq(schema.userWallets.userId, currentUser.id));
    }

    const patientId = await createHealthId(currentUser);

    sendResponse(
      res,
      successfullResponse({
        healthId: patientId,
        message: 'Seed verification successful',
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
