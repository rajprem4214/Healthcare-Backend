import { mysqlTable, mysqlSchema, AnyMySqlColumn, unique, varchar, bigint, int, json, timestamp, mysqlEnum, text, primaryKey, serial, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


export const onChainTransactions = mysqlTable("on_chain_transactions", {
	id: varchar("id", { length: 255 }),
	gasUsed: bigint("gas_used", { mode: "number" }).notNull(),
	transactionStatus: int("transaction_status"),
	transactionData: json("transaction_data"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		onChainTransactionsIdUnique: unique("on_chain_transactions_id_unique").on(table.id),
	}
});

export const rewardConditions = mysqlTable("reward_conditions", {
	event: mysqlEnum("event", ['kyc_verification']).notNull(),
	dataSource: mysqlEnum("data_source", ['self_db','medplum']).notNull(),
	originResource: text("origin_resource").notNull(),
	field: text("field").notNull(),
	comparator: mysqlEnum("comparator", ['==','>','<','>=','<=']).notNull(),
	value: text("value").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const rewards = mysqlTable("rewards", {
	id: serial("id").notNull(),
	event: mysqlEnum("event", ['kyc_verification']),
	title: text("title").notNull(),
	description: text("description").notNull(),
	amount: int("amount").notNull(),
	status: mysqlEnum("status", ['active','inactive','archived','draft']),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		rewardsIdPk: primaryKey({ columns: [table.id], name: "rewards_id_pk"}),
		id: unique("id").on(table.id),
		rewardsEventUnique: unique("rewards_event_unique").on(table.event),
	}
});

export const uploadedFiles = mysqlTable("uploaded_files", {
	id: varchar("id", { length: 128 }).notNull(),
	storedFileUrl: text("stored_file_url").notNull(),
	fileLength: int("file_length").notNull(),
	mimeType: varchar("mime_type", { length: 150 }).notNull(),
	accessControls: mysqlEnum("access_controls", ['read','write']).default('read').notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	fileSignature: varchar("file_signature", { length: 255 }).notNull(),
	uploadedBy: varchar("uploaded_by", { length: 128 }),
	isDuplicate: tinyint("is_duplicate").notNull(),
	linkedWith: varchar("linked_with", { length: 128 }),
},
(table) => {
	return {
		uploadedFilesIdPk: primaryKey({ columns: [table.id], name: "uploaded_files_id_pk"}),
	}
});

export const user = mysqlTable("user", {
	id: varchar("id", { length: 125 }).notNull(),
	fullName: varchar("full_name", { length: 100 }).notNull(),
	healthId: varchar("health_id", { length: 20 }),
	email: varchar("email", { length: 125 }).notNull(),
	emailVerified: tinyint("email_verified").default(0).notNull(),
	phoneNumber: varchar("phone_number", { length: 20 }),
	roles: mysqlEnum("roles", ['patient','practitioner','related person']).default('patient').notNull(),
	projectId: varchar("project_id", { length: 125 }).notNull(),
	active: tinyint("active").default(1).notNull(),
	admin: tinyint("admin").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userIdPk: primaryKey({ columns: [table.id], name: "user_id_pk"}),
		userIdUnique: unique("user_id_unique").on(table.id),
		userEmailUnique: unique("user_email_unique").on(table.email),
		userHealthIdUnique: unique("user_health_id_unique").on(table.healthId),
		userPhoneNumberUnique: unique("user_phone_number_unique").on(table.phoneNumber),
	}
});

export const userKeys = mysqlTable("user_keys", {
	id: varchar("id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 125 }).notNull(),
	password: varchar("password", { length: 255 }),
	otp: varchar("otp", { length: 10 }),
	otpSecret: text("otp_secret"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userKeysIdPk: primaryKey({ columns: [table.id], name: "user_keys_id_pk"}),
		userKeysUserIdUnique: unique("user_keys_user_id_unique").on(table.userId),
	}
});

export const userSession = mysqlTable("user_session", {
	id: serial("id").notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	authToken: text("auth_token").notNull(),
	refreshToken: text("refresh_token"),
	expiry: timestamp("expiry", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userSessionIdPk: primaryKey({ columns: [table.id], name: "user_session_id_pk"}),
		id: unique("id").on(table.id),
	}
});

export const userWallets = mysqlTable("user_wallets", {
	id: serial("id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	walletAddress: text("wallet_address").notNull(),
	encryptedSeed: text("encrypted_seed").notNull(),
	encryptedPrivateKey: text("encrypted_private_key").notNull(),
	seedVerified: tinyint("seed_verified").default(0),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userWalletsIdPk: primaryKey({ columns: [table.id], name: "user_wallets_id_pk"}),
		id: unique("id").on(table.id),
		userWalletsUserIdUnique: unique("user_wallets_user_id_unique").on(table.userId),
	}
});