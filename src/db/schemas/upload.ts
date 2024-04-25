import { relations } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  text,
  boolean,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { user } from './user';

export const uploadedFiles = mysqlTable('uploaded_files', {
  id: varchar('id', {
    length: 128,
  })
    .notNull()
    .primaryKey(),
  storedFileUrl: text('stored_file_url').notNull(),
  fileLength: int('file_length').notNull(),
  mimeType: varchar('mime_type', {
    length: 150,
  }).notNull(),
  accessControls: mysqlEnum('access_controls', ['read', 'write'])
    .default('read')
    .notNull(),
  fileName: varchar('file_name', {
    length: 255,
  }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),
  fileSignature: varchar('file_signature', {
    length: 255,
  }).notNull(),
  uploadedBy: varchar('uploaded_by', {
    length: 128,
  }),
  isDuplicate: boolean('is_duplicate').notNull(),
  linkedWith: varchar('linked_with', {
    length: 128,
  }),
 uploadTopic:text("upload_topic"),
 uploadTopicResourceId:text("upload_topic_resource_id")
  
});

export const uploadsRelation = relations(uploadedFiles, ({ one }) => ({
  originalFile: one(uploadedFiles, {
    fields: [uploadedFiles.linkedWith],
    references: [uploadedFiles.id],
    relationName: 'original_file',
  }),
  owner: one(user, {
    fields: [uploadedFiles.uploadedBy],
    references: [user.id],
    relationName: 'owner',
  }),
}));
