CREATE TABLE IF NOT EXISTS `payroll_records` (
  `id` varchar(128) NOT NULL,
  `kind` varchar(16) NOT NULL,
  `period` varchar(7) NOT NULL,
  `employeeId` varchar(36) DEFAULT NULL,
  `payload` json NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
