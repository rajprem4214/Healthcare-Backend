import { Router } from 'express';
import {
  createWalletHandler,
  createWalletValidator,
  verifySeedHandler,
  verifySeedValidator,
} from './wallet';
import { asyncWrap } from '../../../utils/asyncWrap';

const blockChainRouter = Router();

blockChainRouter.post(
  '/create',
  createWalletValidator,
  asyncWrap(createWalletHandler)
);
blockChainRouter.post(
  '/verifySeed',
  verifySeedValidator,
  asyncWrap(verifySeedHandler)
);
export { blockChainRouter };
