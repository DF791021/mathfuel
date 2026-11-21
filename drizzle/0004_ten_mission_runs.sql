CREATE TABLE `missionRuns` (
	`id` varchar(36) NOT NULL,
	`studentId` int NOT NULL,
	`missionId` enum('make-ten','bridge-ten') NOT NULL,
	`activeKey` varchar(64),
	`contentVersion` int NOT NULL DEFAULT 1,
	`revision` int NOT NULL DEFAULT 0,
	`status` enum('in_progress','completed') NOT NULL DEFAULT 'in_progress',
	`state` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `missionRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `missionRuns_activeKey_unique` UNIQUE(`activeKey`)
);
