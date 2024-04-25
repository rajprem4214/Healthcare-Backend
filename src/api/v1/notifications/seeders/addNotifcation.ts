import { db } from '../../../../config/database'
import { schema } from '../../../../db'
import { randomUUID } from 'crypto';


// Example Usage - Execute this command
//  ts-node src\api\v1\notifications\seeders\addNotifcation.ts


type NotificationMedium = ['email' | 'whatsapp' | 'in-app'];
const name = 'WELCOME-EMAIL';
const tags = 'system';
const owner = 'prem raj';
const subject = 'Welcome to Uwell';
const medium: NotificationMedium = ['email'];
const status = 'active';
const message = 'Test Message';
const triggerAt = null;


export async function createNotificationManual(name: string, tags: 'custom' | 'alert' | 'social' | 'event' | 'system', owner: string, subject: string, medium: NotificationMedium, status: 'active' | 'sent' | 'archive', message: string, triggerAt: string | null) {
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
            triggerAt: triggerTime
        })
    } catch (error) {
        console.log(error);
        throw new Error('Error in creating notification')
    }
}

createNotificationManual(name, tags, owner, subject, medium, status, message, triggerAt);