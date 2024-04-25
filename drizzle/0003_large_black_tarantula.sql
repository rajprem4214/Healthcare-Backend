CREATE TABLE `reward_conditions` (
	`event` enum('kyc_verification','whatsapp_verification') NOT NULL,
	`origin_resource` text NOT NULL,
	`field` text NOT NULL,
	`comparator` enum('==','>','<','>=','<=') NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`event` enum('kyc_verification','whatsapp_verification') NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`amount` int NOT NULL,
	`status` enum('active','inactive','archived','draft') NOT NULL DEFAULT 'draft',
	`expires_at` timestamp,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewards_id` PRIMARY KEY(`id`),
	CONSTRAINT `rewards_event_unique` UNIQUE(`event`)
);
