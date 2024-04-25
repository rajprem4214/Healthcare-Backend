import { ReasonPhrases } from 'http-status-codes';
import { Request, Response } from 'express';
import {
    errorResponse,
    sendResponse,
    successfullResponse,
} from '../../../utils/sendResponse';
import { handleTextMessage } from './helpers';
import { sendWhatsappTextMessage } from './services';


export const verifyWhatsappHookHandler = async ( req: Request, res: Response, ) => {
    const verify_token = 'Test';

    // Parse params from the webhook verification request
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    try {
        if (mode && token) {
            if (mode === "subscribe" && token === verify_token) {
                console.log("WEBHOOK_VERIFIED");
                res.status(200).send(challenge)
            } else {
                throw new Error('Whatsapp Tokens not verified')
            }
        }
    } catch (error) {
        console.error(error);
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
}

export const handleWebhookRequest = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        if (req.body.object) {
            if (
                req.body.entry &&
                req.body.entry[0].changes &&
                req.body.entry[0].changes[0] &&
                req.body.entry[0].changes[0].value.messages
            ) { 

                if (req.body.entry[0].changes[0].value.messages[0].type === 'text')
                {
                    const from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
                    const msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
                    await handleTextMessage(from, msg_body);
                }
                else if (req.body.entry[0].changes[0].value.messages[0].type === 'document')
                {
                    const from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
                    console.log('Document Received')
                    const message = 'Document Received! Thank You.'
                    await sendWhatsappTextMessage(from, message)
                } else {
                    const from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
                    const error_message = 'Irrelevant Message';
                    await sendWhatsappTextMessage(from, error_message)
                }
            }
            sendResponse(res, successfullResponse({

            }));
        } else {
            // Return a '404 Not Found' if event is not from a WhatsApp API
            throw new Error('Event not from Whatsapp API')
        }
    } catch (error) {
        sendResponse(
            res,
            errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
        );
    }
}