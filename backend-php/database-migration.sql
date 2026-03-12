-- Database Migration for Partner Signup System
-- Run this SQL to create required tables

-- Table for OTP verifications
CREATE TABLE IF NOT EXISTS `otp_verifications` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL,
  `otp` VARCHAR(255) NOT NULL,
  `verified` TINYINT(1) DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone_unique` (`phone`),
  KEY `phone_verified` (`phone`, `verified`),
  KEY `expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for partner signups
CREATE TABLE IF NOT EXISTS `partner_signups` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `business_type` VARCHAR(50) NOT NULL,
  `business_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `owner_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `delivery_types` TEXT NOT NULL,
  `comments` TEXT,
  `status` ENUM('pending', 'contacted', 'onboarding', 'active', 'rejected') DEFAULT 'pending',
  `assigned_to` INT(11) UNSIGNED DEFAULT NULL,
  `notes` TEXT,
  `onboarded_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email` (`email`),
  KEY `phone` (`phone`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking partner communication
CREATE TABLE IF NOT EXISTS `partner_communications` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` INT(11) UNSIGNED NOT NULL,
  `type` ENUM('email', 'phone', 'whatsapp', 'meeting', 'note') NOT NULL,
  `subject` VARCHAR(255),
  `message` TEXT,
  `sent_by` INT(11) UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `partner_id` (`partner_id`),
  KEY `type` (`type`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `fk_partner_communications_partner` FOREIGN KEY (`partner_id`) REFERENCES `partner_signups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking email deliveries
CREATE TABLE IF NOT EXISTS `email_logs` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `to_email` VARCHAR(255) NOT NULL,
  `from_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body` TEXT,
  `status` ENUM('sent', 'failed', 'bounced') DEFAULT 'sent',
  `response` TEXT,
  `related_type` VARCHAR(50),
  `related_id` INT(11) UNSIGNED,
  `sent_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `to_email` (`to_email`),
  KEY `related` (`related_type`, `related_id`),
  KEY `sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for SMS logs
CREATE TABLE IF NOT EXISTS `sms_logs` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `to_phone` VARCHAR(20) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('sent', 'failed', 'delivered', 'undelivered') DEFAULT 'sent',
  `provider` VARCHAR(50) DEFAULT 'twilio',
  `provider_message_id` VARCHAR(100),
  `response` TEXT,
  `related_type` VARCHAR(50),
  `related_id` INT(11) UNSIGNED,
  `sent_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `to_phone` (`to_phone`),
  KEY `provider_message_id` (`provider_message_id`),
  KEY `related` (`related_type`, `related_id`),
  KEY `sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample admin user (optional - for testing)
-- You can customize this based on your existing users table
-- CREATE TABLE IF NOT EXISTS `users` (
--   `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
--   `name` VARCHAR(255) NOT NULL,
--   `email` VARCHAR(255) NOT NULL,
--   `role` ENUM('admin', 'manager', 'partner') DEFAULT 'partner',
--   `created_at` DATETIME NOT NULL,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `email_unique` (`email`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing (optional)
-- INSERT INTO `partner_signups` (business_type, business_name, phone, owner_name, email, delivery_types, status, created_at)
-- VALUES
-- ('restaurant', 'Demo Pizza Place', '+15551234567', 'John Demo', 'demo@example.com', 'self-delivery,uber-eats', 'pending', NOW());

-- Indexes for better performance
CREATE INDEX idx_partner_status_created ON partner_signups(status, created_at DESC);
CREATE INDEX idx_otp_phone_expires ON otp_verifications(phone, expires_at DESC);

-- View for partner dashboard summary
CREATE OR REPLACE VIEW partner_summary AS
SELECT
    status,
    COUNT(*) as count,
    DATE(created_at) as signup_date
FROM partner_signups
GROUP BY status, DATE(created_at)
ORDER BY signup_date DESC, status;

-- Cleanup old OTP records (run this periodically)
-- DELETE FROM otp_verifications WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY);
