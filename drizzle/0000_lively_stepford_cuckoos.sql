CREATE TABLE `children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`grade` int NOT NULL DEFAULT 1,
	`avatar` varchar(50),
	`pin` varchar(4),
	`difficultyLevel` int NOT NULL DEFAULT 1,
	`totalStars` int NOT NULL DEFAULT 0,
	`totalSessions` int NOT NULL DEFAULT 0,
	`totalProblems` int NOT NULL DEFAULT 0,
	`totalCorrect` int NOT NULL DEFAULT 0,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastSessionDate` varchar(10),
	`crossingTenCorrect` int NOT NULL DEFAULT 0,
	`crossingTenTotal` int NOT NULL DEFAULT 0,
	`badges` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `children_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalProblems` int NOT NULL,
	`correctAnswers` int NOT NULL,
	`accuracy` int NOT NULL,
	`averageTime` int NOT NULL,
	`starsEarned` int NOT NULL,
	`difficultyLevel` int NOT NULL,
	`crossingTenCorrect` int NOT NULL DEFAULT 0,
	`crossingTenTotal` int NOT NULL DEFAULT 0,
	`problemDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
