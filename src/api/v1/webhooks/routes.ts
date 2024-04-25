import { Router } from "express";
import { asyncWrap } from "../../../utils/asyncWrap";
import * as patientReward from "../reward/reward";
import { handleWebhookRequest, verifyWhatsappHookHandler } from "../whatsapp/handlers";
const webHookRouter = Router();

webHookRouter.post("/rewards/medplum", asyncWrap(patientReward.applyRewardMedplum));
// These Webhooks are for whatsapp bot requests
webHookRouter.get('/whatsapp', verifyWhatsappHookHandler);
webHookRouter.post('/whatsapp', handleWebhookRequest)
export { webHookRouter };
