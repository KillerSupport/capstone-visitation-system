-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: bjmp_visitation
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `bjmp_visitation`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `bjmp_visitation` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `bjmp_visitation`;

--
-- Table structure for table `account_change_requests`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_change_requests` (
  `user_id` int(11) NOT NULL,
  `payload` longtext NOT NULL,
  `proofs` longtext NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `account_change_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `announcements`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcements` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `level` varchar(20) NOT NULL DEFAULT 'info',
  `posted_by` varchar(200) NOT NULL,
  `created_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appointment_notifications`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointment_notifications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `appointment_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `channel` varchar(10) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `provider_id` varchar(255) DEFAULT NULL,
  `last_error` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_appointment_channel` (`appointment_id`,`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appointments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointments` (
  `id` varchar(100) NOT NULL,
  `appointment_reference` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `visitor_contact` varchar(50) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `pdl_name` varchar(255) NOT NULL,
  `pdl_number` varchar(100) NOT NULL,
  `jail_facility_id` varchar(100) NOT NULL,
  `jail_facility_name` varchar(200) NOT NULL,
  `cell_dormitory` varchar(200) NOT NULL,
  `visit_type` varchar(100) NOT NULL,
  `relationship_to_pdl` varchar(100) NOT NULL,
  `visit_date` date NOT NULL,
  `time_slot` varchar(100) NOT NULL,
  `paabot_items_description` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Approved',
  `created_at` datetime NOT NULL,
  `qr_token` varchar(255) NOT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  `companions` longtext DEFAULT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  `schedule_version` int(11) NOT NULL DEFAULT 0,
  `selection_mode` varchar(20) NOT NULL DEFAULT 'LEGACY',
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_reference` (`appointment_reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `actor_user_id` int(11) DEFAULT NULL,
  `actor_role` varchar(30) NOT NULL,
  `action` varchar(80) NOT NULL,
  `target_type` varchar(40) NOT NULL,
  `target_id` varchar(100) DEFAULT NULL,
  `result` varchar(30) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_target` (`target_type`,`target_id`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_otps`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_otps` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `purpose` varchar(30) NOT NULL,
  `code_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_otp_lookup` (`user_id`,`purpose`,`created_at`),
  CONSTRAINT `auth_otps_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_sessions` (
  `token_hash` char(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_hash`),
  KEY `idx_session_user` (`user_id`),
  CONSTRAINT `auth_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feature_migrations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feature_migrations` (
  `version` varchar(100) NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gate_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gate_logs` (
  `id` varchar(100) NOT NULL,
  `appointment_id` varchar(100) DEFAULT NULL,
  `user_id` varchar(100) NOT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `pdl_name` varchar(255) NOT NULL,
  `facility_id` varchar(100) NOT NULL,
  `guard_officer` varchar(200) NOT NULL,
  `action` varchar(50) NOT NULL,
  `timestamp` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gate_verification_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gate_verification_sessions` (
  `token_hash` char(64) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `visitor_id` int(11) NOT NULL,
  `appointment_id` varchar(100) NOT NULL,
  `expires_at` datetime NOT NULL,
  `qr_verified_at` datetime DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_hash`),
  KEY `idx_gate_expiry` (`expires_at`),
  KEY `staff_id` (`staff_id`),
  KEY `visitor_id` (`visitor_id`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `gate_verification_sessions_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`),
  CONSTRAINT `gate_verification_sessions_ibfk_2` FOREIGN KEY (`visitor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `gate_verification_sessions_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `guest_visitation_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `guest_visitation_logs` (
  `id` varchar(40) NOT NULL,
  `visitor_record_id` bigint(20) NOT NULL,
  `visit_date` date NOT NULL,
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `age` smallint(5) unsigned DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `signature_data` longtext DEFAULT NULL,
  `checked_in_by` int(11) NOT NULL,
  `checked_out_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `purpose_of_visit` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_visit_date` (`visit_date`,`time_in`),
  KEY `idx_visit_active` (`visitor_record_id`,`time_out`),
  KEY `checked_in_by` (`checked_in_by`),
  KEY `checked_out_by` (`checked_out_by`),
  CONSTRAINT `guest_visitation_logs_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  CONSTRAINT `guest_visitation_logs_ibfk_2` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  CONSTRAINT `guest_visitation_logs_ibfk_3` FOREIGN KEY (`checked_out_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jail_facilities`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jail_facilities` (
  `id` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `region` varchar(100) NOT NULL,
  `municipality` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `contact_number` varchar(100) NOT NULL,
  `visiting_days` text NOT NULL,
  `visiting_hours` text NOT NULL,
  `biometric_desk_hours` text NOT NULL,
  `capacity_per_slot` int(11) NOT NULL DEFAULT 40,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kyc_documents`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_documents` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `submission_id` bigint(20) NOT NULL,
  `side` varchar(10) NOT NULL,
  `mime_type` varchar(40) NOT NULL,
  `sha256` char(64) NOT NULL,
  `image_data` longblob NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kyc_document_side` (`submission_id`,`side`),
  CONSTRAINT `kyc_documents_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `kyc_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kyc_submissions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_submissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `id_type` varchar(100) NOT NULL,
  `id_number_encrypted` text NOT NULL,
  `id_number_hash` char(64) NOT NULL,
  `id_number_last4` char(4) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING_REVIEW',
  `automated_check` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`automated_check`)),
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_id` int(11) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kyc_status_submitted` (`status`,`submitted_at`),
  KEY `idx_kyc_user` (`user_id`,`submitted_at`),
  KEY `idx_kyc_id_hash` (`id_number_hash`),
  CONSTRAINT `kyc_submissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_form_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_form_records` (
  `id` varchar(100) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `record_type` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'DRAFT',
  `form_data` longtext NOT NULL,
  `prepared_by` varchar(100) DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pdl_record_type` (`pdl_id`,`record_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_number_sequence`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_number_sequence` (
  `id` tinyint(3) unsigned NOT NULL,
  `last_number` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_property_receipt_sequence`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_property_receipt_sequence` (
  `id` tinyint(4) NOT NULL,
  `last_number` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_schedule_notifications`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_schedule_notifications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `event_key` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `channel` varchar(10) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `provider_id` varchar(255) DEFAULT NULL,
  `last_error` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `appointment_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schedule_event` (`event_key`,`user_id`,`channel`),
  KEY `user_id` (`user_id`),
  KEY `pdl_id` (`pdl_id`),
  KEY `idx_schedule_notice_appointment` (`appointment_id`,`status`),
  CONSTRAINT `pdl_schedule_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `pdl_schedule_notifications_ibfk_2` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_visitation_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_visitation_logs` (
  `id` varchar(40) NOT NULL,
  `visitor_record_id` bigint(20) NOT NULL,
  `visit_date` date NOT NULL,
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `age` smallint(5) unsigned DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `signature_data` longtext DEFAULT NULL,
  `checked_in_by` int(11) NOT NULL,
  `checked_out_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `pdl_id` varchar(100) NOT NULL,
  `pdl_name` varchar(255) NOT NULL,
  `cell_number` varchar(100) DEFAULT NULL,
  `relationship_to_pdl` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_visit_date` (`visit_date`,`time_in`),
  KEY `idx_visit_active` (`visitor_record_id`,`time_out`),
  KEY `checked_in_by` (`checked_in_by`),
  KEY `checked_out_by` (`checked_out_by`),
  KEY `idx_pdl_visit` (`pdl_id`,`visit_date`),
  CONSTRAINT `pdl_visitation_logs_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  CONSTRAINT `pdl_visitation_logs_ibfk_2` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pdl_visitation_logs_ibfk_3` FOREIGN KEY (`checked_out_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pdl_visitation_logs_ibfk_4` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_visitation_schedules`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_visitation_schedules` (
  `pdl_id` varchar(100) NOT NULL,
  `weekday` tinyint(4) NOT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `updated_by` int(11) NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`pdl_id`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `pdl_visitation_schedules_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  CONSTRAINT `pdl_visitation_schedules_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_visitor_assignment_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_visitor_assignment_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint(20) NOT NULL,
  `action` varchar(20) NOT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_assignment_event` (`assignment_id`,`occurred_at`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `pdl_visitor_assignment_events_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `pdl_visitor_assignments` (`id`),
  CONSTRAINT `pdl_visitor_assignment_events_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_visitor_assignments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_visitor_assignments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `visitor_record_id` bigint(20) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `relationship` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'APPROVED',
  `approved_by` int(11) NOT NULL,
  `approved_at` datetime NOT NULL DEFAULT current_timestamp(),
  `revoked_by` int(11) DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `revocation_reason` text DEFAULT NULL,
  `source_link_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visitor_pdl_assignment` (`visitor_record_id`,`pdl_id`),
  UNIQUE KEY `source_link_id` (`source_link_id`),
  KEY `idx_assignment_visitor` (`visitor_record_id`,`status`),
  KEY `idx_assignment_pdl` (`pdl_id`,`status`),
  KEY `approved_by` (`approved_by`),
  KEY `revoked_by` (`revoked_by`),
  CONSTRAINT `pdl_visitor_assignments_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  CONSTRAINT `pdl_visitor_assignments_ibfk_2` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  CONSTRAINT `pdl_visitor_assignments_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pdl_visitor_assignments_ibfk_4` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdl_visitor_links`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdl_visitor_links` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pdl_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `relationship` varchar(80) NOT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `approved_by` int(11) NOT NULL,
  `approved_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_by` int(11) DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `archive_reason` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pdl_visitor` (`pdl_id`,`user_id`),
  KEY `idx_link_user` (`user_id`,`is_active`),
  CONSTRAINT `pdl_visitor_links_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  CONSTRAINT `pdl_visitor_links_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdls`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdls` (
  `id` varchar(100) NOT NULL,
  `pdl_number` varchar(100) NOT NULL,
  `file_number` varchar(100) DEFAULT NULL,
  `bjmp_id_number` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `aliases` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `age_at_admission` int(11) DEFAULT NULL,
  `place_of_birth` varchar(200) DEFAULT NULL,
  `sex` varchar(20) NOT NULL,
  `civil_status` varchar(50) DEFAULT NULL,
  `citizenship` varchar(100) DEFAULT 'Filipino',
  `religion` varchar(100) DEFAULT NULL,
  `tribal_affiliation` varchar(100) DEFAULT NULL,
  `present_address` text DEFAULT NULL,
  `provincial_address` text DEFAULT NULL,
  `highest_educational_attainment` varchar(100) DEFAULT NULL,
  `course` varchar(100) DEFAULT NULL,
  `occupation` varchar(200) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `gang_group_affiliation` varchar(200) DEFAULT NULL,
  `height` varchar(50) DEFAULT NULL,
  `weight` varchar(50) DEFAULT NULL,
  `built` varchar(50) DEFAULT NULL,
  `complexion` varchar(50) DEFAULT NULL,
  `eyes` varchar(50) DEFAULT NULL,
  `hair` varchar(100) DEFAULT NULL,
  `blood_type` varchar(10) DEFAULT NULL,
  `mannerism` text DEFAULT NULL,
  `dialects_spoken` varchar(200) DEFAULT NULL,
  `bertillion_marks` text DEFAULT NULL,
  `emergency_contact_person` varchar(200) DEFAULT NULL,
  `emergency_contact_relation` varchar(100) DEFAULT NULL,
  `emergency_contact_address` text DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `date_committed` date DEFAULT NULL,
  `jail_facility_id` varchar(100) NOT NULL,
  `cell_dormitory` varchar(200) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'In Custody',
  `primary_offense` text DEFAULT NULL,
  `court_branch` varchar(200) DEFAULT NULL,
  `presiding_judge` varchar(200) DEFAULT NULL,
  `case_status` varchar(100) DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  `demo_batch` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pdl_number` (`pdl_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `profile_change_requests`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profile_change_requests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `request_type` varchar(20) NOT NULL,
  `payload` longtext DEFAULT NULL,
  `new_password_hash` varchar(255) DEFAULT NULL,
  `proofs` longtext NOT NULL,
  `expires_at` datetime NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'VERIFYING',
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `verified_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_reason` text DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `admin_notified_at` datetime DEFAULT NULL,
  `notification_error` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_profile_change_user_status` (`user_id`,`status`,`requested_at`),
  KEY `idx_profile_change_queue` (`status`,`requested_at`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `profile_change_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `profile_change_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `record_archive_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `record_archive_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `record_type` varchar(40) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `action` varchar(20) NOT NULL,
  `record_label` varchar(255) NOT NULL,
  `original_created_at` datetime DEFAULT NULL,
  `previous_status` varchar(50) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `performed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_archive_record` (`record_type`,`record_id`,`performed_at`),
  KEY `idx_archive_action` (`action`,`performed_at`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `record_archive_events_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_incidents`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `security_incidents` (
  `id` varchar(100) NOT NULL,
  `timestamp` varchar(50) NOT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `facility` varchar(200) NOT NULL,
  `incident_type` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `action_taken` text NOT NULL,
  `reporting_officer` varchar(200) NOT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `mobile_number` varchar(30) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'VISITOR',
  `admin_title` varchar(200) DEFAULT NULL,
  `badge_number` varchar(100) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `address_street` text DEFAULT NULL,
  `address_municipality` varchar(200) DEFAULT NULL,
  `marital_status` varchar(50) DEFAULT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `valid_id_type` varchar(100) DEFAULT NULL,
  `valid_id_photo_url` text DEFAULT NULL,
  `face_photo_url` text DEFAULT NULL,
  `account_status` varchar(50) NOT NULL DEFAULT 'PENDING_EMAIL',
  `biometric_reference_number` varchar(100) DEFAULT NULL,
  `preferred_jail_facility_id` varchar(100) DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `phone_verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `biometric_scanned_at` datetime DEFAULT NULL,
  `biometrics_officer_name` varchar(200) DEFAULT NULL,
  `registered_at` datetime NOT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  `address_data` longtext DEFAULT NULL,
  `contact_access_policy` varchar(30) NOT NULL DEFAULT 'ALL_REGISTERED',
  `permanent_qr_token` char(64) DEFAULT NULL,
  `officer_duties` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_users_mobile` (`mobile_number`),
  UNIQUE KEY `uq_permanent_qr` (`permanent_qr_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitation_policy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitation_policy` (
  `id` tinyint(4) NOT NULL,
  `visitor_limit` int(11) NOT NULL DEFAULT 7,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitor_log_entries`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitor_log_entries` (
  `id` varchar(100) NOT NULL,
  `log_type` varchar(50) NOT NULL,
  `appointment_id` varchar(100) DEFAULT NULL,
  `gate_log_id` varchar(100) DEFAULT NULL,
  `visitor_id` varchar(100) DEFAULT NULL,
  `pdl_id` varchar(100) DEFAULT NULL,
  `visit_date` date NOT NULL,
  `time_in` datetime DEFAULT NULL,
  `time_out` datetime DEFAULT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `relationship_to_pdl` varchar(100) DEFAULT NULL,
  `purpose_of_visit` varchar(255) DEFAULT NULL,
  `cell_number` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitor_pdl_schedule_events`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitor_pdl_schedule_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pdl_id` varchar(100) NOT NULL,
  `previous_weekday` tinyint(4) DEFAULT NULL,
  `new_weekday` tinyint(4) NOT NULL,
  `reason` text NOT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pdl_schedule_event` (`pdl_id`,`changed_at`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `visitor_pdl_schedule_events_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  CONSTRAINT `visitor_pdl_schedule_events_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitor_qr_identities`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitor_qr_identities` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `visitor_record_id` bigint(20) NOT NULL,
  `qr_token` char(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `visitor_record_id` (`visitor_record_id`),
  UNIQUE KEY `qr_token` (`qr_token`),
  CONSTRAINT `visitor_qr_identities_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitor_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitor_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `visitor_code` varchar(40) NOT NULL,
  `legacy_user_id` int(11) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `address_data` longtext DEFAULT NULL,
  `age` smallint(5) unsigned DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `visitor_code` (`visitor_code`),
  UNIQUE KEY `legacy_user_id` (`legacy_user_id`),
  KEY `idx_visitor_name` (`full_name`),
  KEY `idx_visitor_status` (`status`,`is_archived`),
  KEY `created_by` (`created_by`),
  KEY `archived_by` (`archived_by`),
  CONSTRAINT `visitor_records_ibfk_1` FOREIGN KEY (`legacy_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visitor_records_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visitor_records_ibfk_3` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitor_restrictions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitor_restrictions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `visitor_record_id` bigint(20) NOT NULL,
  `scope` varchar(20) NOT NULL,
  `pdl_id` varchar(100) DEFAULT NULL,
  `reason` varchar(120) NOT NULL,
  `requested_by` varchar(255) DEFAULT NULL,
  `request_details` text DEFAULT NULL,
  `effective_at` datetime NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `processed_by` int(11) NOT NULL,
  `removed_by` int(11) DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `removal_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_restriction_scope` (`visitor_record_id`,`scope`,`pdl_id`,`status`,`effective_at`,`expires_at`),
  KEY `idx_restriction_expiry` (`status`,`expires_at`),
  KEY `pdl_id` (`pdl_id`),
  KEY `processed_by` (`processed_by`),
  KEY `removed_by` (`removed_by`),
  CONSTRAINT `visitor_restrictions_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  CONSTRAINT `visitor_restrictions_ibfk_2` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  CONSTRAINT `visitor_restrictions_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `visitor_restrictions_ibfk_4` FOREIGN KEY (`removed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'bjmp_visitation'
--

--
-- Dumping routines for database 'bjmp_visitation'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-13 12:44:10
