import { Novu } from '@novu/node';
import { env } from '../config/env';

const NOVU_API_KEY = env.NOVU_API_KEY as string;

const novu = new Novu(NOVU_API_KEY);

export const sendOTPByEmail = async (email: string, otp: string) => {

    await novu.trigger('otp-flow', {
        to: {
            subscriberId: email,
            email: email
        },
        payload: {
            otp: otp
        }
    });

};