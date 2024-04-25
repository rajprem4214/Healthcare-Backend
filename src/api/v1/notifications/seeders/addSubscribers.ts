import { novu } from '../index'

const subscriberId = 'bab273ce-4b27-46dc-9d35-6845f344fab8'; // This is User ID
const email = 'vedantgandhipersonal@gmail.com';
const firstName = 'Vedant';
const lastName = 'Gandhi';

// Example Usage - Execute this commmand
//   ts-node src\api\v1\notifications\seeders\addSubscribers.ts

async function addSubscriber(subscriberId: string, email: string, firstName: string, lastName: string) {
    try {
        await novu.subscribers.identify(subscriberId, {
            email: email,
            firstName: firstName,
            lastName: lastName,
        });

        console.log(`Subscriber added successfully with ID: ${subscriberId}`);
    } catch (error) {
        console.error('Error adding subscriber:', error);
    }
}

addSubscriber(subscriberId, email, firstName, lastName);