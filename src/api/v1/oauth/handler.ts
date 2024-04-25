import { NextFunction, Request, Response } from 'express';
import {
    errorResponse,
    sendResponse,
    successfullResponse,
} from '../../../utils/sendResponse';
import { createGoogleUser, getGoogleOAuthTokens, getGoogleUser } from './googleOauth';
import { env } from '../../../config/env';
import { OperationOutcome, ProjectMembership } from '@medplum/fhirtypes';
import { medplum } from '../../../config/medplum';
import { db } from '../../../config/database';
import { createLoginCreds } from '../auth/user';


export const googleOauthSignUpHandler = async (req: Request, res: Response) => {
    const code = req.query.code as string;
    try {
        const { id_token, access_token } = await getGoogleOAuthTokens({ code });
        console.log({ id_token, access_token });

        const googleUser = await getGoogleUser({ id_token, access_token });

        console.log({ googleUser });

        if (!googleUser.verified_email) {
            throw new Error('Google Email is not verified');
        }

        const existingUser = await db.query.user.findFirst({
            where(fields, operators) {
                return operators.eq(fields.email, googleUser.email);
            },
        });

        if (!existingUser) {
            const separateFullName = (fullName: string) => ({ firstName: fullName.split(" ")[0], lastName: fullName.split(" ").slice(1).join(" ") });

            const { firstName, lastName } = separateFullName(googleUser.name);

            const medplumPatient: ProjectMembership | OperationOutcome =
                await medplum.invite(process.env.PROJECT_ID!, {
                    resourceType: 'Patient',
                    firstName: firstName,
                    lastName: lastName,
                    email: googleUser.email,
                    sendEmail: false,
                });

            if (medplumPatient.resourceType === 'ProjectMembership') {
                const projectId = medplumPatient.project?.reference?.replaceAll(
                    'Project/',
                    ''
                );
                const userId = medplumPatient.user?.reference?.replaceAll('User/', '');

                const googleUserDetails = await createGoogleUser({
                    fullName: firstName + ' ' + lastName,
                    email: googleUser.email,
                    googleId: googleUser.id,
                    role: 'patient',
                    projectId,
                    userId,
                });

                const loginDetails: {
                    accessToken: string;
                    expiry: Date;
                    refreshToken?: string;
                } = await createLoginCreds(googleUserDetails.userId);


                sendResponse(
                    res,
                    successfullResponse({ ...loginDetails, user: googleUserDetails.userId, email: googleUserDetails.email })
                );
            }
        } else {
            const loginDetails: {
                accessToken: string;
                expiry: Date;
                refreshToken?: string;
            } = await createLoginCreds(existingUser.id);

            sendResponse(
                res,
                successfullResponse({ ...loginDetails, user: existingUser.id, email: existingUser.email })
            );
        }


    } catch (error) {
        console.log(error)
        throw new Error('Error in Google OAuth Handler')
    }
}

