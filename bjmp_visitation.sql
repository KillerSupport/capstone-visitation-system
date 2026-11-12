-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 12, 2026 at 10:43 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bjmp_visitation`
--

-- --------------------------------------------------------

--
-- Table structure for table `account_change_requests`
--

CREATE TABLE `account_change_requests` (
  `user_id` int(11) NOT NULL,
  `payload` longtext NOT NULL,
  `proofs` longtext NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

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
  `archive_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

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
  `selection_mode` varchar(20) NOT NULL DEFAULT 'LEGACY'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointment_notifications`
--

CREATE TABLE `appointment_notifications` (
  `id` bigint(20) NOT NULL,
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
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `actor_role` varchar(30) NOT NULL,
  `action` varchar(80) NOT NULL,
  `target_type` varchar(40) NOT NULL,
  `target_id` varchar(100) DEFAULT NULL,
  `result` varchar(30) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `actor_user_id`, `actor_role`, `action`, `target_type`, `target_id`, `result`, `details`, `ip_address`, `created_at`) VALUES
(5, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-10 19:17:41'),
(6, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-10 20:05:43'),
(7, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::ffff:127.0.0.1', '2026-10-19 14:13:33'),
(8, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:17:05'),
(9, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:17:13'),
(10, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:17:45'),
(11, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:17:49'),
(12, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:21:33'),
(13, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:23:33'),
(14, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::ffff:127.0.0.1', '2026-10-19 14:24:04'),
(15, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::ffff:127.0.0.1', '2026-10-19 14:37:01'),
(16, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::ffff:127.0.0.1', '2026-10-19 14:37:23'),
(17, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:39:38'),
(18, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-10-19 14:46:23'),
(19, NULL, 'SYSTEM', 'LEGACY_ACCESS_PRESERVED', 'USER', '1', 'SUCCESS', '{\"reason\":\"Preserved an existing active account with a previously verified contact; secondary contacts remain unverified.\"}', NULL, '2026-10-19 23:02:34'),
(20, NULL, 'SYSTEM', 'LEGACY_ACCESS_PRESERVED', 'USER', '2', 'SUCCESS', '{\"reason\":\"Preserved an existing active account with a previously verified contact; secondary contacts remain unverified.\"}', NULL, '2026-10-19 23:02:34'),
(21, NULL, 'SYSTEM', 'LEGACY_ACCESS_PRESERVED', 'USER', '3', 'SUCCESS', '{\"reason\":\"Preserved an existing active account with a previously verified contact; secondary contacts remain unverified.\"}', NULL, '2026-10-19 23:02:34'),
(22, 3, 'VISITOR', 'LOGIN', 'AUTH', '3', 'SUCCESS', '{}', '::1', '2026-11-05 09:21:22'),
(23, 3, 'VISITOR', 'LOGOUT', 'AUTH', '3', 'SUCCESS', '{}', '::1', '2026-11-05 09:33:44'),
(24, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-05 09:34:16'),
(25, 3, 'VISITOR', 'LOGIN', 'AUTH', '3', 'SUCCESS', '{}', '::1', '2026-11-05 09:34:26'),
(26, 3, 'VISITOR', 'LOGOUT', 'AUTH', '3', 'SUCCESS', '{}', '::1', '2026-11-05 09:39:59'),
(27, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-05 09:40:20'),
(28, 2, 'WORKER', 'CREATE', 'PDL', 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'SUCCESS', '{\"assistedByWorker\":true}', '::1', '2026-11-05 09:47:44'),
(29, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-05 09:48:12'),
(30, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-05 09:48:36'),
(31, 1, 'ADMIN', 'UPDATE', 'PDL', 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'SUCCESS', '{}', '::1', '2026-11-05 09:54:57'),
(32, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL', 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'SUCCESS', '{\"userId\":\"3\",\"relationship\":\"Relative\"}', NULL, '2026-11-05 09:55:57'),
(33, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-05 09:56:55'),
(34, 3, 'VISITOR', 'LOGIN', 'AUTH', '3', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-05 17:12:03'),
(35, 3, 'VISITOR', 'LOGOUT', 'AUTH', '3', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-05 17:12:44'),
(36, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-05 17:14:03'),
(37, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-05 17:21:07'),
(38, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-06 16:26:10'),
(39, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-06 16:27:34'),
(40, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-06 16:29:19'),
(41, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-06 16:30:05'),
(42, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 16:30:18'),
(43, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 16:32:33'),
(44, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 16:32:46'),
(45, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 16:38:11'),
(46, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 17:21:43'),
(47, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 17:24:06'),
(48, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 20:28:56'),
(49, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-06 20:32:03'),
(50, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 05:34:51'),
(51, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 05:37:34'),
(52, 1, 'ADMIN', 'PROFILE_CHANGED', 'USER', '1', 'SUCCESS', '{\"requestId\":3,\"fields\":[\"name\",\"birthdate\",\"email\",\"mobile\",\"address\"]}', '::1', '2026-11-07 05:39:24'),
(53, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 05:39:42'),
(54, 1, 'ADMIN', 'PASSWORD_CHANGED', 'USER', '1', 'SUCCESS', '{\"requestId\":4,\"fields\":[\"password\"]}', '::1', '2026-11-07 05:41:10'),
(55, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-07 05:41:25'),
(56, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 05:41:39'),
(57, 1, 'ADMIN', 'WORKER_ACCOUNT_UPDATED', 'USER', '2', 'SUCCESS', '{\"before\":{\"role\":\"WORKER\",\"accountStatus\":\"ACTIVATED\",\"badgeNumber\":\"BJMP-WRK-001\"},\"duties\":[\"GATE\"],\"status\":\"ACTIVE\",\"badgeNumber\":\"BJMP-WRK-001\",\"emailChanged\":false,\"phoneChanged\":true}', NULL, '2026-11-07 05:52:37'),
(58, 1, 'ADMIN', 'PDL_VISITATION_SCHEDULE_UPDATED', 'PDL_SCHEDULE', 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'SUCCESS', '{\"previousWeekday\":null,\"newWeekday\":1,\"reason\":\"Monday schedule\"}', '::1', '2026-11-07 05:54:09'),
(59, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 06:05:53'),
(60, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 06:58:44'),
(61, 1, 'ADMIN', 'VISITOR_UPDATED', 'VISITOR', '1', 'SUCCESS', '{\"fields\":[\"fullName\",\"gender\",\"address\",\"age\",\"contactNumber\",\"contactEmail\"]}', '::1', '2026-11-07 06:59:04'),
(62, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 07:03:03'),
(63, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-07 07:08:07'),
(64, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 07:08:22'),
(65, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 07:31:41'),
(66, 1, 'ADMIN', 'WORKER_PROFILE_CHANGE_APPROVE', 'PROFILE_CHANGE_REQUEST', '6', 'SUCCESS', '{\"workerId\":2,\"requestType\":\"PROFILE\",\"reason\":\"test only\"}', '::1', '2026-11-07 07:34:08'),
(67, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-07 07:34:51'),
(68, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 07:35:00'),
(69, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 07:37:04'),
(70, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 07:37:08'),
(71, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:05:58'),
(72, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:08:57'),
(73, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:09:25'),
(74, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:13:03'),
(75, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:13:17'),
(76, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:13:20'),
(77, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:14:29'),
(78, 1, 'ADMIN', 'WORKER_PROFILE_CHANGE_APPROVE', 'PROFILE_CHANGE_REQUEST', '7', 'SUCCESS', '{\"workerId\":2,\"requestType\":\"PROFILE\",\"reason\":\"Approved test only\"}', '::1', '2026-11-07 08:14:56'),
(79, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:17:59'),
(80, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:27:04'),
(81, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:28:39'),
(82, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:39:16'),
(83, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:39:21'),
(84, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:56:06'),
(85, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:57:14'),
(86, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 08:58:45'),
(87, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 08:58:56'),
(88, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 09:08:31'),
(89, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 09:09:10'),
(90, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-07 09:11:01'),
(91, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-07 09:11:07'),
(92, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-10 15:23:48'),
(93, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-10 15:23:58'),
(94, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 15:24:14'),
(95, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 15:28:36'),
(96, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 15:49:15'),
(97, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 15:52:19'),
(98, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-10 16:14:04'),
(99, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 16:14:11'),
(100, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-10 16:33:18'),
(101, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '2', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-MARC-02\"}', NULL, '2026-11-10 17:45:11'),
(102, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '2', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":2,\"relationship\":\"Parent\"}', NULL, '2026-11-10 17:45:11'),
(103, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '3', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-MARC-03\"}', NULL, '2026-11-10 17:45:12'),
(104, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '3', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":3,\"relationship\":\"Parent\"}', NULL, '2026-11-10 17:45:12'),
(105, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '4', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-MARC-04\"}', NULL, '2026-11-10 17:45:12'),
(106, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '4', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":4,\"relationship\":\"Spouse\"}', NULL, '2026-11-10 17:45:12'),
(107, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '5', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-MARC-05\"}', NULL, '2026-11-10 17:45:12'),
(108, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '5', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":5,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(109, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '6', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-MARC-06\"}', NULL, '2026-11-10 17:45:12'),
(110, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '6', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":6,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(111, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '7', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-MARC-07\"}', NULL, '2026-11-10 17:45:12'),
(112, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '7', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":7,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(113, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '8', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-01\"}', NULL, '2026-11-10 17:45:12'),
(114, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '8', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":8,\"relationship\":\"Parent\"}', NULL, '2026-11-10 17:45:12'),
(115, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '9', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-02\"}', NULL, '2026-11-10 17:45:12'),
(116, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '9', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":9,\"relationship\":\"Parent\"}', NULL, '2026-11-10 17:45:12'),
(117, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '10', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-03\"}', NULL, '2026-11-10 17:45:12'),
(118, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '10', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":10,\"relationship\":\"Spouse\"}', NULL, '2026-11-10 17:45:12'),
(119, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '11', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-04\"}', NULL, '2026-11-10 17:45:12'),
(120, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '11', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":11,\"relationship\":\"Child\"}', NULL, '2026-11-10 17:45:12'),
(121, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '12', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-05\"}', NULL, '2026-11-10 17:45:12'),
(122, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '12', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":12,\"relationship\":\"Child\"}', NULL, '2026-11-10 17:45:12'),
(123, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '13', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-06\"}', NULL, '2026-11-10 17:45:12'),
(124, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '13', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":13,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(125, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '14', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-JOHN-07\"}', NULL, '2026-11-10 17:45:12'),
(126, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '14', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-002\",\"visitorId\":14,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(127, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '15', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-01\"}', NULL, '2026-11-10 17:45:12'),
(128, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '15', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":15,\"relationship\":\"Parent\"}', NULL, '2026-11-10 17:45:12'),
(129, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '16', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-02\"}', NULL, '2026-11-10 17:45:12'),
(130, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '16', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":16,\"relationship\":\"Parent\"}', NULL, '2026-11-10 17:45:12'),
(131, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '17', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-03\"}', NULL, '2026-11-10 17:45:12'),
(132, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '17', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":17,\"relationship\":\"Spouse\"}', NULL, '2026-11-10 17:45:12'),
(133, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '18', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-04\"}', NULL, '2026-11-10 17:45:12'),
(134, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '18', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":18,\"relationship\":\"Child\"}', NULL, '2026-11-10 17:45:12'),
(135, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '19', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-05\"}', NULL, '2026-11-10 17:45:12'),
(136, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '19', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":19,\"relationship\":\"Child\"}', NULL, '2026-11-10 17:45:12'),
(137, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '20', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-06\"}', NULL, '2026-11-10 17:45:12'),
(138, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '20', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":20,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(139, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '21', 'SUCCESS', '{\"demo\":true,\"visitorCode\":\"VIS-BAC-DEMO-PATRICK-07\"}', NULL, '2026-11-10 17:45:12'),
(140, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '21', 'SUCCESS', '{\"demo\":true,\"pdlId\":\"fictional-requested-pdl-003\",\"visitorId\":21,\"relationship\":\"Sibling\"}', NULL, '2026-11-10 17:45:12'),
(141, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 18:10:13'),
(142, 1, 'ADMIN', 'UPDATE', 'PDL', 'fictional-requested-pdl-003', 'SUCCESS', '{}', '::1', '2026-11-10 18:47:16'),
(143, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-10 18:48:12'),
(144, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-10 21:36:02'),
(145, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-10 21:36:19'),
(146, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-10 21:37:54'),
(147, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-10 21:38:27'),
(148, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-11 02:52:22'),
(149, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-11 02:54:19'),
(150, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 02:54:33'),
(151, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 02:55:30'),
(152, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-11 09:41:53'),
(153, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-11 09:44:04'),
(154, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-11 09:44:36'),
(155, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 09:44:53'),
(156, 1, 'ADMIN', 'WORKER_CREATED', 'USER', '16', 'SUCCESS', '{\"duties\":[\"GATE\"]}', NULL, '2026-11-11 09:55:59'),
(157, 1, 'ADMIN', 'EXPORT', 'PDL_RECORDS', NULL, 'SUCCESS', '{\"format\":\"CSV\",\"recordCount\":3,\"filters\":{\"status\":null,\"q\":null}}', '::1', '2026-11-11 09:56:22'),
(158, 1, 'ADMIN', 'CREATE', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{}', '::1', '2026-11-11 10:01:54'),
(159, 1, 'ADMIN', 'ARCHIVE', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{\"reason\":\"for testing\",\"previousStatus\":\"Contraband Interception\"}', '::1', '2026-11-11 10:03:44'),
(160, 1, 'ADMIN', 'ARCHIVED_RECORD_VIEWED', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{}', '::1', '2026-11-11 10:03:51'),
(161, 1, 'ADMIN', 'ARCHIVED_RECORD_VIEWED', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{}', '::1', '2026-11-11 10:03:59'),
(162, 1, 'ADMIN', 'RESTORE', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{\"recordLabel\":\"inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f\"}', '::1', '2026-11-11 10:05:09'),
(163, 1, 'ADMIN', 'ARCHIVE', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{\"reason\":\"test\",\"previousStatus\":\"Contraband Interception\"}', '::1', '2026-11-11 10:45:12'),
(164, 1, 'ADMIN', 'RESTORE', 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'SUCCESS', '{\"recordLabel\":\"inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f\"}', '::1', '2026-11-11 10:46:33'),
(165, NULL, 'SYSTEM', 'DATE_RANGE_TEST_SAMPLE', 'TEST', 'Date filter sample 1', 'SAMPLE', '{\"reason\":\"Sample entry for testing the From/To date filter only; no visitor event occurred.\"}', NULL, '2026-09-15 12:00:00'),
(166, NULL, 'SYSTEM', 'DATE_RANGE_TEST_SAMPLE', 'TEST', 'Date filter sample 2', 'SAMPLE', '{\"reason\":\"Sample entry for testing the From/To date filter only; no visitor event occurred.\"}', NULL, '2026-10-01 12:00:00'),
(167, NULL, 'SYSTEM', 'DATE_RANGE_TEST_SAMPLE', 'TEST', 'Date filter sample 3', 'SAMPLE', '{\"reason\":\"Sample entry for testing the From/To date filter only; no visitor event occurred.\"}', NULL, '2026-10-15 12:00:00'),
(168, NULL, 'SYSTEM', 'DATE_RANGE_TEST_SAMPLE', 'TEST', 'Date filter sample 4', 'SAMPLE', '{\"reason\":\"Sample entry for testing the From/To date filter only; no visitor event occurred.\"}', NULL, '2026-11-01 12:00:00'),
(169, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 13:39:57'),
(170, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 13:41:10'),
(171, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '22', 'SUCCESS', '{\"visitorCode\":\"assigned\"}', '::1', '2026-11-11 13:54:38'),
(172, 1, 'ADMIN', 'VISITOR_UPDATED', 'VISITOR', '4', 'SUCCESS', '{\"fields\":[\"fullName\",\"gender\",\"address\",\"age\",\"contactNumber\",\"contactEmail\"]}', '::1', '2026-11-11 14:41:36'),
(173, 1, 'ADMIN', 'PDL_VISITOR_REVOKED', 'PDL_ASSIGNMENT', '4', 'SUCCESS', '{\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"visitorId\":4,\"reason\":\"bakit ba\"}', '::1', '2026-11-11 14:52:33'),
(174, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '23', 'SUCCESS', '{\"visitorCode\":\"assigned\"}', '::1', '2026-11-11 15:04:09'),
(175, 1, 'ADMIN', 'VISITOR_REGISTERED', 'VISITOR', '24', 'SUCCESS', '{\"visitorCode\":\"assigned\"}', '::1', '2026-11-11 15:15:19'),
(176, 1, 'ADMIN', 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', '22', 'SUCCESS', '{\"pdlId\":\"pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555\",\"relationship\":\"Sibling\"}', '::1', '2026-11-11 15:16:19'),
(177, 1, 'ADMIN', 'PDL_VISITATION_SCHEDULE_UPDATED', 'PDL_SCHEDULE', 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'SUCCESS', '{\"previousWeekday\":1,\"newWeekday\":1,\"reason\":\"testing\"}', '::1', '2026-11-11 15:25:54'),
(178, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 17:02:35'),
(179, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-11 20:06:07'),
(180, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-11 20:46:00'),
(181, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-11 21:05:41'),
(182, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-12 03:24:24'),
(183, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-12 07:26:02'),
(184, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::ffff:127.0.0.1', '2026-11-12 07:42:44'),
(185, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 08:22:00'),
(186, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 08:29:48'),
(187, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 08:30:42'),
(188, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-12 08:31:04'),
(189, 1, 'ADMIN', 'LOGOUT', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-12 08:33:36'),
(190, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 08:33:59'),
(191, NULL, 'ANONYMOUS', 'FAILED_LOGIN', 'AUTH', NULL, 'FAILURE', '{}', '::1', '2026-11-12 09:45:38'),
(192, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 09:45:50'),
(193, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 09:48:14'),
(194, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 10:01:40'),
(195, 1, 'ADMIN', 'LOGIN', 'AUTH', '1', 'SUCCESS', '{}', '::1', '2026-11-12 10:04:16'),
(196, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 12:30:15'),
(197, 2, 'WORKER', 'LOGIN', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 12:58:07'),
(198, 2, 'WORKER', 'LOGOUT', 'AUTH', '2', 'SUCCESS', '{}', '::1', '2026-11-12 12:59:55');

-- --------------------------------------------------------

--
-- Table structure for table `auth_otps`
--

CREATE TABLE `auth_otps` (
  `id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `purpose` varchar(30) NOT NULL,
  `code_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_otps`
--

INSERT INTO `auth_otps` (`id`, `user_id`, `purpose`, `code_hash`, `expires_at`, `attempts`, `created_at`, `used_at`) VALUES
(6, 3, 'LOGIN', '7d835b0b3c64f28cfc2ccd97042944dda25c0713f12dce048f32d8faeccd21b2', '2026-10-19 14:34:50', 0, '2026-10-19 14:24:50', NULL),
(7, 3, 'LOGIN', '9e20cf20450ba047c7b6c92a74c90a37b8d6b63e2dbd055bf38361dd9a4c726e', '2026-10-19 14:35:55', 0, '2026-10-19 14:25:55', NULL),
(8, 1, 'PROFILE_CHANGE', '49c1268f38570d75229307ace758293a852281e983fc8c0f66fffd072049787e', '2026-11-05 09:59:32', 0, '2026-11-05 09:49:32', NULL),
(9, 1, 'PROFILE_CHANGE', '3b871c6e169861473956bc46954a7417bf0afba51694c86fad7b7c0dd99248f2', '2026-11-05 10:01:57', 0, '2026-11-05 09:51:57', NULL),
(10, 1, 'PROFILE_CHANGE', 'd5362aa3f8a4b53805fb297050bc90d219281fc758c5545587903160e4340d94', '2026-11-06 16:42:01', 0, '2026-11-06 16:32:01', NULL),
(11, 2, 'PASSWORD_RESET', '6512e2720cf9e9569db341930a32c37c5af12e3f3070e8482a8c11e2159bc84e', '2026-11-10 21:14:53', 0, '2026-11-10 21:04:53', NULL),
(12, 2, 'PASSWORD_RESET', '28f55cc6afe37b40ceaf6991c33e87e1b1bf4c613c6d0dd360b8063c54e6595a', '2026-11-10 21:20:36', 0, '2026-11-10 21:10:36', NULL),
(13, 16, 'VERIFY_EMAIL', 'c243cdefa3cbc0faa82eef291906784b368f90f76dedf18d3c64ffc050508349', '2026-11-11 10:05:59', 0, '2026-11-11 09:55:59', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `auth_sessions`
--

CREATE TABLE `auth_sessions` (
  `token_hash` char(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_sessions`
--

INSERT INTO `auth_sessions` (`token_hash`, `user_id`, `expires_at`, `created_at`) VALUES
('106f68a4bc4687743ffa70007d3e7ab99f65df2a91e1b4962bad6988e8743f67', 2, '2026-11-12 22:01:40', '2026-11-12 10:01:40'),
('5921ba6b6ca32874fa3aa94825abf6d17e1fe2c8d353c7b01eef0369329a1ed9', 2, '2026-11-12 20:33:59', '2026-11-12 08:33:59'),
('5e73838e22757ebea4192fc2335c693db6f98c1403f75a38d3fdef9a518871fc', 2, '2026-11-12 20:22:00', '2026-11-12 08:22:00'),
('717b141610ea05d317da60569f9e8760f97d0474c33a1a188f7aa0cf971aa2c9', 1, '2026-11-12 22:04:16', '2026-11-12 10:04:16'),
('79a0ba800f21c626f0d829051741a24bf01c356360d51c70814e423e82a0da33', 2, '2026-11-13 00:30:15', '2026-11-12 12:30:15'),
('7dc407ccefdcde658673e71215ce3b769806c4ae7a7198dce73559739a124d44', 2, '2026-11-11 09:38:27', '2026-11-10 21:38:27');

-- --------------------------------------------------------

--
-- Table structure for table `feature_migrations`
--

CREATE TABLE `feature_migrations` (
  `version` varchar(100) NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `feature_migrations`
--

INSERT INTO `feature_migrations` (`version`, `applied_at`) VALUES
('20261019_legacy_verified_access', '2026-10-19 23:02:34'),
('20261019_visitor_security_and_scheduling', '2026-10-19 21:48:35'),
('20261027_paper_approved_lists_and_days', '2026-10-27 16:56:28'),
('20261105_record_visitors_and_restrictions', '2026-11-05 21:19:53');

-- --------------------------------------------------------

--
-- Table structure for table `gate_logs`
--

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
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gate_verification_sessions`
--

CREATE TABLE `gate_verification_sessions` (
  `token_hash` char(64) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `visitor_id` int(11) NOT NULL,
  `appointment_id` varchar(100) NOT NULL,
  `expires_at` datetime NOT NULL,
  `qr_verified_at` datetime DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `guest_visitation_logs`
--

CREATE TABLE `guest_visitation_logs` (
  `id` varchar(40) NOT NULL,
  `visitor_record_id` bigint(20) NOT NULL,
  `visit_date` date NOT NULL,
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `age` smallint(5) UNSIGNED DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `signature_data` longtext DEFAULT NULL,
  `checked_in_by` int(11) NOT NULL,
  `checked_out_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `purpose_of_visit` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jail_facilities`
--

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
  `capacity_per_slot` int(11) NOT NULL DEFAULT 40
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jail_facilities`
--

INSERT INTO `jail_facilities` (`id`, `name`, `region`, `municipality`, `address`, `contact_number`, `visiting_days`, `visiting_hours`, `biometric_desk_hours`, `capacity_per_slot`) VALUES
('imus-city-jail-female', 'BJMP Imus City Jail - Female Dormitory', 'Region IV-A (CALABARZON)', 'Imus City, Cavite', 'Imus City, Cavite', 'Check BJMP ODBS for current contact details', 'Confirm current days in BJMP ODBS', 'Check official system for available dates and time slots', 'Confirm biometric desk hours with the facility before traveling', 30),
('imus-city-jail-male', 'BJMP Imus City Jail - Male Dormitory', 'Region IV-A (CALABARZON)', 'Imus City, Cavite', 'Imus City, Cavite', 'Check BJMP ODBS for current contact details', 'Confirm current days in BJMP ODBS', 'Check official system for available dates and time slots', 'Confirm biometric desk hours with the facility before traveling', 40);

-- --------------------------------------------------------

--
-- Table structure for table `kyc_documents`
--

CREATE TABLE `kyc_documents` (
  `id` bigint(20) NOT NULL,
  `submission_id` bigint(20) NOT NULL,
  `side` varchar(10) NOT NULL,
  `mime_type` varchar(40) NOT NULL,
  `sha256` char(64) NOT NULL,
  `image_data` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kyc_submissions`
--

CREATE TABLE `kyc_submissions` (
  `id` bigint(20) NOT NULL,
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
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pdls`
--

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
  `demo_batch` varchar(60) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdls`
--

INSERT INTO `pdls` (`id`, `pdl_number`, `file_number`, `bjmp_id_number`, `last_name`, `first_name`, `middle_name`, `suffix`, `aliases`, `date_of_birth`, `age_at_admission`, `place_of_birth`, `sex`, `civil_status`, `citizenship`, `religion`, `tribal_affiliation`, `present_address`, `provincial_address`, `highest_educational_attainment`, `course`, `occupation`, `skills`, `gang_group_affiliation`, `height`, `weight`, `built`, `complexion`, `eyes`, `hair`, `blood_type`, `mannerism`, `dialects_spoken`, `bertillion_marks`, `emergency_contact_person`, `emergency_contact_relation`, `emergency_contact_address`, `emergency_contact_phone`, `date_committed`, `jail_facility_id`, `cell_dormitory`, `status`, `primary_offense`, `court_branch`, `presiding_judge`, `case_status`, `is_archived`, `archived_at`, `archived_by`, `archive_reason`, `demo_batch`) VALUES
('fictional-requested-pdl-002', 'PDL-000002', NULL, NULL, 'Yap', 'John Paul', 'Zapata', '', '', '1979-02-02', 46, 'City of Imus, Cavite (sample)', 'Male', 'Married', 'Filipino (sample)', 'Not specified (sample)', 'Tagalog (sample)', 'Block 2 Lot 2, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', 'Block 11 Lot 2, Rose Street, Phase 2, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', 'High School Graduate (sample)', 'Not applicable (sample)', 'Sample occupation', 'Sample skills only', 'None — fictional sample', '161 cm (sample)', '56 kg (sample)', 'Average (sample)', 'Not specified (sample)', 'Brown (sample)', 'Black (sample)', 'Not record', 'Not recorded (sample)', 'Filipino, English (sample)', '', 'Aileen Yap', 'Spouse', 'Block 2 Lot 2, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', '+639000000002', '2025-02-02', 'imus-city-jail-male', 'Demonstration Dorm 2', 'In Custody', 'Not provided', 'Not assigned', 'Not assigned', 'Pending case details', 0, NULL, NULL, NULL, 'FICTIONAL-PDL-NAME-SAMPLES-20-V1'),
('fictional-requested-pdl-003', 'PDL-000003', NULL, NULL, 'Yusores', 'Shaina', 'Mae', '', 'Shai Shai', '1980-03-03', 29, 'City of Imus, Cavite', 'Female', 'Married', 'Filipino ', 'Not specified', 'Tagalog ', 'Block 12 Lot 3, Molave Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', 'Block 12 Lot 3, Sampaguita Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114', 'High School Graduate (sample)', 'Not applicable ', 'Sample occupation', '', 'Zapote Gang', '162 cm ', '57 kg ', 'Average (sample)', 'Not specified (sample)', 'Brown', 'Black ', 'Not record', 'Not recorded (sample)', 'Filipino, English ', 'Has a fire tattoo on her right arm', 'John Paul Yap Yusores', 'Spouse', 'Block 12 Lot 3, Molave Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '+639053266604', '2025-03-03', 'imus-city-jail-female', 'Cell 3', 'In Custody', 'Manslaughter, Murder', 'Regional Trial Court, Branch 120', 'Not assigned', 'Pending case details', 0, NULL, NULL, NULL, 'FICTIONAL-PDL-NAME-SAMPLES-20-V1'),
('pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'PDL-000001', NULL, NULL, 'Odullo', 'Marc Lhester', '', '', 'Dodong', '2001-04-01', 30, 'Imus City, Cavite', 'Male', 'Married', 'Filipino', 'Roman Catholic', 'Tagalog', 'Block 1 Lot 1, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', 'Block 10 Lot 1, Sampaguita Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114', 'High School Graduate', 'Secondary Education', 'Motorcycle Courier / Rider', 'Vehicle maneuvering, Small engine tuneup', 'Non-Affiliated (Neutral)', '5\'8\" (173 cm)', '71 kg (156 lbs)', 'Medium Built', 'Brown / Kayumanggi', 'Black', 'Straight Black', 'O+', '', '', 'Cross with initials \"CF\" on right wrist; 3-inch burn scar on right forearm; Panther head tattoo on left upper chest', 'Clarissa Manalo Villarama', 'Spouse', 'Block 1 Lot 1, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', '+639000000001', '2026-11-05', 'imus-city-jail-male', 'Brigada 3 - Cell Dorm A', 'In Custody', 'Not provided', 'Not assigned', 'Not assigned', 'Pending case details', 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `pdl_form_records`
--

CREATE TABLE `pdl_form_records` (
  `id` varchar(100) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `record_type` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'DRAFT',
  `form_data` longtext NOT NULL,
  `prepared_by` varchar(100) DEFAULT NULL,
  `approved_by` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_form_records`
--

INSERT INTO `pdl_form_records` (`id`, `pdl_id`, `record_type`, `status`, `form_data`, `prepared_by`, `approved_by`, `created_at`, `updated_at`) VALUES
('record-profile-fictional-requested-pdl-002', 'fictional-requested-pdl-002', 'PDL_PROFILE', 'ACTIVE', '{\"presentAddressDetails\":{\"houseNumber\":\"Block 2 Lot 2\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 2 Lot 2, Mahogany Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 2 Lot 2, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"},\"provincialAddressDetails\":{\"houseNumber\":\"Block 11 Lot 2\",\"streetName\":\"Rose Street\",\"subdivision\":\"Phase 2\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 11 Lot 2, Rose Street, Phase 2, Malagasang II-A\",\"completeAddress\":\"Block 11 Lot 2, Rose Street, Phase 2, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"},\"spouseName\":\"Aileen Yap\",\"fatherName\":\"Nestor Yap\",\"fatherAddress\":\"House 3, Loakan Road, Apugan, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"fatherAddressDetails\":{\"houseNumber\":\"House 3\",\"streetName\":\"Loakan Road\",\"subdivision\":\"Apugan\",\"regionCode\":\"1400000000\",\"region\":\"Cordillera Administrative Region (CAR)\",\"provinceCode\":\"1430399999\",\"province\":\"City of Baguio (Independent City)\",\"cityCode\":\"1430300000\",\"municipality\":\"City of Baguio\",\"barangayCode\":\"1430300001\",\"barangay\":\"Apugan-Loakan\",\"zipCode\":\"2600\",\"houseUnitStreet\":\"House 3, Loakan Road, Apugan, Apugan-Loakan\",\"completeAddress\":\"House 3, Loakan Road, Apugan, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"maritalStatus\":\"Single\"},\"motherName\":\"Cecilia Yap\",\"motherAddress\":\"House 4, Quezon Avenue, Barangay 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"motherAddressDetails\":{\"houseNumber\":\"House 4\",\"streetName\":\"Quezon Avenue\",\"subdivision\":\"Barangay 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"House 4, Quezon Avenue, Barangay 1, Barangay 1\",\"completeAddress\":\"House 4, Quezon Avenue, Barangay 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"},\"numberOfChildren\":2,\"childrenNames\":[\"Nico Yap (20 y/o)\",\"Bianca Yap (18 y/o)\"],\"emergencyContactAddressDetails\":{\"houseNumber\":\"Block 2 Lot 2\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 2 Lot 2, Mahogany Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 2 Lot 2, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"},\"allowedVisitorRelationship\":[\"Spouse\",\"Parent\",\"Child\",\"Sibling\",\"Legal Counsel\"],\"siblingsNames\":[\"Pedro Yap\",\"Mariel Yap\"],\"criminalCaseNumbers\":[],\"cases\":[]}', NULL, NULL, '2026-11-10 09:22:04', '2026-11-10 18:02:54'),
('record-profile-fictional-requested-pdl-003', 'fictional-requested-pdl-003', 'PDL_PROFILE', 'ACTIVE', '{\"signatureDataUrl\":\"\",\"presentAddressDetails\":{\"houseUnitStreet\":\"Block 12 Lot 3, Molave Street, Phase 1, Molino I\",\"municipality\":\"City of Bacoor\",\"maritalStatus\":\"Single\",\"zipCode\":\"4102\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402103000\",\"barangayCode\":\"0402103014\",\"houseNumber\":\"Block 12 Lot 3\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"Molino I\",\"completeAddress\":\"Block 12 Lot 3, Molave Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\"},\"provincialAddressDetails\":{\"houseUnitStreet\":\"Block 12 Lot 3, Sampaguita Street, Phase 1, Paliparan III\",\"municipality\":\"City of Dasmariñas\",\"maritalStatus\":\"Single\",\"zipCode\":\"4114\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402106000\",\"barangayCode\":\"0402106056\",\"houseNumber\":\"Block 12 Lot 3\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"Paliparan III\",\"completeAddress\":\"Block 12 Lot 3, Sampaguita Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114\"},\"bodyMarks\":[{\"id\":\"mark-1794305586293-lmwj9\",\"view\":\"FRONT\",\"x\":33.1,\"y\":32.9,\"kind\":\"Tattoo\",\"description\":\"Tattoo #1 - Fire tattoo\"}],\"spouseName\":\"John Paul Yap Yusores\",\"fatherName\":\"Danilo Yap\",\"fatherAddress\":\"House 5, Acacia Street, Acacia, Acacia, City of Davao, City of Davao (Independent City), Region XI (Davao Region), 8000\",\"fatherAddressDetails\":{\"houseUnitStreet\":\"House 5, Acacia Street, Acacia, Acacia\",\"municipality\":\"City of Davao\",\"maritalStatus\":\"Single\",\"zipCode\":\"8000\",\"regionCode\":\"1100000000\",\"provinceCode\":\"1130799999\",\"cityCode\":\"1130700000\",\"barangayCode\":\"1130700001\",\"houseNumber\":\"House 5\",\"streetName\":\"Acacia Street\",\"subdivision\":\"Acacia\",\"region\":\"Region XI (Davao Region)\",\"province\":\"City of Davao (Independent City)\",\"barangay\":\"Acacia\",\"completeAddress\":\"House 5, Acacia Street, Acacia, Acacia, City of Davao, City of Davao (Independent City), Region XI (Davao Region), 8000\"},\"motherName\":\"Marites Ibanez\",\"motherAddress\":\"House 6, Loakan Road, Apugan, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"motherAddressDetails\":{\"houseUnitStreet\":\"House 6, Loakan Road, Apugan, Apugan-Loakan\",\"municipality\":\"City of Baguio\",\"maritalStatus\":\"Single\",\"zipCode\":\"2600\",\"regionCode\":\"1400000000\",\"provinceCode\":\"1430399999\",\"cityCode\":\"1430300000\",\"barangayCode\":\"1430300001\",\"houseNumber\":\"House 6\",\"streetName\":\"Loakan Road\",\"subdivision\":\"Apugan\",\"region\":\"Cordillera Administrative Region (CAR)\",\"province\":\"City of Baguio (Independent City)\",\"barangay\":\"Apugan-Loakan\",\"completeAddress\":\"House 6, Loakan Road, Apugan, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\"},\"numberOfChildren\":2,\"childrenNames\":[\"Joaquin Yusores (22 y/o)\",\"Enzo Yusores (19 y/o)\"],\"emergencyContactAddressDetails\":{\"houseUnitStreet\":\"Block 12 Lot 3, Molave Street, Phase 1, Molino I\",\"municipality\":\"City of Bacoor\",\"maritalStatus\":\"Single\",\"zipCode\":\"4102\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402103000\",\"barangayCode\":\"0402103014\",\"houseNumber\":\"Block 12 Lot 3\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"Molino I\",\"completeAddress\":\"Block 12 Lot 3, Molave Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\"},\"dateCrimeCommitted\":\"\",\"timeAndDateOfArrest\":\"\",\"placeOfArrest\":\"\",\"arrestingOfficer\":\"\",\"timeDateOfDetentionLea\":\"\",\"receivingOfficer\":\"Harijie Mabilin\",\"searchedBy\":\"\",\"allowedVisitorRelationship\":[\"Spouse\",\"Parent\",\"Child\",\"Sibling\",\"Legal Counsel\"],\"criminalCaseNumbers\":[\"CC-24-10456\"],\"cases\":[{\"caseNumber\":\"CC-24-10456\",\"offense\":\"Manslaughter, Murder\",\"counts\":2,\"dateCrimeCommitted\":\"\",\"courtBranch\":\"Regional Trial Court, Branch 120\",\"presidingJudge\":\"Not assigned\",\"caseStatus\":\"Pending case details\"}],\"hearingStage\":{\"arraignment\":false,\"preTrial\":true,\"trial\":false,\"prosecutionEvidence\":false,\"defenseEvidence\":false,\"decision\":false},\"ra10592ManifestationSigned\":false,\"documentsChecklist\":{\"mitimus\":false,\"judgementCourtOrder\":false,\"nonPendingCertificate\":false,\"commitmentInformation\":false,\"computationOfGcta\":false,\"certificateOfDetention\":false,\"healthCertificates\":false,\"ddeResult\":false},\"propertyReceipt\":{\"receiptNumber\":\"3\",\"date\":\"2025-03-03\",\"items\":[{\"unit\":\"1 pc\",\"description\":\"Rolex Watch\"},{\"unit\":\"1 pc\",\"description\":\"Wallet\"},{\"unit\":\"1 pc\",\"description\":\"3,200 pesos\"}],\"receivingOfficer\":\"Harijie Mabilin\",\"designation\":\"PDL Records / Valuables Custodian\"}}', NULL, NULL, '2026-11-10 09:22:04', '2026-11-10 10:47:16'),
('record-profile-pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'PDL_PROFILE', 'ACTIVE', '{\"signatureDataUrl\":\"data:image/png;base64,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\",\"signatureCapturedAt\":\"2026-11-05T01:54:57.546Z\",\"bodyMarks\":[{\"id\":\"mark-1793843581106-9cycn\",\"view\":\"FRONT\",\"x\":34.7,\"y\":32.6,\"kind\":\"Tattoo\",\"description\":\"Tattoo #1 - dragon\"},{\"id\":\"mark-1793843620817-y4x9e\",\"view\":\"BACK\",\"x\":41.3,\"y\":48.9,\"kind\":\"Tattoo\",\"description\":\"Tattoo #2 - Christmas is coming to town\"}],\"spouseName\":\"Clarissa Manalo Villarama\",\"fatherName\":\"Danilo Villarama\",\"fatherAddress\":\"House 1, Loakan Road, Apugan, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"motherName\":\"Rosalinda Flores Villarama\",\"motherAddress\":\"House 2, Quezon Avenue, Barangay 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"numberOfChildren\":2,\"childrenNames\":[\"Christian Villarama (7 y/o)\",\"Chloe Villarama (3 y/o)\"],\"dateCrimeCommitted\":\"2025-01-10\",\"timeAndDateOfArrest\":\"2025-01-11 11:20 PM\",\"placeOfArrest\":\"Nueno Avenue corner Tanzang Luma, Imus City, Cavite\",\"arrestingOfficer\":\"PEMS. Dante Villanueva (Imus CPS)\",\"timeDateOfDetentionLea\":\"2025-01-12 01:10 AM\",\"receivingOfficer\":\"JO1 Aldrin M. Mangampo\",\"searchedBy\":\"JO1 Roberto Bautista\",\"allowedVisitorRelationship\":[\"Spouse\",\"Parent\",\"Child\",\"Sibling\",\"Legal Counsel\",\"Relative\"],\"criminalCaseNumbers\":[],\"cases\":[],\"hearingStage\":{\"arraignment\":true,\"preTrial\":false,\"trial\":false,\"prosecutionEvidence\":false,\"defenseEvidence\":false,\"decision\":false},\"ra10592ManifestationSigned\":true,\"documentsChecklist\":{\"mitimus\":false,\"judgementCourtOrder\":false,\"nonPendingCertificate\":false,\"commitmentInformation\":false,\"computationOfGcta\":false,\"certificateOfDetention\":false,\"healthCertificates\":false,\"ddeResult\":false},\"propertyReceipt\":{\"receiptNumber\":\"\",\"date\":\"2026-11-05\",\"items\":[{\"unit\":\"1 unit\",\"description\":\"G-Shock digital watch black\"},{\"unit\":\"1 pc\",\"description\":\"Black bi-fold wallet containing PhilSys ID\"},{\"unit\":\"PHP\",\"description\":\"Php 1,820.00 cash\"},{\"unit\":\"1 unit\",\"description\":\"Infinix smartphone blue (switched off)\"}],\"receivingOfficer\":\"JO1 Aldrin M. Mangampo\",\"designation\":\"PDL Records / Valuables Custodian\"},\"presentAddressDetails\":{\"houseNumber\":\"Block 1 Lot 1\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 1 Lot 1, Mahogany Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 1 Lot 1, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"},\"provincialAddressDetails\":{\"houseNumber\":\"Block 10 Lot 1\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402106000\",\"municipality\":\"City of Dasmariñas\",\"barangayCode\":\"0402106056\",\"barangay\":\"Paliparan III\",\"zipCode\":\"4114\",\"houseUnitStreet\":\"Block 10 Lot 1, Sampaguita Street, Phase 1, Paliparan III\",\"completeAddress\":\"Block 10 Lot 1, Sampaguita Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114\",\"maritalStatus\":\"Single\"},\"fatherAddressDetails\":{\"houseNumber\":\"House 1\",\"streetName\":\"Loakan Road\",\"subdivision\":\"Apugan\",\"regionCode\":\"1400000000\",\"region\":\"Cordillera Administrative Region (CAR)\",\"provinceCode\":\"1430399999\",\"province\":\"City of Baguio (Independent City)\",\"cityCode\":\"1430300000\",\"municipality\":\"City of Baguio\",\"barangayCode\":\"1430300001\",\"barangay\":\"Apugan-Loakan\",\"zipCode\":\"2600\",\"houseUnitStreet\":\"House 1, Loakan Road, Apugan, Apugan-Loakan\",\"completeAddress\":\"House 1, Loakan Road, Apugan, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"maritalStatus\":\"Single\"},\"motherAddressDetails\":{\"houseNumber\":\"House 2\",\"streetName\":\"Quezon Avenue\",\"subdivision\":\"Barangay 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"House 2, Quezon Avenue, Barangay 1, Barangay 1\",\"completeAddress\":\"House 2, Quezon Avenue, Barangay 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"},\"siblingsNames\":[\"Rafael Villarama\",\"Miguel Villarama\",\"Maricel Villarama\"],\"emergencyContactAddressDetails\":{\"houseNumber\":\"Block 1 Lot 1\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 1 Lot 1, Mahogany Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 1 Lot 1, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"}}', NULL, NULL, '2026-11-05 01:47:44', '2026-11-10 18:02:54');

-- --------------------------------------------------------

--
-- Table structure for table `pdl_number_sequence`
--

CREATE TABLE `pdl_number_sequence` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `last_number` bigint(20) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_number_sequence`
--

INSERT INTO `pdl_number_sequence` (`id`, `last_number`) VALUES
(1, 3);

-- --------------------------------------------------------

--
-- Table structure for table `pdl_property_receipt_sequence`
--

CREATE TABLE `pdl_property_receipt_sequence` (
  `id` tinyint(4) NOT NULL,
  `last_number` bigint(20) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_property_receipt_sequence`
--

INSERT INTO `pdl_property_receipt_sequence` (`id`, `last_number`) VALUES
(1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `pdl_schedule_notifications`
--

CREATE TABLE `pdl_schedule_notifications` (
  `id` bigint(20) NOT NULL,
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
  `appointment_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_schedule_notifications`
--

INSERT INTO `pdl_schedule_notifications` (`id`, `event_key`, `user_id`, `pdl_id`, `channel`, `destination`, `message`, `status`, `attempts`, `provider_id`, `last_error`, `updated_at`, `created_at`, `appointment_id`) VALUES
(1, 'link:0b18175b-5e0f-4ec9-a2c7-334e1a4025e3', 3, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'email', 'harijiem@gmail.com', 'BJMP Imus City Jail: You are on the approved visitor list for Marc Lhester  Odullo . The weekly visitation day has not yet been assigned. If a previous date was cancelled after a schedule change, select a new eligible date. Bring your original ID. Account activation, fingerprint and QR checks are still required for entry.', 'FAILED', 112, NULL, 'Schedule notification delivery is unavailable.', '2026-11-07 05:29:26', '2026-11-05 09:55:57', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `pdl_visitation_logs`
--

CREATE TABLE `pdl_visitation_logs` (
  `id` varchar(40) NOT NULL,
  `visitor_record_id` bigint(20) NOT NULL,
  `visit_date` date NOT NULL,
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `age` smallint(5) UNSIGNED DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `signature_data` longtext DEFAULT NULL,
  `checked_in_by` int(11) NOT NULL,
  `checked_out_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `pdl_id` varchar(100) NOT NULL,
  `pdl_name` varchar(255) NOT NULL,
  `cell_number` varchar(100) DEFAULT NULL,
  `relationship_to_pdl` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pdl_visitation_schedules`
--

CREATE TABLE `pdl_visitation_schedules` (
  `pdl_id` varchar(100) NOT NULL,
  `weekday` tinyint(4) NOT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `updated_by` int(11) NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_visitation_schedules`
--

INSERT INTO `pdl_visitation_schedules` (`pdl_id`, `weekday`, `version`, `updated_by`, `updated_at`) VALUES
('fictional-requested-pdl-002', 2, 1, 1, '2026-11-10 17:45:12'),
('fictional-requested-pdl-003', 2, 1, 1, '2026-11-10 17:45:12'),
('pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 1, 2, 1, '2026-11-11 15:25:54');

-- --------------------------------------------------------

--
-- Table structure for table `pdl_visitor_assignments`
--

CREATE TABLE `pdl_visitor_assignments` (
  `id` bigint(20) NOT NULL,
  `visitor_record_id` bigint(20) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `relationship` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'APPROVED',
  `approved_by` int(11) NOT NULL,
  `approved_at` datetime NOT NULL DEFAULT current_timestamp(),
  `revoked_by` int(11) DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `revocation_reason` text DEFAULT NULL,
  `source_link_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_visitor_assignments`
--

INSERT INTO `pdl_visitor_assignments` (`id`, `visitor_record_id`, `pdl_id`, `relationship`, `status`, `approved_by`, `approved_at`, `revoked_by`, `revoked_at`, `revocation_reason`, `source_link_id`) VALUES
(1, 1, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Relative', 'APPROVED', 1, '2026-11-05 09:55:57', NULL, NULL, NULL, 1),
(2, 2, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Parent', 'APPROVED', 1, '2026-11-10 17:45:11', NULL, NULL, NULL, NULL),
(3, 3, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Parent', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(4, 4, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Spouse', 'REVOKED', 1, '2026-11-10 17:45:12', 1, '2026-11-11 14:52:33', 'bakit ba', NULL),
(5, 5, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(6, 6, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(7, 7, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(8, 8, 'fictional-requested-pdl-002', 'Parent', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(9, 9, 'fictional-requested-pdl-002', 'Parent', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(10, 10, 'fictional-requested-pdl-002', 'Spouse', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(11, 11, 'fictional-requested-pdl-002', 'Child', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(12, 12, 'fictional-requested-pdl-002', 'Child', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(13, 13, 'fictional-requested-pdl-002', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(14, 14, 'fictional-requested-pdl-002', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(15, 15, 'fictional-requested-pdl-003', 'Parent', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(16, 16, 'fictional-requested-pdl-003', 'Parent', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(17, 17, 'fictional-requested-pdl-003', 'Spouse', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(18, 18, 'fictional-requested-pdl-003', 'Child', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(19, 19, 'fictional-requested-pdl-003', 'Child', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(20, 20, 'fictional-requested-pdl-003', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(21, 21, 'fictional-requested-pdl-003', 'Sibling', 'APPROVED', 1, '2026-11-10 17:45:12', NULL, NULL, NULL, NULL),
(22, 24, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 'Sibling', 'APPROVED', 1, '2026-11-11 15:16:19', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `pdl_visitor_assignment_events`
--

CREATE TABLE `pdl_visitor_assignment_events` (
  `id` bigint(20) NOT NULL,
  `assignment_id` bigint(20) NOT NULL,
  `action` varchar(20) NOT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_visitor_assignment_events`
--

INSERT INTO `pdl_visitor_assignment_events` (`id`, `assignment_id`, `action`, `relationship`, `reason`, `actor_user_id`, `occurred_at`) VALUES
(1, 1, 'APPROVED', 'Relative', NULL, 1, '2026-11-05 09:55:57'),
(2, 2, 'APPROVED', 'Parent', 'Approved by administrator.', 1, '2026-11-10 17:45:11'),
(3, 3, 'APPROVED', 'Parent', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(4, 4, 'APPROVED', 'Spouse', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(5, 5, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(6, 6, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(7, 7, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(8, 8, 'APPROVED', 'Parent', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(9, 9, 'APPROVED', 'Parent', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(10, 10, 'APPROVED', 'Spouse', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(11, 11, 'APPROVED', 'Child', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(12, 12, 'APPROVED', 'Child', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(13, 13, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(14, 14, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(15, 15, 'APPROVED', 'Parent', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(16, 16, 'APPROVED', 'Parent', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(17, 17, 'APPROVED', 'Spouse', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(18, 18, 'APPROVED', 'Child', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(19, 19, 'APPROVED', 'Child', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(20, 20, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(21, 21, 'APPROVED', 'Sibling', 'Approved by administrator.', 1, '2026-11-10 17:45:12'),
(22, 4, 'REVOKED', 'Spouse', 'bakit ba', 1, '2026-11-11 14:52:33'),
(23, 22, 'APPROVED', 'Sibling', NULL, 1, '2026-11-11 15:16:19');

-- --------------------------------------------------------

--
-- Table structure for table `pdl_visitor_links`
--

CREATE TABLE `pdl_visitor_links` (
  `id` bigint(20) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `relationship` varchar(80) NOT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `approved_by` int(11) NOT NULL,
  `approved_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_by` int(11) DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `archive_reason` varchar(1000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pdl_visitor_links`
--

INSERT INTO `pdl_visitor_links` (`id`, `pdl_id`, `user_id`, `relationship`, `is_active`, `approved_by`, `approved_at`, `archived_by`, `archived_at`, `archive_reason`) VALUES
(1, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 3, 'Relative', 1, 1, '2026-11-05 09:55:57', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `profile_change_requests`
--

CREATE TABLE `profile_change_requests` (
  `id` bigint(20) NOT NULL,
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
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `profile_change_requests`
--

INSERT INTO `profile_change_requests` (`id`, `user_id`, `request_type`, `payload`, `new_password_hash`, `proofs`, `expires_at`, `status`, `requested_at`, `verified_at`, `reviewed_by`, `reviewed_at`, `review_reason`, `applied_at`, `admin_notified_at`, `notification_error`, `created_at`) VALUES
(1, 1, 'PROFILE', '{\"firstName\":\"Harijie\",\"middleName\":\"\",\"lastName\":\"Mabilin\",\"suffix\":\"\",\"dateOfBirth\":\"2004-07-15\",\"email\":\"tongtongornamental@gmail.com\",\"mobileNumber\":\"+639555668435\",\"address\":{\"houseNumber\":\"Block 6 Lot 7\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Married\"},\"requestToken\":\"5b9f681a112cbe6283faf7e548569f9b8835e097a023946e\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"tongtongornamental@gmail.com\",\"hash\":\"3b0ea62a96128715c195f211566e1a7b34ee3838b570453e9852a5c784687561\",\"verified\":false,\"attempts\":0}]', '2026-11-06 17:32:56', 'DELIVERY_FAILED', '2026-11-06 17:22:56', NULL, NULL, NULL, NULL, NULL, NULL, 'Email delivery is not configured. Add SMTP_PASS to the project .env file.', '2026-11-06 17:22:56'),
(2, 1, 'PROFILE', '{\"firstName\":\"Harijie\",\"middleName\":\"\",\"lastName\":\"Mabilin\",\"suffix\":\"\",\"dateOfBirth\":\"2004-07-15\",\"email\":\"tongtongornamental@gmail.com\",\"mobileNumber\":\"+639555668435\",\"address\":{\"houseNumber\":\"Block 6 Lot 7\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Married\"},\"requestToken\":\"b681e854e867a0a682753bcf82cd7502df57c6d41aabab08\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"tongtongornamental@gmail.com\",\"hash\":\"479939866760553360a472b0c997e6faccc06afcbb706e1bffa54ba294f096f3\",\"verified\":false,\"attempts\":0}]', '2026-11-06 20:40:04', 'DELIVERY_FAILED', '2026-11-06 20:30:04', NULL, NULL, NULL, NULL, NULL, NULL, 'Email delivery is not configured. Add SMTP_PASS to the project .env file.', '2026-11-06 20:30:04'),
(3, 1, 'PROFILE', '{\"firstName\":\"Harijie\",\"middleName\":\"\",\"lastName\":\"Mabilin\",\"suffix\":\"\",\"dateOfBirth\":\"2004-07-15\",\"email\":\"tongtongornamental@gmail.com\",\"mobileNumber\":\"+639555668435\",\"address\":{\"houseNumber\":\"Block 6 Lot 7\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Married\"},\"requestToken\":\"57890b0540379702e214b18743c748cf2637300ee3a3d30b\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"tongtongornamental@gmail.com\",\"hash\":\"f29325c4a9d3cfa9ef2aaca253f053d0ecd85822eaa07e08602bcefcb9217798\",\"verified\":true,\"attempts\":0}]', '2026-11-07 05:48:36', 'APPLIED', '2026-11-07 05:38:36', '2026-11-07 05:39:24', NULL, NULL, NULL, '2026-11-07 05:39:24', NULL, NULL, '2026-11-07 05:38:36'),
(4, 1, 'PASSWORD', '{\"requestToken\":\"f78cc5ad8f15bba30d89d215b223459be26cec4ae47e9287\"}', 'scrypt:f77bad7f57c9b4414021cc6e20b48f97:4fd1e9cdbef3dd98dd1668ec7ec07705a52452f0bcab48195b0223522feac681ff1ed47116337d5a703a7864195ed530e0d7d8ce7e4941fb14870fbff6b93bca', '[{\"channel\":\"email\",\"destination\":\"tongtongornamental@gmail.com\",\"hash\":\"b75c7923869073d5c68a36166954669e73d24d061455a293ce6b1bbe2af2df43\",\"verified\":true,\"attempts\":0}]', '2026-11-07 05:50:48', 'APPLIED', '2026-11-07 05:40:48', '2026-11-07 05:41:10', NULL, NULL, NULL, '2026-11-07 05:41:10', NULL, NULL, '2026-11-07 05:40:48'),
(5, 2, 'PROFILE', '{\"firstName\":\"Kasane\",\"middleName\":\"\",\"lastName\":\"Teto\",\"suffix\":\"\",\"dateOfBirth\":\"2008-04-01\",\"email\":\"mharijie@gmail.com\",\"mobileNumber\":\"+639656588308\",\"address\":{\"houseNumber\":\"Block 6 Lot 8\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"},\"requestToken\":\"aa00994fb4593289c2030aea844618c322284f6405fcc95a\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"mharijie@gmail.com\",\"hash\":\"f735a8f64766386a1a5d4ba4477f0158a5d74168fb11219e828ef4c423d2e95d\",\"verified\":false,\"attempts\":0}]', '2026-11-07 07:39:23', 'SUPERSEDED', '2026-11-07 07:29:23', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-07 07:29:23'),
(6, 2, 'PROFILE', '{\"firstName\":\"Hatsune\",\"middleName\":\"\",\"lastName\":\"Miku\",\"suffix\":\"\",\"dateOfBirth\":\"2007-08-31\",\"email\":\"mharijie@gmail.com\",\"mobileNumber\":\"+639656588308\",\"address\":{\"houseUnitStreet\":\"BJMP Imus Records Office\",\"municipality\":\"Imus City, Cavite\",\"maritalStatus\":\"Single\",\"zipCode\":\"4103\"},\"requestToken\":\"fc7ba41ed2705440f3c7bba78ce1f7ecc8d08e60b8bb5483\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"mharijie@gmail.com\",\"hash\":\"c66dadde5a33255fd51709e729ca154c6f1b5e400bde55f11a6726b260d2996d\",\"verified\":true,\"attempts\":0}]', '2026-11-07 07:43:06', 'APPROVED', '2026-11-07 07:33:06', '2026-11-07 07:33:34', 1, '2026-11-07 07:34:08', 'test only', '2026-11-07 07:34:08', '2026-11-07 07:33:36', NULL, '2026-11-07 07:33:06'),
(7, 2, 'PROFILE', '{\"firstName\":\"Kasane\",\"middleName\":\"\",\"lastName\":\"Teto\",\"suffix\":\"\",\"dateOfBirth\":\"2008-04-01\",\"email\":\"mharijie@gmail.com\",\"mobileNumber\":\"+639656588308\",\"address\":{\"houseNumber\":\"Block 6 Lot 8\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"},\"requestToken\":\"aee20797b34bb13be5e3b2a2db8e3a2fef1a21b62059ab89\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"mharijie@gmail.com\",\"hash\":\"034ac430db7eb08789ba0185046b1ce726b1c39fe7acd422ee0bbbff993ae67d\",\"verified\":true,\"attempts\":0}]', '2026-11-07 08:18:06', 'APPROVED', '2026-11-07 08:08:06', '2026-11-07 08:09:56', 1, '2026-11-07 08:14:56', 'Approved test only', '2026-11-07 08:14:56', '2026-11-07 08:09:59', NULL, '2026-11-07 08:08:06'),
(8, 2, 'PROFILE', '{\"firstName\":\"Hatsune\",\"middleName\":\"\",\"lastName\":\"Miku\",\"suffix\":\"\",\"dateOfBirth\":\"2007-08-31\",\"email\":\"mharijie@gmail.com\",\"mobileNumber\":\"+639656588308\",\"address\":{\"houseUnitStreet\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I\",\"municipality\":\"City of Bacoor\",\"maritalStatus\":\"Single\",\"zipCode\":\"4102\",\"houseNumber\":\"Block 6 Lot 8\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"completeAddress\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\"},\"requestToken\":\"64ff232699d61e5c70a1730b724f6bf462b8ac595ff7d112\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"mharijie@gmail.com\",\"hash\":\"0da2de0e14965130221e237edf4e85520bb4ce0e42ae7a1a64201a36dab9026b\",\"verified\":false,\"attempts\":0}]', '2026-11-07 09:08:13', 'SUPERSEDED', '2026-11-07 08:58:13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-07 08:58:13'),
(9, 2, 'PROFILE', '{\"firstName\":\"Hatsune\",\"middleName\":\"\",\"lastName\":\"Miku\",\"suffix\":\"\",\"dateOfBirth\":\"2007-08-31\",\"email\":\"mharijie@gmail.com\",\"mobileNumber\":\"+639656588308\",\"address\":{\"houseNumber\":\"Block 7 Lot 6\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 7 Lot 6, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 7 Lot 6, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"},\"requestToken\":\"ac16a8cb5ba49757538c22b9a26e971c643450e755ef9ad2\"}', NULL, '[{\"channel\":\"email\",\"destination\":\"mharijie@gmail.com\",\"hash\":\"ca7b2dbc1d363bcaa9133e1976a37d2f02859ecc94e6d970dfb85e80a2dc7eac\",\"verified\":false,\"attempts\":0}]', '2026-11-07 09:20:05', 'VERIFYING', '2026-11-07 09:10:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-07 09:10:05');

-- --------------------------------------------------------

--
-- Table structure for table `record_archive_events`
--

CREATE TABLE `record_archive_events` (
  `id` bigint(20) NOT NULL,
  `record_type` varchar(40) NOT NULL,
  `record_id` varchar(100) NOT NULL,
  `action` varchar(20) NOT NULL,
  `record_label` varchar(255) NOT NULL,
  `original_created_at` datetime DEFAULT NULL,
  `previous_status` varchar(50) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `performed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `record_archive_events`
--

INSERT INTO `record_archive_events` (`id`, `record_type`, `record_id`, `action`, `record_label`, `original_created_at`, `previous_status`, `reason`, `actor_user_id`, `performed_at`) VALUES
(1, 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'ARCHIVE', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', NULL, 'Contraband Interception', 'for testing', 1, '2026-11-11 10:03:44'),
(2, 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'RESTORE', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', NULL, 'Contraband Interception', NULL, 1, '2026-11-11 10:05:09'),
(3, 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'ARCHIVE', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', NULL, 'Contraband Interception', 'test', 1, '2026-11-11 10:45:12'),
(4, 'SECURITY_INCIDENT', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', 'RESTORE', 'inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', NULL, 'Contraband Interception', NULL, 1, '2026-11-11 10:46:33');

-- --------------------------------------------------------

--
-- Table structure for table `security_incidents`
--

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
  `archive_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `security_incidents`
--

INSERT INTO `security_incidents` (`id`, `timestamp`, `visitor_name`, `facility`, `incident_type`, `description`, `action_taken`, `reporting_officer`, `is_archived`, `archived_at`, `archived_by`, `archive_reason`) VALUES
('inc-b56ab681-8d4f-4bd2-8c01-1a6fe802247f', '2026-11-11T02:01:54.622Z', 'Aileen Yap', 'BJMP Imus City Jail', 'Contraband Interception', 'Bringing a knife inside the facility', 'we banned the offender', 'Harijie Mabilin', 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
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
  `officer_duties` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `mobile_number`, `password`, `role`, `admin_title`, `badge_number`, `first_name`, `middle_name`, `last_name`, `suffix`, `date_of_birth`, `gender`, `address_street`, `address_municipality`, `marital_status`, `zip_code`, `valid_id_type`, `valid_id_photo_url`, `face_photo_url`, `account_status`, `biometric_reference_number`, `preferred_jail_facility_id`, `email_verified_at`, `phone_verified_at`, `last_login_at`, `biometric_scanned_at`, `biometrics_officer_name`, `registered_at`, `is_archived`, `archived_at`, `archived_by`, `archive_reason`, `address_data`, `contact_access_policy`, `permanent_qr_token`, `officer_duties`) VALUES
(1, 'tongtongornamental@gmail.com', '+639555668435', 'scrypt:f77bad7f57c9b4414021cc6e20b48f97:4fd1e9cdbef3dd98dd1668ec7ec07705a52452f0bcab48195b0223522feac681ff1ed47116337d5a703a7864195ed530e0d7d8ce7e4941fb14870fbff6b93bca', 'ADMIN', 'System Administrator', 'BJMP-ADM-001', 'Harijie', NULL, 'Mabilin', NULL, '2004-07-15', 'Female', 'Block 6 Lot 7, Anemone St, Villa Felicia, Molino I', 'City of Bacoor', 'Married', '4102', 'Philippine National ID', NULL, NULL, 'ACTIVATED', 'BJMP-ADMIN-001', 'imus-city-jail-male', '2026-09-22 23:23:29', NULL, '2026-11-12 10:04:16', '2026-09-22 23:23:29', 'System setup', '2026-09-22 23:23:29', 0, NULL, NULL, NULL, '{\"houseNumber\":\"Block 6 Lot 7\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 7, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Married\"}', 'LEGACY_VERIFIED', NULL, NULL),
(2, 'mharijie@gmail.com', '+639656588308', 'scrypt:80903575826f63be20ee037fd00ed3ea:338dd672ef7af0437d461279d75ac8e28282259c7d6c659a8687956fcacb0e9c8d4e6294dad28eaab4d4e91c748396eca55d6515d508fa5ed412dbaa525fa912', 'WORKER', 'PDL Records Worker', 'BJMP-WRK-001', 'Kasane', NULL, 'Teto', NULL, '2008-04-01', 'Male', 'Block 6 Lot 8, Anemone St, Villa Felicia, Molino I', 'City of Bacoor', 'Single', '4102', 'Philippine National ID', NULL, NULL, 'ACTIVE', 'BJMP-WORKER-001', 'imus-city-jail-male', '2026-09-22 23:23:29', NULL, '2026-11-12 12:58:07', '2026-09-22 23:23:29', 'System setup', '2026-09-22 23:23:29', 0, NULL, NULL, NULL, '{\"houseNumber\":\"Block 6 Lot 8\",\"streetName\":\"Anemone St\",\"subdivision\":\"Villa Felicia\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I\",\"completeAddress\":\"Block 6 Lot 8, Anemone St, Villa Felicia, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"}', 'LEGACY_VERIFIED', NULL, '[\"GATE\"]'),
(3, 'harijiem@gmail.com', '+639170000003', 'scrypt:a19968224d1ec1b0e0cf44961b743287:d0d14c42db0d5fc515014caa03e262d39932239053cd94fd0be2da020faae719ca45a43ac7bb720153549df34265ee5d3f5cb290c143ad2778d1c8fd4f8459b0', 'VISITOR', NULL, NULL, 'Ana', 'M.', 'Cruz', '', '1995-04-10', 'Female', 'Imus City, Cavite', 'Imus City, Cavite', 'Single', '4103', 'Philippine National ID', NULL, NULL, 'ACTIVATED', 'BJMP-VISITOR-001', 'imus-city-jail-male', '2026-09-22 23:23:29', NULL, '2026-11-05 17:12:03', '2026-09-22 23:23:29', 'System setup', '2026-09-22 23:23:29', 0, NULL, NULL, NULL, NULL, 'LEGACY_VERIFIED', 'bc71ff6ad8dd37a1a1f38fb9aaaa39ffa8b2a58f7ef7a08bef6e8b4517539fc6', NULL),
(16, 'lhestermarc@gmail.com', NULL, 'scrypt:d80be1f229782829a5773d39308d1900:ae1edc1c60efc745c9c0ad3fdb66766129c3c28898fd0d2c4f5ad4a9f1b75401b91c674b74a4691e68da2af4e04b41a2a8f4566b69a32ed790927ab8abe2749b', 'WORKER', 'Worker', NULL, 'Gabo', NULL, 'Pineda', NULL, '1999-08-29', NULL, NULL, NULL, NULL, '4103', NULL, NULL, NULL, 'ACTIVE', 'BJMP-BIO-IMUS-3637', 'imus-city-jail-male', NULL, NULL, NULL, NULL, NULL, '2026-11-11 01:55:59', 0, NULL, NULL, NULL, '{}', 'ALL_REGISTERED', NULL, '[\"GATE\"]');

-- --------------------------------------------------------

--
-- Table structure for table `visitation_policy`
--

CREATE TABLE `visitation_policy` (
  `id` tinyint(4) NOT NULL,
  `visitor_limit` int(11) NOT NULL DEFAULT 7
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `visitation_policy`
--

INSERT INTO `visitation_policy` (`id`, `visitor_limit`) VALUES
(1, 7);

-- --------------------------------------------------------

--
-- Table structure for table `visitor_log_entries`
--

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
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `visitor_pdl_schedule_events`
--

CREATE TABLE `visitor_pdl_schedule_events` (
  `id` bigint(20) NOT NULL,
  `pdl_id` varchar(100) NOT NULL,
  `previous_weekday` tinyint(4) DEFAULT NULL,
  `new_weekday` tinyint(4) NOT NULL,
  `reason` text NOT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `visitor_pdl_schedule_events`
--

INSERT INTO `visitor_pdl_schedule_events` (`id`, `pdl_id`, `previous_weekday`, `new_weekday`, `reason`, `changed_by`, `changed_at`) VALUES
(1, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', NULL, 1, 'Monday schedule', 1, '2026-11-07 05:54:09'),
(2, 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', 1, 1, 'testing', 1, '2026-11-11 15:25:54');

-- --------------------------------------------------------

--
-- Table structure for table `visitor_qr_identities`
--

CREATE TABLE `visitor_qr_identities` (
  `id` bigint(20) NOT NULL,
  `visitor_record_id` bigint(20) NOT NULL,
  `qr_token` char(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `visitor_qr_identities`
--

INSERT INTO `visitor_qr_identities` (`id`, `visitor_record_id`, `qr_token`, `created_at`) VALUES
(1, 1, 'bc71ff6ad8dd37a1a1f38fb9aaaa39ffa8b2a58f7ef7a08bef6e8b4517539fc6', '2026-11-05 21:19:53'),
(2, 2, '3f647de0458c4ff2df99b050d8ab3f19246d273154675944fca54f127e2b8df5', '2026-11-10 17:45:11'),
(3, 3, 'db31585cd88a701ac9a25487fee569abeb5404b44c805f4a83a518ad0079bb08', '2026-11-10 17:45:11'),
(4, 4, '9a1b8c6fb9bb3a2395e9111db70e006c3c6eef99430f6ad04b54cff4d5809ef6', '2026-11-10 17:45:12'),
(5, 5, '85217a02a191f1c2f493be2e1eb23cd20d17547cfc97d8f43ab96d63f5445686', '2026-11-10 17:45:12'),
(6, 6, '3301214b69fc065cf1d3014e16a0097365f06ce3803d82142bb4f26bcc88d5c5', '2026-11-10 17:45:12'),
(7, 7, '10fc660fc56b18266bfdecaf40f7499fbfc8fb618765b3c4f0c2d4d9ee4ad046', '2026-11-10 17:45:12'),
(8, 8, '400a8d14bf2f6da3881113a6bbf221c986d36b4611c4554893ac899dcb5c61b1', '2026-11-10 17:45:12'),
(9, 9, 'af666e59293837e973245062b9c15dad8e548b481a696fdec698e2ff3e4283d4', '2026-11-10 17:45:12'),
(10, 10, 'ff9ef0550e6aca45475b818b842712d7c0efabe7a96176477b9073e5b15ca54e', '2026-11-10 17:45:12'),
(11, 11, '2251b8d0b4edad45aadaa25a2ce9f9c566c727c367c6576870f807779e14c706', '2026-11-10 17:45:12'),
(12, 12, '6bb1a5d7985c179aa63fad2c88ce3423e8dd5ad4972ce4fefa2c2466ae8fd2b0', '2026-11-10 17:45:12'),
(13, 13, 'aaccc38b772c356a3845afac630d46bc0da37f2735c92e0844dd2190ea59fb78', '2026-11-10 17:45:12'),
(14, 14, 'dfeb30af7861785c58bc667b01f48eb8c4911bd09727d493ca3f29ccc5b33ced', '2026-11-10 17:45:12'),
(15, 15, '690813d8366713047063f97dd8164bb8173153d280c094caa7f75335588a47e2', '2026-11-10 17:45:12'),
(16, 16, 'f2d396a2548c59492ca5d841b0f99b08233b99f2eecf661f9392ac2124225522', '2026-11-10 17:45:12'),
(17, 17, 'a1db72115aa78cd4e158b9d9e0c7d2ab353df84d6c9e84f07366c044a6061d30', '2026-11-10 17:45:12'),
(18, 18, '4190d9a23345c150b1e2f73dcc2ff6d85bd2cb2ba31d84df940a8e3713c53ca8', '2026-11-10 17:45:12'),
(19, 19, '7ce8846ff481a7a424047d748a41e7feddd162ecf953aa8ca1a721b886605017', '2026-11-10 17:45:12'),
(20, 20, 'd8a4eead44f568b4858939194c30ae0158e201b549fdc10e01d541451faca3e5', '2026-11-10 17:45:12'),
(21, 21, 'c8418a0360e27d83f70fe6e9c4cbfaa95e0588b8ce1510725af01f65c11c65c3', '2026-11-10 17:45:12'),
(22, 24, '60fb854725cc297907a73fe4a98d455f540b028be0479eec00978e6e16b6d265', '2026-11-11 15:16:19');

-- --------------------------------------------------------

--
-- Table structure for table `visitor_records`
--

CREATE TABLE `visitor_records` (
  `id` bigint(20) NOT NULL,
  `visitor_code` varchar(40) NOT NULL,
  `legacy_user_id` int(11) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `address_data` longtext DEFAULT NULL,
  `age` smallint(5) UNSIGNED DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL,
  `archive_reason` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `visitor_records`
--

INSERT INTO `visitor_records` (`id`, `visitor_code`, `legacy_user_id`, `full_name`, `gender`, `address`, `address_data`, `age`, `contact_number`, `contact_email`, `status`, `is_archived`, `archived_at`, `archived_by`, `archive_reason`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'VIS-BAC-000003', 3, 'Ana M. Cruz', 'Female', 'Imus City, Cavite', NULL, 31, '+639170000003', 'harijiem@gmail.com', 'ACTIVE', 0, NULL, NULL, NULL, NULL, '2026-09-22 23:23:29', '2026-11-05 21:19:53'),
(2, 'VIS-BAC-DEMO-MARC-02', NULL, 'Danilo Villarama', 'Male', 'Block 1 Lot 1, Mahogany Street, Phase 1, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600', '{\"houseNumber\":\"Block 1 Lot 1\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"1400000000\",\"region\":\"Cordillera Administrative Region (CAR)\",\"provinceCode\":\"1430399999\",\"province\":\"City of Baguio (Independent City)\",\"cityCode\":\"1430300000\",\"municipality\":\"City of Baguio\",\"barangayCode\":\"1430300001\",\"barangay\":\"Apugan-Loakan\",\"zipCode\":\"2600\",\"houseUnitStreet\":\"Block 1 Lot 1, Mahogany Street, Phase 1, Apugan-Loakan\",\"completeAddress\":\"Block 1 Lot 1, Mahogany Street, Phase 1, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"maritalStatus\":\"Single\"}', 65, '+639100000000', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:11', '2026-11-10 18:01:32'),
(3, 'VIS-BAC-DEMO-MARC-03', NULL, 'Rosalinda Flores Villarama', 'Female', 'Block 2 Lot 2, Sampaguita Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301', '{\"houseNumber\":\"Block 2 Lot 2\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"Block 2 Lot 2, Sampaguita Street, Phase 1, Barangay 1\",\"completeAddress\":\"Block 2 Lot 2, Sampaguita Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"}', 63, '+639100000001', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:11', '2026-11-10 18:01:32'),
(4, 'VIS-BAC-DEMO-MARC-04', NULL, 'Clarissa Manalo Villarama', 'Female', 'Block 3 Lot 3, Molave Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', '{\"houseUnitStreet\":\"Block 3 Lot 3, Molave Street, Phase 1, Malagasang II-A\",\"municipality\":\"City of Imus\",\"maritalStatus\":\"Single\",\"zipCode\":\"4103\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402109000\",\"barangayCode\":\"0402109015\",\"houseNumber\":\"Block 3 Lot 3\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"Malagasang II-A\",\"completeAddress\":\"Block 3 Lot 3, Molave Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\"}', 31, '+639100000002', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-11 14:41:36'),
(5, 'VIS-BAC-DEMO-MARC-05', NULL, 'Rafael Villarama', 'Male', 'Block 4 Lot 4, Rose Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '{\"houseNumber\":\"Block 4 Lot 4\",\"streetName\":\"Rose Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 4 Lot 4, Rose Street, Phase 1, Molino I\",\"completeAddress\":\"Block 4 Lot 4, Rose Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"}', 27, '+639100000003', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(6, 'VIS-BAC-DEMO-MARC-06', NULL, 'Miguel Villarama', 'Male', 'Block 5 Lot 5, Mahogany Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114', '{\"houseNumber\":\"Block 5 Lot 5\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402106000\",\"municipality\":\"City of Dasmariñas\",\"barangayCode\":\"0402106056\",\"barangay\":\"Paliparan III\",\"zipCode\":\"4114\",\"houseUnitStreet\":\"Block 5 Lot 5, Mahogany Street, Phase 1, Paliparan III\",\"completeAddress\":\"Block 5 Lot 5, Mahogany Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114\",\"maritalStatus\":\"Single\"}', 25, '+639100000004', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(7, 'VIS-BAC-DEMO-MARC-07', NULL, 'Maricel Villarama', 'Female', 'Block 6 Lot 6, Sampaguita Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301', '{\"houseNumber\":\"Block 6 Lot 6\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"Block 6 Lot 6, Sampaguita Street, Phase 1, Barangay 1\",\"completeAddress\":\"Block 6 Lot 6, Sampaguita Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"}', 24, '+639100000005', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(8, 'VIS-BAC-DEMO-JOHN-01', NULL, 'Nestor Yap', 'Male', 'Block 7 Lot 7, Molave Street, Phase 1, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600', '{\"houseNumber\":\"Block 7 Lot 7\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"1400000000\",\"region\":\"Cordillera Administrative Region (CAR)\",\"provinceCode\":\"1430399999\",\"province\":\"City of Baguio (Independent City)\",\"cityCode\":\"1430300000\",\"municipality\":\"City of Baguio\",\"barangayCode\":\"1430300001\",\"barangay\":\"Apugan-Loakan\",\"zipCode\":\"2600\",\"houseUnitStreet\":\"Block 7 Lot 7, Molave Street, Phase 1, Apugan-Loakan\",\"completeAddress\":\"Block 7 Lot 7, Molave Street, Phase 1, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"maritalStatus\":\"Single\"}', 69, '+639100000006', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(9, 'VIS-BAC-DEMO-JOHN-02', NULL, 'Cecilia Yap', 'Female', 'Block 8 Lot 1, Rose Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301', '{\"houseNumber\":\"Block 8 Lot 1\",\"streetName\":\"Rose Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"Block 8 Lot 1, Rose Street, Phase 1, Barangay 1\",\"completeAddress\":\"Block 8 Lot 1, Rose Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"}', 66, '+639100000007', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(10, 'VIS-BAC-DEMO-JOHN-03', NULL, 'Aileen Yap', 'Female', 'Block 9 Lot 2, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', '{\"houseNumber\":\"Block 9 Lot 2\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 9 Lot 2, Mahogany Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 9 Lot 2, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"}', 44, '+639100000008', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(11, 'VIS-BAC-DEMO-JOHN-04', NULL, 'Nico Yap', 'Male', 'Block 10 Lot 3, Sampaguita Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', '{\"houseNumber\":\"Block 10 Lot 3\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 10 Lot 3, Sampaguita Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 10 Lot 3, Sampaguita Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"}', 20, '+639100000009', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(12, 'VIS-BAC-DEMO-JOHN-05', NULL, 'Bianca Yap', 'Female', 'Block 11 Lot 4, Molave Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '{\"houseNumber\":\"Block 11 Lot 4\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 11 Lot 4, Molave Street, Phase 1, Molino I\",\"completeAddress\":\"Block 11 Lot 4, Molave Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"}', 18, '+639100000010', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(13, 'VIS-BAC-DEMO-JOHN-06', NULL, 'Pedro Yap', 'Male', 'Block 12 Lot 5, Rose Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301', '{\"houseNumber\":\"Block 12 Lot 5\",\"streetName\":\"Rose Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"Block 12 Lot 5, Rose Street, Phase 1, Barangay 1\",\"completeAddress\":\"Block 12 Lot 5, Rose Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"}', 42, '+639100000011', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(14, 'VIS-BAC-DEMO-JOHN-07', NULL, 'Mariel Yap', 'Female', 'Block 13 Lot 6, Mahogany Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114', '{\"houseNumber\":\"Block 13 Lot 6\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402106000\",\"municipality\":\"City of Dasmariñas\",\"barangayCode\":\"0402106056\",\"barangay\":\"Paliparan III\",\"zipCode\":\"4114\",\"houseUnitStreet\":\"Block 13 Lot 6, Mahogany Street, Phase 1, Paliparan III\",\"completeAddress\":\"Block 13 Lot 6, Mahogany Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114\",\"maritalStatus\":\"Single\"}', 38, '+639100000012', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(15, 'VIS-BAC-DEMO-PATRICK-01', NULL, 'Danilo Ibanez', 'Male', 'Block 14 Lot 7, Sampaguita Street, Phase 1, Acacia, City of Davao, City of Davao (Independent City), Region XI (Davao Region), 8000', '{\"houseNumber\":\"Block 14 Lot 7\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"1100000000\",\"region\":\"Region XI (Davao Region)\",\"provinceCode\":\"1130799999\",\"province\":\"City of Davao (Independent City)\",\"cityCode\":\"1130700000\",\"municipality\":\"City of Davao\",\"barangayCode\":\"1130700001\",\"barangay\":\"Acacia\",\"zipCode\":\"8000\",\"houseUnitStreet\":\"Block 14 Lot 7, Sampaguita Street, Phase 1, Acacia\",\"completeAddress\":\"Block 14 Lot 7, Sampaguita Street, Phase 1, Acacia, City of Davao, City of Davao (Independent City), Region XI (Davao Region), 8000\",\"maritalStatus\":\"Single\"}', 70, '+639100000013', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(16, 'VIS-BAC-DEMO-PATRICK-02', NULL, 'Marites Ibanez', 'Female', 'Block 15 Lot 1, Molave Street, Phase 1, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600', '{\"houseNumber\":\"Block 15 Lot 1\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"1400000000\",\"region\":\"Cordillera Administrative Region (CAR)\",\"provinceCode\":\"1430399999\",\"province\":\"City of Baguio (Independent City)\",\"cityCode\":\"1430300000\",\"municipality\":\"City of Baguio\",\"barangayCode\":\"1430300001\",\"barangay\":\"Apugan-Loakan\",\"zipCode\":\"2600\",\"houseUnitStreet\":\"Block 15 Lot 1, Molave Street, Phase 1, Apugan-Loakan\",\"completeAddress\":\"Block 15 Lot 1, Molave Street, Phase 1, Apugan-Loakan, City of Baguio, City of Baguio (Independent City), Cordillera Administrative Region (CAR), 2600\",\"maritalStatus\":\"Single\"}', 67, '+639100000014', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(17, 'VIS-BAC-DEMO-PATRICK-03', NULL, 'Maribel Ibanez', 'Female', 'Block 16 Lot 2, Rose Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '{\"houseNumber\":\"Block 16 Lot 2\",\"streetName\":\"Rose Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 16 Lot 2, Rose Street, Phase 1, Molino I\",\"completeAddress\":\"Block 16 Lot 2, Rose Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"}', 43, '+639100000015', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(18, 'VIS-BAC-DEMO-PATRICK-04', NULL, 'Joaquin Ibanez', 'Male', 'Block 17 Lot 3, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103', '{\"houseNumber\":\"Block 17 Lot 3\",\"streetName\":\"Mahogany Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402109000\",\"municipality\":\"City of Imus\",\"barangayCode\":\"0402109015\",\"barangay\":\"Malagasang II-A\",\"zipCode\":\"4103\",\"houseUnitStreet\":\"Block 17 Lot 3, Mahogany Street, Phase 1, Malagasang II-A\",\"completeAddress\":\"Block 17 Lot 3, Mahogany Street, Phase 1, Malagasang II-A, City of Imus, Cavite, Region IV-A (CALABARZON), 4103\",\"maritalStatus\":\"Single\"}', 22, '+639100000016', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(19, 'VIS-BAC-DEMO-PATRICK-05', NULL, 'Enzo Ibanez', 'Male', 'Block 18 Lot 4, Sampaguita Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114', '{\"houseNumber\":\"Block 18 Lot 4\",\"streetName\":\"Sampaguita Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402106000\",\"municipality\":\"City of Dasmariñas\",\"barangayCode\":\"0402106056\",\"barangay\":\"Paliparan III\",\"zipCode\":\"4114\",\"houseUnitStreet\":\"Block 18 Lot 4, Sampaguita Street, Phase 1, Paliparan III\",\"completeAddress\":\"Block 18 Lot 4, Sampaguita Street, Phase 1, Paliparan III, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114\",\"maritalStatus\":\"Single\"}', 19, '+639100000017', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(20, 'VIS-BAC-DEMO-PATRICK-06', NULL, 'Ramon Ibanez', 'Male', 'Block 19 Lot 5, Molave Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301', '{\"houseNumber\":\"Block 19 Lot 5\",\"streetName\":\"Molave Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0431299999\",\"province\":\"City of Lucena (Independent City)\",\"cityCode\":\"0431200000\",\"municipality\":\"City of Lucena\",\"barangayCode\":\"0431200002\",\"barangay\":\"Barangay 1\",\"zipCode\":\"4301\",\"houseUnitStreet\":\"Block 19 Lot 5, Molave Street, Phase 1, Barangay 1\",\"completeAddress\":\"Block 19 Lot 5, Molave Street, Phase 1, Barangay 1, City of Lucena, City of Lucena (Independent City), Region IV-A (CALABARZON), 4301\",\"maritalStatus\":\"Single\"}', 45, '+639100000018', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(21, 'VIS-BAC-DEMO-PATRICK-07', NULL, 'Celine Ibanez', 'Female', 'Block 20 Lot 6, Rose Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '{\"houseNumber\":\"Block 20 Lot 6\",\"streetName\":\"Rose Street\",\"subdivision\":\"Phase 1\",\"regionCode\":\"0400000000\",\"region\":\"Region IV-A (CALABARZON)\",\"provinceCode\":\"0402100000\",\"province\":\"Cavite\",\"cityCode\":\"0402103000\",\"municipality\":\"City of Bacoor\",\"barangayCode\":\"0402103014\",\"barangay\":\"Molino I\",\"zipCode\":\"4102\",\"houseUnitStreet\":\"Block 20 Lot 6, Rose Street, Phase 1, Molino I\",\"completeAddress\":\"Block 20 Lot 6, Rose Street, Phase 1, Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\",\"maritalStatus\":\"Single\"}', 40, '+639100000019', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-10 17:45:12', '2026-11-10 18:01:32'),
(22, 'VIS-BAC-0EE06ED602', NULL, 'Chan Tagasa', 'Male', 'Blk 16 Lot 3, N/A, San Isidro Labrador II, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114', '{\"houseUnitStreet\":\"Blk 16 Lot 3, N/A, San Isidro Labrador II\",\"municipality\":\"City of Dasmariñas\",\"maritalStatus\":\"Single\",\"zipCode\":\"4114\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402106000\",\"barangayCode\":\"0402106070\",\"houseNumber\":\"Blk 16 Lot 3\",\"streetName\":\"N/A\",\"subdivision\":\"\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"San Isidro Labrador II\",\"completeAddress\":\"Blk 16 Lot 3, N/A, San Isidro Labrador II, City of Dasmariñas, Cavite, Region IV-A (CALABARZON), 4114\"}', 22, '+639635311516', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-11 13:54:38', '2026-11-11 13:54:38'),
(23, 'VIS-BAC-E69E1C4516', NULL, 'Chan Tagasa', 'Male', 'Mabolo, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '{\"houseUnitStreet\":\"Mabolo\",\"municipality\":\"City of Bacoor\",\"maritalStatus\":\"Single\",\"zipCode\":\"4102\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402103000\",\"barangayCode\":\"0402103080\",\"houseNumber\":\"\",\"streetName\":\"\",\"subdivision\":\"\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"Mabolo\",\"completeAddress\":\"Mabolo, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\"}', 22, '+639635311516', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-11 15:04:09', '2026-11-11 15:04:09'),
(24, 'VIS-BAC-8EB0C06E5F', NULL, 'Chan Tagasa', 'Male', 'Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102', '{\"houseUnitStreet\":\"Molino I\",\"municipality\":\"City of Bacoor\",\"maritalStatus\":\"Single\",\"zipCode\":\"4102\",\"regionCode\":\"0400000000\",\"provinceCode\":\"0402100000\",\"cityCode\":\"0402103000\",\"barangayCode\":\"0402103014\",\"houseNumber\":\"\",\"streetName\":\"\",\"subdivision\":\"\",\"region\":\"Region IV-A (CALABARZON)\",\"province\":\"Cavite\",\"barangay\":\"Molino I\",\"completeAddress\":\"Molino I, City of Bacoor, Cavite, Region IV-A (CALABARZON), 4102\"}', 22, '+639635311516', NULL, 'ACTIVE', 0, NULL, NULL, NULL, 1, '2026-11-11 15:15:19', '2026-11-11 15:15:19');

-- --------------------------------------------------------

--
-- Table structure for table `visitor_restrictions`
--

CREATE TABLE `visitor_restrictions` (
  `id` bigint(20) NOT NULL,
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
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account_change_requests`
--
ALTER TABLE `account_change_requests`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `appointment_reference` (`appointment_reference`);

--
-- Indexes for table `appointment_notifications`
--
ALTER TABLE `appointment_notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_appointment_channel` (`appointment_id`,`channel`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_created` (`created_at`),
  ADD KEY `idx_audit_target` (`target_type`,`target_id`),
  ADD KEY `actor_user_id` (`actor_user_id`);

--
-- Indexes for table `auth_otps`
--
ALTER TABLE `auth_otps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_otp_lookup` (`user_id`,`purpose`,`created_at`);

--
-- Indexes for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD PRIMARY KEY (`token_hash`),
  ADD KEY `idx_session_user` (`user_id`);

--
-- Indexes for table `feature_migrations`
--
ALTER TABLE `feature_migrations`
  ADD PRIMARY KEY (`version`);

--
-- Indexes for table `gate_logs`
--
ALTER TABLE `gate_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `gate_verification_sessions`
--
ALTER TABLE `gate_verification_sessions`
  ADD PRIMARY KEY (`token_hash`),
  ADD KEY `idx_gate_expiry` (`expires_at`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `visitor_id` (`visitor_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `guest_visitation_logs`
--
ALTER TABLE `guest_visitation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_visit_date` (`visit_date`,`time_in`),
  ADD KEY `idx_visit_active` (`visitor_record_id`,`time_out`),
  ADD KEY `checked_in_by` (`checked_in_by`),
  ADD KEY `checked_out_by` (`checked_out_by`);

--
-- Indexes for table `jail_facilities`
--
ALTER TABLE `jail_facilities`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `kyc_documents`
--
ALTER TABLE `kyc_documents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_kyc_document_side` (`submission_id`,`side`);

--
-- Indexes for table `kyc_submissions`
--
ALTER TABLE `kyc_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_kyc_status_submitted` (`status`,`submitted_at`),
  ADD KEY `idx_kyc_user` (`user_id`,`submitted_at`),
  ADD KEY `idx_kyc_id_hash` (`id_number_hash`);

--
-- Indexes for table `pdls`
--
ALTER TABLE `pdls`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pdl_number` (`pdl_number`);

--
-- Indexes for table `pdl_form_records`
--
ALTER TABLE `pdl_form_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_pdl_record_type` (`pdl_id`,`record_type`);

--
-- Indexes for table `pdl_number_sequence`
--
ALTER TABLE `pdl_number_sequence`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pdl_property_receipt_sequence`
--
ALTER TABLE `pdl_property_receipt_sequence`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pdl_schedule_notifications`
--
ALTER TABLE `pdl_schedule_notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_schedule_event` (`event_key`,`user_id`,`channel`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `pdl_id` (`pdl_id`),
  ADD KEY `idx_schedule_notice_appointment` (`appointment_id`,`status`);

--
-- Indexes for table `pdl_visitation_logs`
--
ALTER TABLE `pdl_visitation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_visit_date` (`visit_date`,`time_in`),
  ADD KEY `idx_visit_active` (`visitor_record_id`,`time_out`),
  ADD KEY `checked_in_by` (`checked_in_by`),
  ADD KEY `checked_out_by` (`checked_out_by`),
  ADD KEY `idx_pdl_visit` (`pdl_id`,`visit_date`);

--
-- Indexes for table `pdl_visitation_schedules`
--
ALTER TABLE `pdl_visitation_schedules`
  ADD PRIMARY KEY (`pdl_id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `pdl_visitor_assignments`
--
ALTER TABLE `pdl_visitor_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_visitor_pdl_assignment` (`visitor_record_id`,`pdl_id`),
  ADD UNIQUE KEY `source_link_id` (`source_link_id`),
  ADD KEY `idx_assignment_visitor` (`visitor_record_id`,`status`),
  ADD KEY `idx_assignment_pdl` (`pdl_id`,`status`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `revoked_by` (`revoked_by`);

--
-- Indexes for table `pdl_visitor_assignment_events`
--
ALTER TABLE `pdl_visitor_assignment_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignment_event` (`assignment_id`,`occurred_at`),
  ADD KEY `actor_user_id` (`actor_user_id`);

--
-- Indexes for table `pdl_visitor_links`
--
ALTER TABLE `pdl_visitor_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pdl_visitor` (`pdl_id`,`user_id`),
  ADD KEY `idx_link_user` (`user_id`,`is_active`);

--
-- Indexes for table `profile_change_requests`
--
ALTER TABLE `profile_change_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_profile_change_user_status` (`user_id`,`status`,`requested_at`),
  ADD KEY `idx_profile_change_queue` (`status`,`requested_at`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `record_archive_events`
--
ALTER TABLE `record_archive_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_archive_record` (`record_type`,`record_id`,`performed_at`),
  ADD KEY `idx_archive_action` (`action`,`performed_at`),
  ADD KEY `actor_user_id` (`actor_user_id`);

--
-- Indexes for table `security_incidents`
--
ALTER TABLE `security_incidents`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `uq_users_mobile` (`mobile_number`),
  ADD UNIQUE KEY `uq_permanent_qr` (`permanent_qr_token`);

--
-- Indexes for table `visitation_policy`
--
ALTER TABLE `visitation_policy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `visitor_log_entries`
--
ALTER TABLE `visitor_log_entries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `visitor_pdl_schedule_events`
--
ALTER TABLE `visitor_pdl_schedule_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pdl_schedule_event` (`pdl_id`,`changed_at`),
  ADD KEY `changed_by` (`changed_by`);

--
-- Indexes for table `visitor_qr_identities`
--
ALTER TABLE `visitor_qr_identities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `visitor_record_id` (`visitor_record_id`),
  ADD UNIQUE KEY `qr_token` (`qr_token`);

--
-- Indexes for table `visitor_records`
--
ALTER TABLE `visitor_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `visitor_code` (`visitor_code`),
  ADD UNIQUE KEY `legacy_user_id` (`legacy_user_id`),
  ADD KEY `idx_visitor_name` (`full_name`),
  ADD KEY `idx_visitor_status` (`status`,`is_archived`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `archived_by` (`archived_by`);

--
-- Indexes for table `visitor_restrictions`
--
ALTER TABLE `visitor_restrictions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_restriction_scope` (`visitor_record_id`,`scope`,`pdl_id`,`status`,`effective_at`,`expires_at`),
  ADD KEY `idx_restriction_expiry` (`status`,`expires_at`),
  ADD KEY `pdl_id` (`pdl_id`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `removed_by` (`removed_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointment_notifications`
--
ALTER TABLE `appointment_notifications`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=199;

--
-- AUTO_INCREMENT for table `auth_otps`
--
ALTER TABLE `auth_otps`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `kyc_documents`
--
ALTER TABLE `kyc_documents`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `kyc_submissions`
--
ALTER TABLE `kyc_submissions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pdl_schedule_notifications`
--
ALTER TABLE `pdl_schedule_notifications`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pdl_visitor_assignments`
--
ALTER TABLE `pdl_visitor_assignments`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `pdl_visitor_assignment_events`
--
ALTER TABLE `pdl_visitor_assignment_events`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `pdl_visitor_links`
--
ALTER TABLE `pdl_visitor_links`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `profile_change_requests`
--
ALTER TABLE `profile_change_requests`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `record_archive_events`
--
ALTER TABLE `record_archive_events`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `visitor_pdl_schedule_events`
--
ALTER TABLE `visitor_pdl_schedule_events`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `visitor_qr_identities`
--
ALTER TABLE `visitor_qr_identities`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `visitor_records`
--
ALTER TABLE `visitor_records`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `visitor_restrictions`
--
ALTER TABLE `visitor_restrictions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account_change_requests`
--
ALTER TABLE `account_change_requests`
  ADD CONSTRAINT `account_change_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `auth_otps`
--
ALTER TABLE `auth_otps`
  ADD CONSTRAINT `auth_otps_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD CONSTRAINT `auth_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `gate_verification_sessions`
--
ALTER TABLE `gate_verification_sessions`
  ADD CONSTRAINT `gate_verification_sessions_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `gate_verification_sessions_ibfk_2` FOREIGN KEY (`visitor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `gate_verification_sessions_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`);

--
-- Constraints for table `guest_visitation_logs`
--
ALTER TABLE `guest_visitation_logs`
  ADD CONSTRAINT `guest_visitation_logs_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  ADD CONSTRAINT `guest_visitation_logs_ibfk_2` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `guest_visitation_logs_ibfk_3` FOREIGN KEY (`checked_out_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `kyc_documents`
--
ALTER TABLE `kyc_documents`
  ADD CONSTRAINT `kyc_documents_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `kyc_submissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `kyc_submissions`
--
ALTER TABLE `kyc_submissions`
  ADD CONSTRAINT `kyc_submissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pdl_schedule_notifications`
--
ALTER TABLE `pdl_schedule_notifications`
  ADD CONSTRAINT `pdl_schedule_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `pdl_schedule_notifications_ibfk_2` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`);

--
-- Constraints for table `pdl_visitation_logs`
--
ALTER TABLE `pdl_visitation_logs`
  ADD CONSTRAINT `pdl_visitation_logs_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  ADD CONSTRAINT `pdl_visitation_logs_ibfk_2` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `pdl_visitation_logs_ibfk_3` FOREIGN KEY (`checked_out_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pdl_visitation_logs_ibfk_4` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`);

--
-- Constraints for table `pdl_visitation_schedules`
--
ALTER TABLE `pdl_visitation_schedules`
  ADD CONSTRAINT `pdl_visitation_schedules_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  ADD CONSTRAINT `pdl_visitation_schedules_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `pdl_visitor_assignments`
--
ALTER TABLE `pdl_visitor_assignments`
  ADD CONSTRAINT `pdl_visitor_assignments_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  ADD CONSTRAINT `pdl_visitor_assignments_ibfk_2` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  ADD CONSTRAINT `pdl_visitor_assignments_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `pdl_visitor_assignments_ibfk_4` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pdl_visitor_assignment_events`
--
ALTER TABLE `pdl_visitor_assignment_events`
  ADD CONSTRAINT `pdl_visitor_assignment_events_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `pdl_visitor_assignments` (`id`),
  ADD CONSTRAINT `pdl_visitor_assignment_events_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pdl_visitor_links`
--
ALTER TABLE `pdl_visitor_links`
  ADD CONSTRAINT `pdl_visitor_links_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  ADD CONSTRAINT `pdl_visitor_links_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `profile_change_requests`
--
ALTER TABLE `profile_change_requests`
  ADD CONSTRAINT `profile_change_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `profile_change_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `record_archive_events`
--
ALTER TABLE `record_archive_events`
  ADD CONSTRAINT `record_archive_events_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `visitor_pdl_schedule_events`
--
ALTER TABLE `visitor_pdl_schedule_events`
  ADD CONSTRAINT `visitor_pdl_schedule_events_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  ADD CONSTRAINT `visitor_pdl_schedule_events_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `visitor_qr_identities`
--
ALTER TABLE `visitor_qr_identities`
  ADD CONSTRAINT `visitor_qr_identities_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`);

--
-- Constraints for table `visitor_records`
--
ALTER TABLE `visitor_records`
  ADD CONSTRAINT `visitor_records_ibfk_1` FOREIGN KEY (`legacy_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `visitor_records_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `visitor_records_ibfk_3` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `visitor_restrictions`
--
ALTER TABLE `visitor_restrictions`
  ADD CONSTRAINT `visitor_restrictions_ibfk_1` FOREIGN KEY (`visitor_record_id`) REFERENCES `visitor_records` (`id`),
  ADD CONSTRAINT `visitor_restrictions_ibfk_2` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`),
  ADD CONSTRAINT `visitor_restrictions_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `visitor_restrictions_ibfk_4` FOREIGN KEY (`removed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
