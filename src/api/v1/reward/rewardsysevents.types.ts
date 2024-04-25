import { RewardEvents } from "../../../db/schemas/reward"

export interface BaseSystemEvent {
    event:RewardEvents
    data:Record<string,any>
    userId:string
}

export interface DailyLoginEvent extends Omit<BaseSystemEvent,"data">{
data:{
    timestamp:Date
    prevTimeStamp:Date
}
}

export declare type SystemEvent=BaseSystemEvent | DailyLoginEvent