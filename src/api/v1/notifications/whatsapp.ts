import axios, {AxiosResponse} from 'axios';
import { env } from '../../../config/env';

const phoneNumberID = env.WA_PHONE_NUMBER_ID
const accessToken = env.WA_ACCESS_TOKEN


export async function sendOtpViaWhatsApp(phone: string, otp: string): Promise<void> {
    const sendMessageURL = `https://graph.facebook.com/v17.0/${phoneNumberID}/messages`;

    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    };

    const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
            body: `Your OTP is ${otp}`,
        },
    };

    axios.post(sendMessageURL, payload, config)
        .then((response: AxiosResponse) => {
            console.log('Message sent successfully:', response.data);
        })
        .catch((error) => {
            console.error('Error sending message:', error.message);
        });
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
    const sendMessageURL = `https://graph.facebook.com/v17.0/${phoneNumberID}/messages`;
    phone = '91' + phone;
    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    };

    const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
            body: message,
        },
    };

    axios.post(sendMessageURL, payload, config)
        .then((response: AxiosResponse) => {
            console.log('Message sent successfully:', response.data);
        })
        .catch((error) => {
            console.error('Error sending message:', error.message);
        });
}
