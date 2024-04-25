import { not, relations } from 'drizzle-orm';
import {
    mysqlTable,
    varchar,
    int,
    timestamp,
    text,
    boolean,
    mysqlEnum,
    unique,
    json
} from 'drizzle-orm/mysql-core';
import { user } from './user';


type NotificationMedium = ['email' | 'whatsapp' | 'in-app'];

export const notifications = mysqlTable('notifications', {
    id: varchar('id', { length: 128 }).notNull().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    owner: varchar('owner', { length: 128 }).notNull(),
    tags: mysqlEnum('tags', ['custom', 'alert', 'social', 'event', 'system']).notNull(),
    status: mysqlEnum('status', ['active', 'sent', 'archive']),
    medium: json('medium').$type<NotificationMedium>().notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    triggerAt: timestamp('trigger_at'),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const notificationTarget = mysqlTable('notification_target', {
    id: varchar('id', { length: 128 }).notNull(),
    notificationId: varchar('notification_id', { length: 128 }).notNull().unique(),
    recipientId: varchar('recipient_id', { length: 128 }).notNull().unique(),
}, (t) => ({
    unq: unique().on(t.notificationId, t.recipientId),
}));

export const notificationTargetRelation = relations(notifications, ({ many }) => ({
    recipients: many(notificationTarget)
}));

export const targetNotificationRelation = relations(notificationTarget, ({ one }) => ({
    notification: one(notifications, {
        fields: [notificationTarget.notificationId],
        references: [notifications.id],
        relationName: 'notification',
    }),
}))

export const notificationLog = mysqlTable('notification_log', {
    id: varchar('id', { length: 128 }).notNull().primaryKey(),
    notificationId: varchar('notification_id', { length: 128 }).notNull(),
    recipientId: varchar('recipient_id', { length: 128 }).notNull(),
    status: mysqlEnum('status', ['delivered', 'failed']),
    read: boolean('read').default(false),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const notificationLogRelations = relations(notificationLog, ({ one }) => ({
    notification: one(notifications, {
        fields: [notificationLog.notificationId],
        references: [notifications.id],
        relationName: 'notification',
    }),
}));
