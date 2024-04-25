import { Request, Response } from "express";
import { Reward, RewardCondition, RewardDistributionLog } from "./reward.type";
import { db } from "../../../config/database";
import { schema } from "../../../db";
import { errorResponse, sendResponse, successfullResponse } from "../../../utils/sendResponse";
import { ReasonPhrases } from "http-status-codes";
import { body, query, validationResult } from "express-validator";
import {
    Comparator,
    RewardConditionValueType,
    RewardDistributionStatus,
    RewardEvents,
    RewardPriority,
    RewardStatus,
    rewardConditions,
    rewardDistributionLogs,
    rewards,
} from "../../../db/schemas/reward";
import { extractPaginationParams, parseStringData } from "../../../utils/helper";
import { Resource } from "@medplum/fhirtypes";
import { getResourceHistory } from "../../../utils/medplum";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { BaseSystemEvent, SystemEvent } from "./rewardsysevents.types";
import { InvalidConditionError } from "./error";

export const createRewardValidator = [
    body("title").notEmpty().isString().trim().escape().withMessage("Title must be a non-empty string"),
    body("description")
        .notEmpty()
        .isString()
        .trim()
        .escape()
        .withMessage("Description must be a non-empty string"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("status").isIn(Object.values(RewardStatus)),
    body("event")
        .notEmpty()
        .isString()
        .trim()
        .escape()
        .isIn(Object.values(RewardEvents))
        .withMessage("Event is not valid"),
    body("originResource").notEmpty().isString().trim().escape().withMessage("Origin Resource is not valid"),
    body("expiresAt").optional().isString().isISO8601().withMessage("Expires at must be a date"),
    body("conditions").optional().isArray().withMessage("Conditions must be an array"),
    body("conditions.*.field").isString().withMessage("Field must be a string"),
    body("conditions.*.comparator")
        .isString()
        .isIn(Object.values(Comparator))
        .withMessage("Comparator must be a string and in Comparator enum"),
    body("conditions.*.value").isString().withMessage("Value must be a string"),
];

export const createReward = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error(errors);
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
        return;
    }
    const body = req.body ?? {};

    const reward = (body as Omit<Reward, "id">) ?? {};

    let conditions = reward.conditions ?? [];

    conditions = conditions.map((c) => {
        return { ...c, event: reward.event };
    });

    try {
        const insertId = await db.transaction(async (tx) => {
            const insertReward = await tx.insert(schema.rewards).values(reward);
            if (conditions.length > 0) {
                await tx.insert(schema.rewardConditions).values(conditions);
            }
            return insertReward.insertId;
        });

        sendResponse(res, { message: ReasonPhrases.CREATED, id: insertId });
    } catch (error: any) {
        if (typeof error?.body?.message === "string" && error.body.message.includes("Duplicate entry")) {
            sendResponse(res, { message: ReasonPhrases.CONFLICT, id: "" });
            return;
        }

        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error));
    }
};

export const deleteConditionValidator = [
    query("event")
        .isString()
        .isIn(Object.values(RewardEvents))
        .withMessage("Event must be a string and in RewardEvents enum"),
    query("comparator")
        .isString()
        .isIn(Object.values(Comparator))
        .withMessage("Comparator must be a string and in Comparator enum"),
    query("field").isString().withMessage("Field must be a string"),
    query("value").isString().withMessage("Value must be a string"),
];

export const deleteCondition = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error(errors);
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
        return;
    }

    const query = req.query ?? {};

    const data: Partial<RewardCondition> = {};

    data.event = query.event as RewardEvents;
    data.comparator = String(query.comparator) as Comparator;
    data.field = String(query.field);
    data.value = String(query.value);

    try {
        const result = await db
            .delete(rewardConditions)
            .where(
                and(
                    eq(rewardConditions.event, data.event ?? ""),
                    eq(rewardConditions.comparator, data.comparator ?? ""),
                    eq(rewardConditions.field, data.field ?? ""),
                    eq(rewardConditions.value, data.value ?? "")
                )
            );

        if (result.rowsAffected === 0) {
            sendResponse(res, errorResponse(ReasonPhrases.NOT_FOUND, new Error("Condition not found")));
            return;
        }
        sendResponse(res, successfullResponse({}));
    } catch (error) {
        console.error("An error occured while deleting a condition", error);
        sendResponse(
            res,
            errorResponse(
                ReasonPhrases.INTERNAL_SERVER_ERROR,
                new Error("An internal server error has occured due to which the deletion has failed")
            )
        );
        return;
    }
};

export const updateRewardValidator = [
    body("event").isString().trim().isIn(Object.values(RewardEvents)).withMessage("Event is required."),
];

export const updateReward = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error(errors);
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
        return;
    }
    const body = req.body ?? {};
    if (Object.keys(body).length === 0) {
        sendResponse(res, successfullResponse({}));
        return;
    }

    body.id = req.params.id ?? "";

    const reward = { ...(body ?? {}), authenticated: undefined, currentUser: undefined };

    if (typeof reward.id !== "string" || reward.id === "") {
        sendResponse(res, errorResponse(ReasonPhrases.BAD_REQUEST, new Error("Invalid id")));
        return;
    }

    if (reward.expiresAt === "null" || reward.expiresAt === "") {
        reward.expiresAt = undefined;
    }

    let existingReward: Reward | undefined;

    try {
        const found = await db.query.rewards.findFirst({
            where(fields, operators) {
                return operators.eq(fields.id, Number(reward.id));
            },
        });

        existingReward = found as unknown as Reward;
    } catch (error) {
        console.error("error while updating reward", error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, new Error("failed to get the reward"))
        );
    }

    if (existingReward === undefined) {
        sendResponse(res, errorResponse(ReasonPhrases.NOT_FOUND, new Error("Reward not found")));
        return;
    }

    let conditions = (reward.conditions as Array<RewardCondition>) ?? [];

    conditions = conditions.map((c: RewardCondition) => {
        return { ...c, event: existingReward?.event ?? ("" as RewardEvents) };
    });

    try {
        await db.transaction(async (tx) => {
            const updateCopy: any = { ...reward, conditions: undefined };
            if (Object.keys(updateCopy).length > 0) {
                await tx
                    .update(rewards)
                    .set(updateCopy)
                    .where(eq(rewards.event, existingReward?.event ?? ""));
            }

            if (conditions.length > 0) {
                await Promise.all(
                    conditions.map((c) => {
                        return tx.insert(rewardConditions).values(c).execute();
                    })
                );
            }
        });

        sendResponse(res, { message: ReasonPhrases.OK, id: reward.id });
    } catch (error: any) {
        if (typeof error?.body?.message === "string" && error.body.message.includes("Duplicate entry")) {
            sendResponse(res, { message: ReasonPhrases.CONFLICT, id: "" });
            return;
        }
        console.error(error);
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error));
    }
};

export const getRewards = async (req: Request, res: Response) => {
    const pageParams = extractPaginationParams(req);

    const withConditions = Boolean(req.query.get_reward_rules === "true");
    const withUserClaims = Boolean(req.query.with_user_claims === "true");
    const user = req.body.currentUser;

    const filters = {
        status: req.query.status as RewardStatus,
        priority: req.query.priority as RewardPriority,
    };

    // Query to get the total document count
    const uploadDocTotalCount = Number(
        (
            await db
                .select({ count: sql<number>`count(${schema.rewards.id})` })
                .from(schema.rewards)
                .where(
                    and(
                        ...Object.entries(filters).map((f) => {
                            const key = f[0] as string;
                            const value = f[1] as string;

                            if (value === undefined || value === null) {
                                return;
                            }

                            if (key === "status") {
                                return eq(rewards.status, value) as SQLWrapper;
                            }
                            if (key === "priority") {
                                return eq(rewards.priority, value) as SQLWrapper;
                            }
                        })
                    )
                )
        )?.at(0)?.count
    );

    // Query to get the actual page
    const pageData = await db.query.rewards.findMany({
        orderBy(fields, operators) {
            return operators.desc(fields.updatedAt);
        },
        where(fields, operators) {
            if (Object.values(filters).length > 0) {
                return operators.and(
                    ...Object.entries(filters).map((f) => {
                        const key = f[0] as keyof typeof fields;
                        const value = f[1] as string;

                        if (value === undefined || value === null) {
                            return;
                        }

                        if (key === "status") {
                            return operators.eq(fields.status, value) as SQLWrapper;
                        }
                        if (key === "priority") {
                            return operators.eq(fields.priority, value) as SQLWrapper;
                        }
                    })
                );
            }
        },
        with: {
            ...(withConditions
                ? {
                      conditions: true,
                  }
                : {}),
            ...(withUserClaims
                ? {
                      claims: {
                          orderBy(fields, operators) {
                              return operators.desc(fields.updatedAt);
                          },
                          where(fields, operators) {
                              return operators.and(operators.eq(fields.userId, user.id));
                          },
                          limit: 1,
                      },
                  }
                : {}),
        },

        offset: pageParams.offset,
        limit: pageParams.limit,
    });
    const sendData = {
        data: pageData,
        page: pageParams.page,
        limit: pageParams.limit,
        count: uploadDocTotalCount,
    };
    sendResponse(res, successfullResponse(sendData));
};

export const getRewardHistory = async (req: Request, res: Response) => {
    const pageParams = extractPaginationParams(req);

    const user = req.body.currentUser;

    const filters = {
        status: req.query.status as RewardDistributionStatus,
        event: req.query.event as RewardEvents,
    };

    // Query to get the total document count
    const uploadDocTotalCount = Number(
        (
            await db
                .select({ count: sql<number>`count(${schema.rewardDistributionLogs.id})` })
                .from(schema.rewardDistributionLogs)
                .where(
                    and(
                        ...Object.entries(filters).map((f) => {
                            const key = f[0] as string;
                            const value = f[1] as string;

                            if (value === undefined || value === null) {
                                return;
                            }

                            if (key === "status") {
                                return eq(rewardDistributionLogs.status, value) as SQLWrapper;
                            }
                            if (key === "event") {
                                return eq(rewardDistributionLogs.event, value) as SQLWrapper;
                            }
                        })
                    )
                )
        )?.at(0)?.count
    );

    const pageData = await db.query.rewardDistributionLogs.findMany({
        orderBy(fields, operators) {
            return operators.desc(fields.updatedAt);
        },
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.userId, user.id),
                ...Object.entries(filters).map((f) => {
                    const key = f[0] as keyof typeof fields;
                    const value = f[1] as string;

                    if (value === undefined || value === null) {
                        return;
                    }

                    if (key === "status") {
                        return operators.eq(fields.status, value) as SQLWrapper;
                    }
                    if (key === "event") {
                        return operators.eq(fields.event, value) as SQLWrapper;
                    }
                })
            );
        },
        offset: pageParams.offset,
        limit: pageParams.limit,
    });

    const sendData = {
        data: pageData,
        page: pageParams.page,
        limit: pageParams.limit,
        count: uploadDocTotalCount,
    };
    sendResponse(res, successfullResponse(sendData));
};

// TODO - Revisit this api to implement projection option.
export const getReward = async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = parseInt(rawId, 10);

    if (typeof rawId !== "string" || typeof id !== "number") {
        sendResponse(res, errorResponse(ReasonPhrases.BAD_REQUEST, new Error("Invalid id")));
        return;
    }

    const rawReward = await db.query.rewards.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
        with: {
            conditions: true,
        },
    });

    if (!rawReward) {
        sendResponse(res, { message: ReasonPhrases.NOT_FOUND, id: id });
        return;
    }

    const reward: Reward = {
        ...rawReward,
        id: String(rawReward.id),
        conditions: (rawReward.conditions ?? []) as Array<RewardCondition>,
        event: rawReward.event as RewardEvents,
        status: rawReward.status as RewardStatus,
    };

    sendResponse(res, successfullResponse(reward));
};

export const applyRewardMedplum = async (req: Request, res: Response) => {
    const medplumResource = req.body ?? {};

    const event = String(req.headers["x-event"] ?? "");

    if (medplumResource.resourceType === undefined || event === "") {
        sendResponse(res, { message: ReasonPhrases.BAD_REQUEST, id: "" });
        return;
    }

    const medplumUserId =
        medplumResource?.subject?.id ?? medplumResource?.source?.id ?? medplumResource?.action?.id ?? "";

    if (medplumUserId === "") {
        console.error("Medplum user id not found in resource.");
        sendResponse(res, successfullResponse({}));
        return;
    }

    // Find the existing reward for which the event is triggered
    const reward = await db.query.rewards.findFirst({
        where(fields, operators) {
            return operators.eq(fields.event, event);
        },
        with: {
            conditions: true,
        },
    });

    if (reward === undefined) {
        console.error("Reward not found for specified event.", {
            event: event,
            resource: medplumResource.resourceType,
        });
        sendResponse(res, successfullResponse({}));
        return;
    }

    // If reward is inactive do not process the event
    if (reward.status !== RewardStatus.Active) {
        console.error("Reward is not active for specified event.", {
            event: event,
            resource: medplumResource.resourceType,
            status: reward.status,
        });
        sendResponse(res, successfullResponse({}));
        return;
    }

    // Get the latest entry for the reward claim
    const existingReward = await db.query.rewardDistributionLogs.findFirst({
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.event, event),
                operators.eq(fields.userId, medplumUserId)
            );
        },
        orderBy(fields, operators) {
            return operators.asc(fields.updatedAt);
        },
    });

    if (existingReward) {
        // Reward is already claimed
        if (reward.recurrenceCount !== -1 && existingReward.claimCount >= reward.recurrenceCount) {
            console.error("Reward has already been claimed for the maximum times.", {
                maxCount: reward.recurrenceCount,
                event: reward.event,
                userId: medplumUserId,
            });
            sendResponse(res, successfullResponse({}));
            return;
        }
    }

    const historyList = await getResourceHistory(
        medplumResource.resourceType ?? "",
        medplumResource.id ?? ""
    );

    const history = historyList.entry?.at(0);

    // Send error if history not found since history might not be updated at the time of processing so need to reprocess it.
    if (history === undefined || history.resource === undefined) {
        sendResponse(res, { message: ReasonPhrases.BAD_REQUEST, id: medplumResource.id });
        return;
    }

    // Get the data from the medplum resource in as Record
    const mappedFields = getMatchingFields(history.resource);

    if (mappedFields === undefined) {
        console.error("Unable to parse the resource. Received empty data after parsing", history.resource);
        sendResponse(res, successfullResponse({}));
        return;
    }

    // Check if all the conditions match properly and get the meta data for the result
    const matchingFieldMeta = matchConditions(mappedFields, reward.conditions as Array<RewardCondition>);

    if (!matchingFieldMeta.isOk) {
        console.error("Conditions are not satisfied for reward.", {
            event: reward.event,
            userId: medplumUserId,
        });
        sendResponse(res, successfullResponse({}));
        return;
    }

    // Generate a reward log
    const dLog = await db.insert(rewardDistributionLogs).values({
        event: reward.event,
        triggerField: matchingFieldMeta.matchingField,
        triggerValue: matchingFieldMeta.matchingValue,
        userId: medplumUserId,
        claimAmount: reward.amount,
        claimCount: existingReward && existingReward?.claimCount ? existingReward.claimCount + 1 : 1,
        status: RewardDistributionStatus.UnClaimed,
    });

    sendResponse(res, { message: ReasonPhrases.CREATED, id: dLog.insertId });
};

function getMatchingFields(resource: Resource) {
    if (resource.resourceType === "Observation") {
        const mappedFields: Record<string, any> = {};

        resource.component?.forEach((c) => {
            if (c.id) {
                mappedFields[c.id] = c.valueBoolean ?? c.valueInteger ?? c.valueString;
            }
        });

        return mappedFields;
    }
    if (resource.resourceType === "QuestionnaireResponse") {
        const mappedFields: Record<string, any> = {};
        resource.item?.forEach((c) => {
            if (c.id) {
                mappedFields[c.id] =
                    c.answer?.at(0)?.valueBoolean ??
                    c.answer?.at(0)?.valueDate ??
                    c.answer?.at(0)?.valueInteger ??
                    c.answer?.at(0)?.valueString;
            }
        });

        return mappedFields;
    }
}
function matchConditions(fields: Record<string, any>, conditions: Array<RewardCondition> = []) {
    let matchMeta = {
        matchingField: "",
        matchingValue: "",
        isOk: false,
    };

    if (conditions.length === 0) {
        matchMeta.isOk = true;
        return matchMeta;
    }

    for (const condition of conditions) {
        let truthyValue = parseStringData(condition.value);

        // Get the value from the field data
        const matchValue = fields[condition.field];

        if (matchValue === undefined) {
            continue;
        }

        let referenceValue = parseStringData(matchValue);

        if (referenceValue === null) {
            continue;
        }

        // If value is not absolute process the field from the data body
        if (!condition.isValueAbsolute) {
            // THe value which is truthy i.e the value that must be satsified. For absolute this value is mentioned in value field
            truthyValue = parseStringData(fields[condition.value]);

            // The value which is a user input variable.
            referenceValue = parseStringData(fields[condition.field] as string);

            if (truthyValue === null || referenceValue === null) {
                continue;
            }
        }

        // If the data is in date format convert them to unix timestamp for easy comparison
        if (condition.valueType === RewardConditionValueType.Date) {
            truthyValue = Date.parse(String(truthyValue));
            referenceValue = Date.parse(String(referenceValue));
        }

        const isComparatorMatch = compareValuesByComparator(
            referenceValue,
            truthyValue,
            condition.comparator
        );

        if (isComparatorMatch) {
            matchMeta = {
                isOk: true,
                matchingField: condition.field,
                matchingValue: matchValue,
            };
            break;
        }
    }

    return matchMeta;
}

function compareValuesByComparator(referenceValue: any, actualValue: any, comparator: Comparator): boolean {
    switch (comparator) {
        case Comparator.isEqual:
            if (referenceValue === actualValue) return true;
            break;
        case Comparator.isGreater:
            if (referenceValue > actualValue) return true;
            break;
        case Comparator.isGreaterOrEqual:
            if (referenceValue >= actualValue) return true;
            break;
        case Comparator.isLess:
            if (referenceValue < actualValue) return true;
            break;
        case Comparator.isLessorEqual:
            if (referenceValue <= actualValue) return true;
            break;
        default:
            return false;
    }
    return false;
}

export async function processSystemEvents(data: SystemEvent) {
    if (Object.keys(data).length === 0) {
        throw new Error("Invalid event");
    }

    const reward = await db.query.rewards.findFirst({
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.event, data.event),
                operators.eq(fields.status, RewardStatus.Active)
            );
        },
        with: {
            conditions: true,
        },
    });

    if (reward === undefined) {
        console.error("Reward not found for system event", { event: data.event });
        throw new Error("Reward not found");
    }

    const prevClaimLog = await db.query.rewardDistributionLogs.findFirst({
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.userId, data.userId),
                operators.eq(fields.event, data.event)
            );
        },
    });

    // Check if limit for recurrence has reached
    if (prevClaimLog !== undefined) {
        if (reward.recurrenceCount !== -1 && prevClaimLog.claimCount >= reward.recurrenceCount) {
            console.error("Reward has already been claimed for the maximum times.", {
                maxCount: reward.recurrenceCount,
                event: reward.event,
                userId: data.userId,
            });
            throw new Error("Reward limit exceeded");
        }
    }

    const matchMeta = matchConditions(data.data, reward.conditions as Array<RewardCondition>);

    if (!matchMeta.isOk) {
        throw new InvalidConditionError("Unsatisfied conditions for claiming a reward.");
    }

    await db
        .insert(schema.rewardDistributionLogs)
        .values({
            claimAmount: reward.amount,
            event: reward.event as RewardEvents,
            status: RewardDistributionStatus.UnClaimed,
            claimCount: Number(prevClaimLog?.claimCount ?? 0) + 1,
            triggerField: matchMeta.matchingField,
            triggerValue: matchMeta.matchingValue,
            userId: data.userId as string,
        })
        .execute();
}
