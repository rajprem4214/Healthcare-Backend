import { createNotification, getNotification, getNotificationsFromDB, sendCustomEmail, updateNotification } from "./emailNotifications";
import { ReasonPhrases } from 'http-status-codes';
import { Request, Response } from 'express';
import {
    errorResponse,
    sendResponse,
    successfullResponse,
} from '../../../utils/sendResponse';
import { extractPaginationParams } from "../../../utils/helper"
import { sendOtpViaWhatsApp, sendWhatsAppMessage } from "./whatsapp";

export const getNotificationsHandler = async (
    req: Request,
    res: Response,
) => {
    const pageParams = extractPaginationParams(req)
    try {
        const notifications = await getNotificationsFromDB(pageParams.limit, pageParams.offset);
        sendResponse(
            res,
            successfullResponse({
                data: notifications,
                page: pageParams.page,
                limit: pageParams.limit,
                count: notifications.length,
            })
        );
    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
};

export const getNotificationHandler = async (req: Request, res: Response) => {
    try {
        const id = req.params.notificationId;
        const notification = await getNotification(id);
        sendResponse(
            res,
            successfullResponse({
                data: notification
            })
        )
    }
    catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
}

export const createNotificationHandler = async (req: Request, res: Response) => {
    try {
        const reqBody: CreateNotificationRequestBody = req.body;
        const { name, tags, subject, medium, status, message, triggerAt } = reqBody;
        const owner = req.body.currentUser.fullName;
        await createNotification(name, tags, owner, subject, medium, status, message, triggerAt);

        sendResponse(
            res,
            successfullResponse({
                message: 'Notification created successfully'
            })
        );
    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
};

export const updateNotificationHandler = async (req: Request, res: Response) => {
    try {
        const { name, tags, subject, medium, status, message, triggerAt } = req.body;
        const id = req.params.notificationId;
        await updateNotification(id, { name, tags, subject, medium, status, message, triggerAt });

        sendResponse(
            res,
            successfullResponse({
                message: 'Notification updated successfully'
            })
        );
    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
};

export const sendCustomNotificationHandler = async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message } = req.body;

        await sendCustomEmail(name, email, subject, message);
        sendResponse(
            res,
            successfullResponse({
                message: 'Notification sent successfully'
            })
        );

    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
};

export const sendCustomWhatsappMessageHandler = async (req: Request, res: Response) => {
    try {
        const { phone, message } = req.body;

        await sendWhatsAppMessage(phone, message)
        sendResponse(
            res,
            successfullResponse({
                message: 'Whatsapp Notification sent successfully'
            })
        );

    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
};

export const sendOtpViaWhatsappHandler = async (req: Request, res: Response) => {
    try {
        const { phone, message } = req.body;

        await sendOtpViaWhatsApp(phone, message)
        sendResponse(
            res,
            successfullResponse({
                message: 'Whatsapp OTP Notification sent successfully'
            })
        );

    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
};