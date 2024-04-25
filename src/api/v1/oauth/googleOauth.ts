import qs from "qs";
import axios from "axios";
import { env } from "../../../config/env";
import { randomUUID } from "crypto";
import { db } from '../../../config/database';
import { schema } from '../../../db';
import { addNewSubscriber, sendWelcomeEmail } from "../notifications/emailNotifications";

interface GoogleTokensResult {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    id_token: string;
}


export async function getGoogleOAuthTokens({
    code,
}: {
    code: string;
}): Promise<GoogleTokensResult> {
    const url = "https://oauth2.googleapis.com/token";

    const values = {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URL,
        grant_type: "authorization_code",
    };

    try {
        const res = await axios.post<GoogleTokensResult>(
            url,
            qs.stringify(values),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        return res.data;
    } catch (error: any) {
        console.error(error.response.data.error);
        throw new Error('Failed to fetch Google Oauth Tokens');
    }
}

interface GoogleUserResult {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

export async function getGoogleUser({
    id_token,
    access_token,
}: { id_token: any, access_token: any }): Promise<GoogleUserResult> {
    try {
        const res = await axios.get<GoogleUserResult>(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
            {
                headers: {
                    Authorization: `Bearer ${id_token}`,
                },
            }
        );
        return res.data;
    } catch (error: any) {
        throw new Error("Error fetching Google user");
    }
}

export const createGoogleUser = async (
    googleUserDetails: googleUserDetails
): Promise<googleUserDetails & { userId: string }> => {
    //
    const {
        fullName,
        email,
        googleId,
        projectId = randomUUID(),
        userId = randomUUID(),
    } = googleUserDetails;

    await db.transaction(async (tx) => {
        try {
            await tx.insert(schema.user).values({
                id: userId,
                email: email,
                fullName: fullName,
                projectId: projectId,
                roles: 'patient',
                active: 1,
                admin: 0,
            });
            // await tx.insert(schema.userKeys).values({
            //     id: randomUUID(),
            //     userId: userId,
            // });
            await addNewSubscriber(email, userId, fullName);
            await sendWelcomeEmail(userId, fullName);
        } catch (err) {
            console.error(err);
            tx.rollback();
            throw Error('Unable to create user');
        }
        return;
    });

    return { ...googleUserDetails, userId };
};
