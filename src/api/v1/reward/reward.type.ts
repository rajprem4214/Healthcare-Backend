import { Comparator, RewardConditionValueType, RewardDistributionStatus, RewardEvents, RewardStatus } from "../../../db/schemas/reward"

export interface Reward {
    id: string
    event: RewardEvents
    title: string
    description: string
    amount: number
    originResource: string
    status: RewardStatus
    updatedAt: Date
    recurrenceCount:number
    createdAt: Date
    conditions: RewardCondition[]
    expiresAt:Date | null
}

export interface RewardCondition {
    event: RewardEvents
    field: string
    comparator: Comparator
    value: string
    valueType:RewardConditionValueType,
    isValueAbsolute:boolean
    updatedAt: Date
    createdAt: Date
    id:string
}

export interface RewardDistributionLog {
    id: string;
    event: RewardEvents;
    userId: string;
    claimAmount: number;
    status: RewardDistributionStatus;
    triggerField?: string;
    triggerValue?: string;
    updatedAt: Date;
    createdAt: Date;
    claimCount:number
}

