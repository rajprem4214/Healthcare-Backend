import { randomUUID } from 'crypto';
import { relations, sql } from 'drizzle-orm';
import {
  mysqlTable,
  bigint,
  varchar,
  tinyint,
  mysqlEnum,
  int,
  timestamp,
  text,
  serial,
} from 'drizzle-orm/mysql-core';

// TABLES
export const user = mysqlTable('user', {
  id: varchar('id', {
    length: 125, // change this when using custom user ids
  })
    .primaryKey()
    .unique(),
  fullName: varchar('full_name', {
    length: 100,
  }).notNull(),
  healthId: varchar('health_id', { length: 20 }).unique(),
  email: varchar('email', {
    length: 125,
  })
    .unique()
    .notNull(),
  emailVerified: tinyint('email_verified').default(0).notNull(),
  phoneNumber: varchar('phone_number', {
    length: 20, // adjust the length based on your requirements
  }).unique(),
  roles: mysqlEnum('roles', ['patient', 'practitioner', 'related person'])
    .default('patient')
    .notNull(), // defining roles as an enum
  projectId: varchar('project_id', {
    length: 125,
  }).notNull(),
  active: tinyint('active').default(1).notNull(), // assuming active is a boolean, you can use TINYINT(1) or BOOLEAN as well
  admin: tinyint('admin').default(0).notNull(), // assuming admin is a boolean flag indicating whether the user is an admin or not
  profilePictureUrl: text('profile_picture_url'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),

  // other user attributes
});

export const userKeys = mysqlTable('user_keys', {
  id: varchar('id', {
    length: 255,
  })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: varchar('user_id', {
    length: 125,
  })
    .notNull()
    .unique(),
  password: varchar('password', {
    length: 255,
  }),
  otp: varchar('otp', {
    length: 10,
  }),
  otpSecret: text('otp_secret'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const session = mysqlTable('user_session', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', {
    length: 128,
  }).notNull(),
  authToken: text('auth_token').notNull(),
  refreshToken: text('refresh_token'),
  expiry: timestamp('expiry').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// RELATIONS
export const userRelations = relations(user, ({ one }) => ({
  userKey: one(userKeys),
}));

export const userKeysRelation = relations(userKeys, ({ one }) => ({
  userCred: one(user, {
    fields: [userKeys.userId],
    references: [user.id],
    relationName: 'userCred',
  }),
}));
