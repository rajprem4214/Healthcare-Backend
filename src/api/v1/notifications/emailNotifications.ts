import { db } from "../../../config/database";
import { novu } from "./index";
import { schema } from "../../../db";
import { randomUUID } from "crypto";
import * as NotificationConstants from "./notificationConstants";
import { TriggerRecipientsTypeEnum } from "@novu/node";
import { eq, and, ne } from "drizzle-orm";
import axios from "axios";
import { setInterval } from "timers";

export const addNotificationTarget = async (notificationId: string, userId: string) => {
    try {
        const existingEntry = await db
            .select()
            .from(schema.notificationTarget)
            .where(
                and(
                    eq(schema.notificationTarget.notificationId, notificationId),
                    eq(schema.notificationTarget.recipientId, userId)
                )
            );

        if (existingEntry.length > 0) {
            console.log("Entry already exists for notificationId and userId. Skipping insertion.");
            return;
        }
        await db.insert(schema.notificationTarget).values({
            id: randomUUID(),
            notificationId: notificationId,
            recipientId: userId,
        });
    } catch (error) {
        console.log(error);
        throw new Error("Error in adding Notification Target");
    }
};

type NotificationMedium = ["email" | "whatsapp" | "in-app"];

export const createNotification = async (
    name: string,
    tags: "custom" | "alert" | "social" | "event" | "system",
    owner: string,
    subject: string,
    medium: NotificationMedium,
    status: "active" | "sent" | "archive",
    message: string,
    triggerAt: string | null
) => {
    try {
        const triggerTime = triggerAt != null ? new Date(triggerAt) : null;
        await db.insert(schema.notifications).values({
            id: randomUUID(),
            name: name,
            owner: owner,
            tags: tags,
            subject: subject,
            medium: medium,
            status: status,
            message: message,
            triggerAt: triggerTime,
        });
    } catch (error) {
        console.log(error);
        throw new Error("Error in creating notification");
    }
};

export const updateNotification = async (
    id: string,
    updateInfo: {
        name?: string;
        tags?: "custom" | "alert" | "social" | "event" | "system";
        subject?: string;
        medium?: NotificationMedium[];
        status?: "active" | "sent" | "archive";
        message?: string;
        triggerAt?: string | null;
    }
) => {
    try {
        const existingNotification = await db.query.notifications.findFirst({
            where(fields, operators) {
                return operators.eq(fields.id, id);
            },
        });

        if (!existingNotification) {
            throw new Error("Notification not found");
        }

        const updatedFields: { [key: string]: any } = {};

        if (updateInfo.name !== undefined) {
            updatedFields.name = updateInfo.name;
        }

        if (updateInfo.tags !== undefined) {
            updatedFields.tags = updateInfo.tags;
        }

        if (updateInfo.subject !== undefined) {
            updatedFields.subject = updateInfo.subject;
        }

        if (updateInfo.medium !== undefined) {
            updatedFields.medium = updateInfo.medium;
        }

        if (updateInfo.status !== undefined) {
            updatedFields.status = updateInfo.status;
        }

        if (updateInfo.message !== undefined) {
            updatedFields.message = updateInfo.message;
        }

        if (updateInfo.triggerAt !== undefined) {
            updatedFields.triggerAt = updateInfo.triggerAt != null ? new Date(updateInfo.triggerAt) : null;
        }

        await db.update(schema.notifications).set(updatedFields).where(eq(schema.notifications.id, id));
    } catch (error) {
        console.log(error);
        throw new Error("Error in updating notification");
    }
};

export const getNotificationsFromDB = async (limit: number, offset: number) => {
    try {
        const notifications = await db.query.notifications.findMany({
            limit: limit,
            offset: offset,
            where: ne(schema.notifications.tags, "system"),
        });
        return notifications;
    } catch (error) {
        console.log(error);
        throw new Error("Error in fetching all notifications from DB");
    }
};

export const getNotification = async (id: string) => {
    try {
        const notification = await db.query.notifications.findFirst({
            where: eq(schema.notifications.id, id),
        });
        return notification;
    } catch (error) {
        console.log(error);
        throw new Error("Error in fetching this notification from DB");
    }
};

export const addNotificationLog = async (
    notificationId: string,
    userId: string,
    status: "delivered" | "failed"
) => {
    try {
        await db.insert(schema.notificationLog).values({
            id: randomUUID(),
            notificationId: notificationId,
            read: false,
            status: status,
            recipientId: userId,
        });
    } catch (error) {
        console.log(error);
        throw new Error("Error in adding notification log");
    }
};

export const sendCustomEmail = async (notiName: string, email: string, subject: string, message: string) => {
    const user = await db.query.user.findFirst({
        where(fields, operators) {
            return operators.eq(fields.email, email);
        },
    });

    const notification = await db.query.notifications.findFirst({
        where(fields, operators) {
            return operators.eq(fields.name, notiName);
        },
    });
    if (notification === undefined) {
        throw new Error("Notification not found");
    }
    try {
        if (notification) {
            const sendCustomEmailPromise = (async () => {
                try {
                    const result = await novu.trigger(NotificationConstants.CUSTOM_TEMPLATE, {
                        to: {
                            subscriberId: user?.id as string,
                        },
                        payload: {
                            message: message,
                        },
                        overrides: {
                            email: {
                                text: subject,
                            },
                        },
                    });

                    const transactionId = await result?.data?.data?.transactionId;
                    return transactionId;
                } catch (error) {
                    console.error(error);
                    throw new Error("Error sending custom email");
                }
            })();
            const deliveryStatusPromise = sendCustomEmailPromise.then(async (transactionId) => {
                return pollDeliveryStatus(transactionId, notification, user?.id as string);
            });

            const deliveryStatusResult = await deliveryStatusPromise;
            console.log("delivery status result", deliveryStatusResult);
        }
    } catch (error) {
        await addNotificationLog(notification?.id as string, user?.id as string, "failed");
        console.error(error);
        throw new Error("Error sending Custom email");
    }
};

export const sendOTPByEmail = async (email: string, otp: string) => {
    const user = await db.query.user.findFirst({
        where(fields, operators) {
            return operators.eq(fields.email, email);
        },
    });

    const notification = await db.query.notifications.findFirst({
        where(fields, operators) {
            return operators.eq(fields.name, NotificationConstants.OTP_EMAIL_NAME);
        },
    });
    if (notification === undefined) {
        throw new Error("Notification not found");
    }
    try {
        const sendOTPPromise = (async () => {
            try {
                const result = await novu.trigger(NotificationConstants.OTP_TEMPLATE, {
                    to: {
                        subscriberId: user?.id as string,
                    },
                    payload: {
                        otp: otp,
                    },
                });

                const transactionId = await result?.data?.data?.transactionId;
                return transactionId;
            } catch (error) {
                console.error(error);
                throw new Error("Error sending otp email");
            }
        })();

        const deliveryStatusPromise = sendOTPPromise.then(async (transactionId) => {
            return pollDeliveryStatus(transactionId, notification, user?.id as string);
        });

        const deliveryStatusResult = await deliveryStatusPromise;
        console.log("delivery status result", deliveryStatusResult);
    } catch (error) {
        await addNotificationLog(notification?.id as string, user?.id as string, "failed");
        console.error(error);
        throw new Error("Error sending otp email");
    }
};

export const addNewSubscriber = async (email: string, userId: string, fullName: string) => {
    const [firstName, lastName] = fullName.split(" ");
    try {
        await novu.subscribers.identify(userId, {
            email: email,
            firstName: firstName,
            lastName: lastName,
        });
    } catch (error) {
        console.log(error);
        throw new Error("Error in adding new subscriber");
    }
};

export const sendWelcomeEmail = async (userId: string, fullName: string) => {
    const [firstName, lastName] = fullName.split(" ");

    const notification = await db.query.notifications.findFirst({
        where(fields, operators) {
            return operators.eq(fields.name, NotificationConstants.WELCOME_EMAIL_NAME);
        },
    });

    if (notification === undefined) {
        throw new Error("Notification not found");
    }

    try {
        const sendWelcomeEmailPromise = (async () => {
            try {
                const result = await novu.trigger(NotificationConstants.WELCOME_TEMPLATE, {
                    to: {
                        subscriberId: userId,
                    },
                    payload: {
                        firstName: firstName,
                    },
                });

                const transactionId = await result?.data?.data?.transactionId;
                return transactionId;
            } catch (error) {
                console.error(error);
                throw new Error("Error sending welcome email");
            }
        })();
        const deliveryStatusPromise = sendWelcomeEmailPromise.then(async (transactionId) => {
            return pollDeliveryStatus(transactionId, notification, userId);
        });

        const deliveryStatusResult = await deliveryStatusPromise;
        console.log("delivery status result", deliveryStatusResult);
    } catch (error) {
        await addNotificationLog(notification?.id as string, userId, "failed");
        console.error(error);
        throw new Error("Error sending welcome email");
    }
};

export const createNotificationGroup = async (key: string, name: string) => {
    try {
        await novu.topics.create({
            key: key,
            name: name,
        });
    } catch (error) {
        console.error(error);
        throw new Error("Error creating Notification Group");
    }
};

export const addSubscribersToNotificationGroup = async (topicKey: string, subscriberIds: string[]) => {
    try {
        const response = await novu.topics.addSubscribers(topicKey, {
            subscribers: subscriberIds,
        });
        return response;
    } catch (error) {
        console.error(error);
        throw new Error("Error adding subscribers to notification group");
    }
};

export const removeSubscribersFromNotificationGroup = async (topicKey: string, subscriberIds: string[]) => {
    try {
        const response = await novu.topics.removeSubscribers(topicKey, {
            subscribers: subscriberIds,
        });
        return response;
    } catch (error) {
        console.error(error);
        throw new Error("Error removing subscribers from notification group");
    }
};

export const triggerNotificationGroup = async (workflowTriggerIdentifier: string, topicKey: string) => {
    try {
        await novu.trigger(workflowTriggerIdentifier, {
            to: [{ type: TriggerRecipientsTypeEnum.TOPIC, topicKey: topicKey }],
            payload: {},
        });
    } catch (error) {
        console.error(error);
        throw new Error("Error triggering workflow to notification group");
    }
};

export const triggerMultipleNotificationGroups = async (
    workflowTriggerIdentifier: string,
    topicKeys: string[]
) => {
    try {
        await novu.trigger(workflowTriggerIdentifier, {
            to: topicKeys.map((topicKey) => ({ type: TriggerRecipientsTypeEnum.TOPIC, topicKey: topicKey })),
            payload: {},
        });
    } catch (error) {
        console.error(error);
        throw new Error("Error triggering workflow to multiple notification groups");
    }
};

async function checkDeliveryStatus(transactionId: string) {
    const result = await axios.get("https://api.novu.co/v1/notifications", {
        headers: {
            Authorization: `ApiKey ${process.env.NOVU_API_KEY}`,
        },
        params: {
            transactionId: transactionId,
        },
    });

    const latestExecutionDetailStatus =
        result?.data?.data[0]?.jobs[0]?.executionDetails?.slice(-1)[0]?.status;

    return latestExecutionDetailStatus;
}

async function pollDeliveryStatus(transactionId: string, notification: any, userId: string) {
    const intervalId = setInterval(async () => {
        const status = await checkDeliveryStatus(transactionId);
        switch (status) {
            case "Success":
                await addNotificationTarget(notification?.id, userId);
                await addNotificationLog(notification?.id, userId, "delivered");
                clearInterval(intervalId);
                return "delivered";
            case "Pending":
                return;
            case "Running":
                return;
            case "Failed":
                await addNotificationLog(notification?.id as string, userId as string, "failed");
                clearInterval(intervalId);
                return "failed";
            default:
                return;
        }
    }, 4000);
}
