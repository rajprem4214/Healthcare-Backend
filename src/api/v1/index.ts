import express from "express";
import { authRouter } from "./auth/routes";
import { patientRouter } from "./patient/routes";
import { blockChainRouter } from "./blockchain/routes";
import { authTokenValidator } from "./auth/auth";
import { questionnaireRouter } from "./questionnaire/routes";
import { uploadRouter } from "./storage/routes";
import { rewardsRouter } from "./reward/routes";
import { notiRouter } from "./notifications/routes";
import { abbyRouter } from "./abby/route";
import { webHookRouter } from "./webhooks/routes";
import { oauthRouter } from "./oauth/routes";

const apiV1Router = express.Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/patient", authTokenValidator, patientRouter);
apiV1Router.use("/questionnaire", authTokenValidator, questionnaireRouter);
apiV1Router.use("/wallet", authTokenValidator, blockChainRouter);
apiV1Router.use("/storage", authTokenValidator, uploadRouter);
apiV1Router.use("/reward", authTokenValidator, rewardsRouter);
apiV1Router.use("/notifications", authTokenValidator, notiRouter);
apiV1Router.use("/abby", abbyRouter);
apiV1Router.use("/webhook", webHookRouter);
apiV1Router.use("/oauth", oauthRouter)
export { apiV1Router };
