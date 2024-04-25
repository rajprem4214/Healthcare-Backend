import { boolean, int, json, mysqlEnum, mysqlTable, serial, text, timestamp } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export enum RewardEvents {
    WHATSAPP_VERIFICATION = "whatsapp_verification",
    SIGNUP_HEALTHID = "signup_healthid",
    CHECKIN_APP_DAILY = "checkin_app_daily",
    CLICK_NOTIFICATION = "click_notification",
    LINK_PHONE_WHATSAPP = "link_phone_whatsapp",
    ALLOW_NOTIFICATIONS = "allow_notifications",
    ALLOW_HEALTHKIT_PERMISSIONS = "allow_healthkit_permissions",
    BOOK_HOME_TESTS_UWELL_EVENTS = "book_home_tests_uwell_events",
    GENERATE_TEMP_LINK_SHARING = "generate_temp_link_sharing",
    COMPLETE_ABBY_HEALTH = "complete_abby_health",
    DAILY_REWARDS_VISIT_UWELL_WEBSITE = "daily_rewards_visit_uwell_website",
    COMPLETE_DYNAMIC_QUESTIONNAIRE = "complete_dynamic_questionnaire",
    PROVIDE_FEEDBACK_IN_APP = "provide_feedback_in_app",
    DYNAMIC_IN_APP_POPUP_QUESTIONS = "dynamic_in-app_popup_questions",
    MONITOR_HEART_RATE_DAILY = "monitor_heart_rate_daily",
    UPLOAD_PDF_DOCUMENTS = "upload_pdf_documents",
    SYNC_CONTACTS = "sync_contacts",
    INVITE_CONTACTS = "invite_contacts",
    VERIFY_KYC = "verify_kyc",
    REFERRAL_REGISTRATION = "referral_registration",
    ZENOTI_BOOKING_WEBHOOKS = "zenoti_booking_webhooks",
}
const rewardEventVals = Object.values(RewardEvents) as unknown as readonly [string, ...string[]];

export enum Comparator {
    isEqual = "==",
    isGreater = ">",
    isLess = "<",
    isGreaterOrEqual = ">=",
    isLessorEqual = "<=",
}
const comparatorVals = Object.values(Comparator) as unknown as readonly [string, ...string[]];

export enum RewardStatus {
    Active = "active",
    Inactive = "inactive",
    Archived = "archived",
    Draft = "draft",
}

const statusVals = Object.values(RewardStatus) as unknown as readonly [string, ...string[]];

export enum RewardDistributionStatus {
    Claimed = "claimed",
    UnClaimed = "unclaimed",
}

const rewardDistributionstatusVals = Object.values(RewardDistributionStatus) as unknown as readonly [
    string,
    ...string[]
];

export enum RewardConditionValueType {
    Integer = "int",
    Decimal = "decimal",
    String = "text",
    Date = "date",
}
const rewardConditionValueTypeVals = Object.values(RewardConditionValueType) as unknown as readonly [
    string,
    ...string[]
];

export enum RewardPriority {
    Urgent = "urgent",
    High = "high",
    Medium = "medium",
    Low = "low",
}
const rewardPriorityValueTypeVals = Object.values(RewardPriority) as unknown as readonly [
    string,
    ...string[]
];

/**
 * Count - int
 * recurrence - count
 *
 *
 * How , Why, When, Rules due to which it was triggered, Status
 * Unclaim process will be done by me and claim process will be done by Shikhar Sir
 */
export const rewards = mysqlTable("rewards", {
    id: serial("id").primaryKey(),
    event: mysqlEnum("event", rewardEventVals).unique().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    amount: int("amount").notNull(),
    status: mysqlEnum("status", statusVals).notNull().default(RewardStatus.Draft),
    recurrenceCount: int("recurrence_count").default(1).notNull(),
    originResource: text("origin_resource").notNull(),
    priority: mysqlEnum("priority", rewardPriorityValueTypeVals).notNull().default(RewardPriority.Low),
    expiresAt: timestamp("expires_at"),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    extraData: json(`extra_data`).default("{}"),
});

export const rewardConditions = mysqlTable("reward_conditions", {
    event: mysqlEnum("event", rewardEventVals).notNull(),
    field: text("field").notNull(),
    comparator: mysqlEnum("comparator", comparatorVals).notNull(),
    value: text("value").notNull(), // The value to be matched
    valueType: mysqlEnum("value_type", rewardConditionValueTypeVals)
        .notNull()
        .default(RewardConditionValueType.String),
    isValueAbsolute: boolean("is_value_absolute").notNull().default(true), // Denotes if the given value is a field or an absolute value
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rewardDistributionLogs = mysqlTable("rewards_distribution_logs", {
    id: serial("id").primaryKey(),
    event: mysqlEnum("event", rewardEventVals).notNull(),
    userId: text("user_id").notNull(),
    claimAmount: int("claim_amount").default(0).notNull(),
    claimCount: int("claim_count").default(1).notNull(),
    status: mysqlEnum("status", rewardDistributionstatusVals),
    triggerField: text("trigger_field"),
    triggerValue: text("trigger_value"),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rewardRelations = relations(rewards, ({ many }) => {
    return {
        conditions: many(rewardConditions),
        claims: many(rewardDistributionLogs),
    };
});
export const rewardConditionRelations = relations(rewardConditions, ({ one }) => {
    return {
        reward: one(rewards, {
            fields: [rewardConditions.event],
            references: [rewards.event],
        }),
    };
});

export const rewardLogAndRewardRelation = relations(rewardDistributionLogs, ({ one }) => {
    return {
        reward: one(rewards, {
            fields: [rewardDistributionLogs.event],
            references: [rewards.event],
        }),
    };
});
