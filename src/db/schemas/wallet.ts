import { relations } from 'drizzle-orm';
import {
  int,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
  bigint,
  boolean,
  json,
} from 'drizzle-orm/mysql-core';
import { user } from './user';

export const userWallets = mysqlTable('user_wallets', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', {
    length: 255,
  })
    .notNull()
    .unique(),
  walletAddress: text('wallet_address').notNull(),
  encryptedSeed: text('encrypted_seed').notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),
  seedVerified: boolean('seed_verified').default(false),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const onChainTransactions = mysqlTable('on_chain_transactions', {
  id: varchar('id', {
    length: 255,
  }).unique(),
  gasUsed: bigint('gas_used', { mode: 'number' }).notNull().default(0),
  transactionStatus: int('transaction_status'),
  transactionData: json('transaction_data'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userWalletRelations = relations(user, ({ one }) => ({
  wallet: one(userWallets),
}));

export const walletUserRelations = relations(userWallets, ({ one }) => ({
  wallet: one(user, {
    fields: [userWallets.userId],
    references: [user.id],
    relationName: 'wallet',
  }),
}));
