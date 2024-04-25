import { Router } from "express";

import { asyncWrap } from "../../../utils/asyncWrap";
import * as patientRewardController from "./reward";
import { allocateReward, allocateRewardValidator, dailySignUpReward } from "./patientReward";
import { authTokenValidator } from "../auth/auth";

const rewardsRouter = Router();

rewardsRouter.post("/daily_signup", authTokenValidator, asyncWrap(dailySignUpReward));
rewardsRouter.post("/allocate", authTokenValidator, allocateRewardValidator, asyncWrap(allocateReward));

rewardsRouter.post(
    "/",
    authTokenValidator,
    patientRewardController.createRewardValidator,
    asyncWrap(patientRewardController.createReward)
);
rewardsRouter.patch(
    "/:id",
    authTokenValidator,
    patientRewardController.updateRewardValidator,
    asyncWrap(patientRewardController.updateReward)
);

rewardsRouter.get("/", authTokenValidator, asyncWrap(patientRewardController.getRewards));
rewardsRouter.get("/:id", authTokenValidator, asyncWrap(patientRewardController.getReward));
rewardsRouter.get("/claim/history", authTokenValidator, asyncWrap(patientRewardController.getRewardHistory));

rewardsRouter.delete(
    "/condition",
    authTokenValidator,
    patientRewardController.deleteConditionValidator,
    asyncWrap(patientRewardController.deleteCondition)
);

export { rewardsRouter };
