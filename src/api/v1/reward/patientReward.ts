import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { errorResponse, sendResponse, successfullResponse } from "../../../utils/sendResponse";
import { ReasonPhrases } from "http-status-codes";
import { user } from "../../../db/schemas/user";

import { db } from "../../../config/database";
import { RewardEvents } from "../../../db/schemas/reward";
import { BaseSystemEvent, DailyLoginEvent } from "./rewardsysevents.types";
import { processSystemEvents } from "./reward";
import { InvalidConditionError } from "./error";

export async function dailySignUpReward (req:Request,res:Response){
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors);
      sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
      return;
    }

    // Revisit here by creating an interface
    const patient =( req.body.currentUser ?? {}) as typeof user

    if(!patient.id){
      sendResponse(res,errorResponse(ReasonPhrases.BAD_REQUEST,new Error("Patient Id is not valid")))
      return
    }

    const prevClaimTs =await db.query.rewardDistributionLogs.findFirst({
      where(fields, operators) {
          return operators.and(operators.eq(fields.event,RewardEvents.CHECKIN_APP_DAILY),operators.eq(fields.userId,patient.id))
      },
      orderBy(fields, operators) {
          return operators.desc(fields.updatedAt)
      },
    })

    let dataEvent:DailyLoginEvent

    const todayTs  = new Date()

    // Remove hr,min,ss,ms. This is so as to keep a difference based on day and avoids re triggering of event based on current day
    todayTs.setUTCHours(0,0,0,0)
   

    // If the reward is not previously claimed then create a fake timestamp of previous day. This prevents the edge case where the user is claiming the daily signup reward for first time.
    if(prevClaimTs === undefined){
      const prevDay = new Date()
      prevDay.setDate(prevDay.getDate() - 1)
      prevDay.setUTCHours(0,0,0,0)
      
      dataEvent = {
        event:RewardEvents.CHECKIN_APP_DAILY,
        userId:String(patient.id),
        data:{
          prevTimeStamp:prevDay,
          timestamp:todayTs

        }
      }
    }
    else{


      const prevTs = new Date(prevClaimTs.updatedAt)
      // Remove hr,min,ss ,ms from prev ts to neutralize the date to being only a day.
      prevTs.setUTCHours(0,0,0,0)
      dataEvent = {
        event:RewardEvents.CHECKIN_APP_DAILY,
        userId:String(patient.id),
        data:{
          prevTimeStamp:prevTs,
          timestamp:todayTs
        }
      }
    }

    try {
      await processSystemEvents(dataEvent)
    } catch (error) {
      console.error("An error occured while claiming the reward",error)

      if(error instanceof InvalidConditionError){
        sendResponse(res,errorResponse(ReasonPhrases.BAD_REQUEST,error))
        return
      }
      sendResponse(res,errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR,new Error("Internal server error")))
    }
    sendResponse(res,successfullResponse(ReasonPhrases.OK))
 
    
}

export const allocateRewardValidator =[
  body("event").isString().isIn(Object.values(RewardEvents)).withMessage("Event is not valid")
]

export async function allocateReward(req:Request,res:Response){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
    return;
  }

  const event = req.body.event
  const data =req.body.data

    // Revisit here by creating an interface
    const patient =( req.body.currentUser ?? {}) as typeof user

    const dataEvent:BaseSystemEvent = {
      event:event,
      data:data,
      userId:String(patient.id)
    }


    try {
      await processSystemEvents(dataEvent)
    } catch (error) {
      console.error("An error occured while claiming the reward",error)

      if(error instanceof InvalidConditionError){
        sendResponse(res,errorResponse(ReasonPhrases.BAD_REQUEST,error))
        return
      }
      sendResponse(res,errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR,new Error("Internal server error")))
    }
    sendResponse(res,successfullResponse(ReasonPhrases.OK))
}