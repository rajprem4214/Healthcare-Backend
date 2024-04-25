CREATE TABLE `notification_log` (
	`id` varchar(128) NOT NULL,
	`notification_id` varchar(128) NOT NULL,
	`recipient_id` varchar(128) NOT NULL,
	`status` enum('delivered','failed'),
	`read` boolean DEFAULT false,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_target` (
	`id` varchar(128) NOT NULL,
	`notification_id` varchar(128) NOT NULL,
	`recipient_id` varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`owner` varchar(128) NOT NULL,
	`tags` enum('custom','alert','social','event','system') NOT NULL,
	`status` enum('active','sent','archive'),
	`medium` enum('email','whatsapp','in-app') NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`trigger_at` timestamp,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_conditions` (
	`event` enum('kyc_verification','whatsapp_verification','weight_reduction') NOT NULL,
	`field` text NOT NULL,
	`comparator` enum('==','>','<','>=','<=') NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `rewards_distribution_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`event` enum('kyc_verification','whatsapp_verification','weight_reduction') NOT NULL,
	`user_id` text NOT NULL,
	`claim_amount` int NOT NULL DEFAULT 0,
	`claim_count` int NOT NULL DEFAULT 1,
	`status` enum('claimed','unclaimed'),
	`trigger_field` text,
	`trigger_value` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewards_distribution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`event` enum('kyc_verification','whatsapp_verification','weight_reduction') NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`amount` int NOT NULL,
	`status` enum('active','inactive','archived','draft') NOT NULL DEFAULT 'draft',
	`recurrence_count` int NOT NULL DEFAULT 1,
	`origin_resource` text NOT NULL,
	`expires_at` timestamp,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewards_id` PRIMARY KEY(`id`),
	CONSTRAINT `rewards_event_unique` UNIQUE(`event`)
);
--> statement-breakpoint
CREATE TABLE `uploaded_files` (
	`id` varchar(128) NOT NULL,
	`stored_file_url` text NOT NULL,
	`file_length` int NOT NULL,
	`mime_type` varchar(150) NOT NULL,
	`access_controls` enum('read','write') NOT NULL DEFAULT 'read',
	`file_name` varchar(255) NOT NULL,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	`file_signature` varchar(255) NOT NULL,
	`uploaded_by` varchar(128),
	`is_duplicate` boolean NOT NULL,
	`linked_with` varchar(128),
	CONSTRAINT `uploaded_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_session` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`auth_token` text NOT NULL,
	`refresh_token` text,
	`expiry` timestamp NOT NULL,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(125) NOT NULL,
	`full_name` varchar(100) NOT NULL,
	`health_id` varchar(20),
	`email` varchar(125) NOT NULL,
	`email_verified` tinyint NOT NULL DEFAULT 0,
	`phone_number` varchar(20),
	`roles` enum('patient','practitioner','related person') NOT NULL DEFAULT 'patient',
	`project_id` varchar(125) NOT NULL,
	`active` tinyint NOT NULL DEFAULT 1,
	`admin` tinyint NOT NULL DEFAULT 0,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_id_unique` UNIQUE(`id`),
	CONSTRAINT `user_health_id_unique` UNIQUE(`health_id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`),
	CONSTRAINT `user_phone_number_unique` UNIQUE(`phone_number`)
);
--> statement-breakpoint
CREATE TABLE `user_keys` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(125) NOT NULL,
	`password` varchar(255),
	`otp` varchar(10),
	`otp_secret` text,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_keys_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `on_chain_transactions` (
	`id` varchar(255),
	`gas_used` bigint NOT NULL DEFAULT 0,
	`transaction_status` int,
	`transaction_data` json,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `on_chain_transactions_id_unique` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_wallets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`wallet_address` text NOT NULL,
	`encrypted_seed` text NOT NULL,
	`encrypted_private_key` text NOT NULL,
	`seed_verified` boolean DEFAULT false,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_wallets_user_id_unique` UNIQUE(`user_id`)
);
