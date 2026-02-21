-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 21, 2026 at 11:38 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `crms`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `hours_worked` decimal(4,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `employee_id`, `site_id`, `date`, `check_in`, `check_out`, `hours_worked`, `notes`, `created_at`) VALUES
(1, 1, 2, '2026-02-13', '15:04:00', '15:05:00', 8.00, NULL, '2026-02-13 13:00:42');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'LOGIN', NULL, NULL, NULL, NULL, '::1', NULL, '2026-01-04 17:27:25'),
(2, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-10 23:46:35'),
(3, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-10 23:47:02'),
(4, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-10 23:56:02'),
(5, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-10 23:56:11'),
(6, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-11 01:18:51'),
(7, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-11 01:22:17'),
(8, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-12 10:27:02'),
(9, 1, 'CHANGE_PASSWORD', 'users', 1, NULL, NULL, NULL, NULL, '2026-01-12 10:27:17'),
(10, 1, 'CREATE_USER', 'users', 2, NULL, '{\"email\":\"it.elias38@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"PROJECT_MANAGER\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 02:10:09'),
(11, NULL, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 02:11:47'),
(12, NULL, 'CHANGE_PASSWORD', 'users', 2, NULL, NULL, NULL, NULL, '2026-01-13 02:12:37'),
(13, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 02:47:08'),
(14, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 09:11:42'),
(15, NULL, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 09:24:09'),
(16, NULL, 'CREATE_PROJECT', 'projects', 1, NULL, '{\"name\":\"Building BK Arena\",\"description\":\"I like to build\",\"start_date\":\"2026-01-14\",\"end_date\":\"2026-01-30\",\"budget\":\"2999999.82\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 09:25:19'),
(17, NULL, 'UPDATE_PROJECT', 'projects', 1, NULL, '{\"name\":\"Building BK Arena\",\"description\":\"I like to build\",\"start_date\":\"2026-01-13\",\"end_date\":\"2026-01-29\",\"budget\":\"2999999.82\",\"status\":\"PLANNING\"}', NULL, NULL, '2026-01-13 10:52:57'),
(18, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 11:44:29'),
(19, 1, 'CREATE_USER', 'users', 3, NULL, '{\"email\":\"dukuzelie123@gmail.com\",\"first_name\":\"musabeyezu\",\"last_name\":\"phoebe\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 11:45:06'),
(20, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 11:45:34'),
(21, 3, 'CHANGE_PASSWORD', 'users', 3, NULL, NULL, NULL, NULL, '2026-01-13 11:45:58'),
(22, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 17:04:31'),
(23, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 18:20:12'),
(24, 1, 'CREATE_USER', 'users', 4, NULL, '{\"email\":\"jeannette@gmail.com\",\"first_name\":\"BUGENIMANA \",\"last_name\":\"Jeannette\",\"role\":\"PROCUREMENT_OFFICER\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 18:21:10'),
(25, 1, 'CREATE_USER', 'users', 5, NULL, '{\"email\":\"ismael@gmail.com\",\"first_name\":\"NTIRUSHWAMABOKO\",\"last_name\":\"Ismael\",\"role\":\"FINANCE_OFFICER\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 18:22:04'),
(26, 5, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 18:22:55'),
(27, 5, 'CHANGE_PASSWORD', 'users', 5, NULL, NULL, NULL, NULL, '2026-01-13 18:23:16'),
(28, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 18:47:29'),
(29, 4, 'CHANGE_PASSWORD', 'users', 4, NULL, NULL, NULL, NULL, '2026-01-13 18:48:08'),
(30, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 20:42:23'),
(31, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 20:52:24'),
(32, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 20:57:58'),
(33, 1, 'UPDATE_USER', 'users', 2, '{\"email\":\"it.elias38@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"PROJECT_MANAGER\",\"status\":\"ACTIVE\"}', '{\"id\":2,\"email\":\"it.elias38@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"PROJECT_MANAGER\",\"status\":\"INACTIVE\",\"created_at\":\"2026-01-13T02:10:09.000Z\"}', NULL, NULL, '2026-01-13 21:01:26'),
(34, 1, 'UPDATE_USER', 'users', 2, '{\"email\":\"it.elias38@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"PROJECT_MANAGER\",\"status\":\"INACTIVE\"}', '{\"id\":2,\"email\":\"it.elias38@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"PROJECT_MANAGER\",\"status\":\"ACTIVE\",\"created_at\":\"2026-01-13T02:10:09.000Z\"}', NULL, NULL, '2026-01-13 21:01:33'),
(35, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:13:50'),
(36, 1, 'CREATE_USER', 'users', 6, NULL, '{\"email\":\"ishimwe@gmail.com\",\"first_name\":\"Patience\",\"last_name\":\"Ishimwe\",\"role\":\"PROJECT_MANAGER\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 21:15:31'),
(37, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:18:42'),
(38, 6, 'CHANGE_PASSWORD', 'users', 6, NULL, NULL, NULL, NULL, '2026-01-13 21:19:42'),
(39, 6, 'CREATE_PROJECT', 'projects', 2, NULL, '{\"name\":\"Build BK\",\"description\":\"I am building my a BK\",\"start_date\":\"2026-01-15\",\"end_date\":\"2026-01-15\",\"budget\":\"4000000\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-13 21:24:39'),
(40, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:28:47'),
(41, 6, 'CREATE_TASK', 'tasks', 1, NULL, '{\"project_id\":2,\"assigned_to\":\"3\",\"title\":\"Do it\",\"description\":\"Do it\",\"due_date\":\"2026-01-14\",\"priority\":\"MEDIUM\"}', NULL, NULL, '2026-01-13 21:29:05'),
(42, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:29:21'),
(43, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:29:34'),
(44, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:30:11'),
(45, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:32:06'),
(46, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:33:17'),
(47, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:33:29'),
(48, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:33:40'),
(49, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:39:49'),
(50, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:40:11'),
(51, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-13 21:47:30'),
(52, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-25 22:52:21'),
(53, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-25 23:08:02'),
(54, 6, 'UPDATE_PROJECT', 'projects', 2, NULL, '{\"name\":\"Build BK\",\"description\":\"I am building my a BK\",\"start_date\":\"2026-01-14\",\"end_date\":\"2026-01-14\",\"budget\":\"4000000.00\",\"status\":\"COMPLETED\"}', NULL, NULL, '2026-01-25 23:08:17'),
(55, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-25 23:09:01'),
(56, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-25 23:09:40'),
(57, 4, 'CREATE_SUPPLIER', 'suppliers', 1, NULL, '{\"name\":\"Elias\",\"contact_email\":\"it.elias38@gmail.com\",\"contact_phone\":\"+250785354935\",\"address\":\"Kirehe\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-01-25 23:43:17'),
(58, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-25 23:45:10'),
(59, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-25 23:45:37'),
(60, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-26 00:10:03'),
(61, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-26 00:11:07'),
(62, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-01-26 00:12:44'),
(63, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 13:13:23'),
(64, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 13:23:59'),
(65, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 13:59:44'),
(66, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 14:00:15'),
(67, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 19:03:59'),
(68, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 19:07:11'),
(69, 4, 'CREATE_MATERIAL', 'materials', 1, NULL, '{\"name\":\"Hammer\",\"description\":\"I like hammer\",\"unit\":\"20pieces\",\"category\":\"Contruction\",\"current_stock\":0,\"min_stock_level\":1,\"unit_price\":5000}', NULL, NULL, '2026-02-09 19:41:56'),
(70, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 19:50:32'),
(71, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 19:51:26'),
(72, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 19:51:52'),
(73, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:10:28'),
(74, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:10:52'),
(75, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:30:46'),
(76, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:31:14'),
(77, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:54:16'),
(78, 6, 'CREATE_SITE', 'sites', 1, NULL, '{\"project_id\":\"2\",\"name\":\"BK 1\",\"location\":\"Muhima\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-02-09 20:55:02'),
(79, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:55:23'),
(80, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 20:55:50'),
(81, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 21:51:51'),
(82, 6, 'CREATE_SITE', 'sites', 2, NULL, '{\"project_id\":\"2\",\"name\":\"BK Arena 1\",\"location\":\"Kamombo\",\"supervisor_id\":3,\"status\":\"ACTIVE\"}', NULL, NULL, '2026-02-09 21:52:33'),
(83, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-09 21:52:48'),
(84, 3, 'CREATE_MATERIAL_REQUEST', 'material_requests', 1, NULL, '{\"site_id\":2,\"material_id\":1,\"quantity\":10,\"priority\":\"HIGH\",\"notes\":\"I like it\"}', NULL, NULL, '2026-02-09 21:55:42'),
(85, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-10 10:25:49'),
(86, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-10 10:28:12'),
(87, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-10 12:14:12'),
(88, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-10 12:41:55'),
(89, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-10 13:32:09'),
(90, 1, 'CREATE_USER', 'users', 7, NULL, '{\"email\":\"sylviaa@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-02-11 09:09:33'),
(91, 1, 'UPDATE_USER', 'users', 7, '{\"email\":\"sylviaa@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"ACTIVE\"}', '{\"id\":7,\"email\":\"sylviaa@gmail.com\",\"first_name\":\"DUKUZUMUREMYI\",\"last_name\":\"Elias\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"INACTIVE\",\"created_at\":\"2026-02-11T09:09:33.000Z\"}', NULL, NULL, '2026-02-11 09:09:50'),
(92, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-12 09:26:29'),
(93, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-12 09:43:43'),
(94, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-12 09:47:58'),
(95, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-12 13:02:46'),
(96, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-12 14:07:33'),
(97, 6, 'APPROVE_MATERIAL_REQUEST', 'material_requests', 1, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-12 16:24:30'),
(98, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 10:25:55'),
(99, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 10:26:45'),
(100, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 10:51:23'),
(101, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 10:51:50'),
(102, 4, 'CREATE_MATERIAL', 'materials', 2, NULL, '{\"name\":\"Screw driver\",\"description\":\"Construction tools\",\"unit\":\"30pieces\",\"category\":\"Construction tools\",\"current_stock\":0,\"min_stock_level\":30,\"unit_price\":2000}', NULL, NULL, '2026-02-13 11:27:24'),
(103, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 11:29:37'),
(104, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 11:29:54'),
(105, 3, 'CREATE_MATERIAL_REQUEST', 'material_requests', 2, NULL, '{\"site_id\":\"2\",\"material_id\":\"2\",\"quantity\":\"20\",\"priority\":\"HIGH\",\"notes\":\"I like it\"}', NULL, NULL, '2026-02-13 11:33:08'),
(106, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 12:21:16'),
(107, 1, 'CREATE_EMPLOYEE', 'employees', 1, NULL, '{\"user_id\":\"6\",\"employee_id\":\"EMP001\",\"phone\":\"0785354935\",\"address\":\"Kirehe, mahama\",\"position\":\"Mason\",\"hire_date\":\"2026-02-13\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-02-13 12:25:49'),
(108, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 12:26:07'),
(109, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 1, NULL, '{\"site_id\":\"2\",\"description\":\"I like \",\"needed_from\":\"2026-02-20\",\"needed_until\":\"2026-02-26\",\"notes\":\"yes\"}', NULL, NULL, '2026-02-13 13:17:41'),
(110, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 2, NULL, '{\"site_id\":\"2\",\"description\":\"i like\",\"needed_from\":\"2026-02-25\",\"needed_until\":\"2026-02-28\",\"notes\":\"i like\"}', NULL, NULL, '2026-02-13 13:22:32'),
(111, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:23:11'),
(112, 1, 'CREATE_EQUIPMENT', 'equipment', 1, NULL, '{\"name\":\"Asset\",\"type\":\"Heavy\",\"serial_number\":\"Asset tag\",\"status\":\"AVAILABLE\",\"purchase_date\":\"2026-02-12\",\"purchase_cost\":\"30000\"}', NULL, NULL, '2026-02-13 13:23:50'),
(113, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:24:51'),
(114, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:25:23'),
(115, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:25:55'),
(116, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:27:12'),
(117, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:29:58'),
(118, 6, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', 2, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-13 13:30:13'),
(119, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:33:04'),
(120, 5, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 13:33:27'),
(121, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 14:32:08'),
(122, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 14:33:35'),
(123, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-13 14:34:00'),
(124, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-14 22:30:15'),
(125, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-14 22:46:59'),
(126, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 3, NULL, '{\"site_id\":\"2\",\"description\":\"dfbghnb\",\"needed_from\":\"2026-02-27\",\"needed_until\":\"2026-02-28\",\"notes\":\"rgdtfgh\"}', NULL, NULL, '2026-02-14 22:59:17'),
(127, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-14 22:59:50'),
(128, 6, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', 3, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-14 23:00:10'),
(129, 6, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', 1, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-14 23:00:19'),
(130, 6, 'APPROVE_MATERIAL_REQUEST', 'material_requests', 2, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-14 23:00:28'),
(131, 6, 'CREATE_PROJECT', 'projects', 3, NULL, '{\"name\":\"Test\",\"description\":\"Hello\",\"start_date\":\"2026-02-18\",\"end_date\":\"2026-02-26\",\"budget\":\"600000\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-02-15 02:37:08'),
(132, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:43:32'),
(133, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 4, NULL, '{\"site_id\":\"2\",\"description\":\"hjjhj\",\"needed_from\":\"2026-02-17\",\"needed_until\":\"2026-02-28\",\"notes\":\"\"}', NULL, NULL, '2026-02-15 02:44:08'),
(134, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:44:50'),
(135, 6, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', 4, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-15 02:44:59'),
(136, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:45:11'),
(137, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:49:19'),
(138, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:53:31'),
(139, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:55:14'),
(140, 5, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:55:38'),
(141, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 02:57:15'),
(142, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:02:15'),
(143, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:02:34'),
(144, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 5, NULL, '{\"site_id\":\"2\",\"description\":\"nm\",\"needed_from\":\"2026-02-25\",\"needed_until\":\"2026-02-26\",\"notes\":\"mnj,km\"}', NULL, NULL, '2026-02-15 03:06:10'),
(145, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 6, NULL, '{\"site_id\":\"2\",\"description\":\"gvvhbj\",\"needed_from\":\"2026-02-19\",\"needed_until\":\"2026-02-26\",\"notes\":\"ygghbjn\"}', NULL, NULL, '2026-02-15 03:11:08'),
(146, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:11:26'),
(147, 6, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', 6, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-15 03:11:41'),
(148, 6, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', 5, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-15 03:11:46'),
(149, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:12:34'),
(150, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:13:41'),
(151, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 7, NULL, '{\"site_id\":\"2\",\"description\":\"jhkjlk\",\"needed_from\":\"2026-02-17\",\"needed_until\":\"2026-02-26\",\"notes\":\"jkl;\"}', NULL, NULL, '2026-02-15 03:26:38'),
(152, 3, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', 8, NULL, '{\"site_id\":\"2\",\"equipment_id\":\"1\",\"description\":\"hjkl\",\"needed_from\":\"2026-02-25\",\"needed_until\":\"2026-02-18\",\"notes\":\"jkll\"}', NULL, NULL, '2026-02-15 03:32:55'),
(153, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:37:43'),
(154, 1, 'CREATE_EQUIPMENT', 'equipment', 2, NULL, '{\"name\":\"Crane\",\"type\":\"Light\",\"serial_number\":\"209\",\"status\":\"AVAILABLE\",\"purchase_date\":\"2026-02-25\",\"purchase_cost\":\"5000\"}', NULL, NULL, '2026-02-15 03:38:15'),
(155, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:38:26'),
(156, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:42:08'),
(157, 5, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:44:03'),
(158, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:55:11'),
(159, 1, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 03:58:04'),
(160, 1, 'CREATE_USER', 'users', 8, NULL, '{\"email\":\"sylviau@gmail.com\",\"first_name\":\"Crane\",\"last_name\":\"Crane\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"ACTIVE\"}', NULL, NULL, '2026-02-15 04:03:23'),
(161, 1, 'UPDATE_USER', 'users', 8, '{\"email\":\"sylviau@gmail.com\",\"first_name\":\"Crane\",\"last_name\":\"Crane\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"ACTIVE\"}', '{\"id\":8,\"email\":\"sylviau@gmail.com\",\"first_name\":\"Crane\",\"last_name\":\"Crane\",\"role\":\"SITE_SUPERVISOR\",\"status\":\"INACTIVE\",\"created_at\":\"2026-02-15T04:03:23.000Z\"}', NULL, NULL, '2026-02-15 04:03:50'),
(162, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:04:34'),
(163, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:12:46'),
(164, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:18:39'),
(165, 3, 'CREATE_MATERIAL_REQUEST', 'material_requests', 3, NULL, '{\"site_id\":\"2\",\"material_id\":\"2\",\"quantity\":\"30\",\"priority\":\"URGENT\",\"notes\":\"gfhgjhkj\"}', NULL, NULL, '2026-02-15 04:19:00'),
(166, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:19:12'),
(167, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:30:41'),
(168, 3, 'CREATE_MATERIAL_REQUEST', 'material_requests', 4, NULL, '{\"site_id\":\"2\",\"material_id\":\"1\",\"quantity\":\"6\",\"priority\":\"HIGH\",\"notes\":\"gbhjjn\"}', NULL, NULL, '2026-02-15 04:31:18'),
(169, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:31:31'),
(170, 6, 'APPROVE_MATERIAL_REQUEST', 'material_requests', 4, NULL, '{\"status\":\"APPROVED\"}', NULL, NULL, '2026-02-15 04:31:45'),
(171, 3, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-15 04:31:56'),
(172, 6, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-19 11:48:00'),
(173, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-19 11:58:30'),
(174, 4, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-21 22:18:18'),
(175, 5, 'LOGIN', 'users', NULL, NULL, NULL, NULL, NULL, '2026-02-21 22:18:43');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','TERMINATED') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `user_id`, `employee_id`, `phone`, `address`, `position`, `hire_date`, `status`, `created_at`) VALUES
(1, 6, 'EMP001', '0785354935', 'Kirehe, mahama', 'Mason', '2026-02-13', 'ACTIVE', '2026-02-13 12:25:49');

-- --------------------------------------------------------

--
-- Table structure for table `equipment`
--

CREATE TABLE `equipment` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `status` enum('AVAILABLE','IN_USE','MAINTENANCE','RETIRED') DEFAULT 'AVAILABLE',
  `purchase_date` date DEFAULT NULL,
  `purchase_cost` decimal(15,2) DEFAULT NULL,
  `hours_used` decimal(10,2) DEFAULT 0.00,
  `last_used` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `site_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `equipment`
--

INSERT INTO `equipment` (`id`, `name`, `type`, `serial_number`, `status`, `purchase_date`, `purchase_cost`, `hours_used`, `last_used`, `notes`, `created_at`, `site_id`) VALUES
(1, 'Asset', 'Heavy', 'Asset tag', 'IN_USE', '2026-02-12', 30000.00, 9.00, '2026-02-15 03:33:32', 'i', '2026-02-13 13:23:50', 2),
(2, 'Crane', 'Light', '209', 'MAINTENANCE', '2026-02-25', 5000.00, 0.00, '2026-02-15 03:40:16', 'n', '2026-02-15 03:38:15', 2);

-- --------------------------------------------------------

--
-- Table structure for table `equipment_requests`
--

CREATE TABLE `equipment_requests` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `equipment_id` int(11) DEFAULT NULL,
  `request_date` date NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','FULFILLED') DEFAULT 'PENDING',
  `needed_from` date DEFAULT NULL,
  `needed_until` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `equipment_requests`
--

INSERT INTO `equipment_requests` (`id`, `site_id`, `requested_by`, `equipment_id`, `request_date`, `status`, `needed_from`, `needed_until`, `description`, `notes`, `rejection_reason`, `approved_by`, `approved_at`, `created_at`) VALUES
(1, 2, 3, NULL, '2026-02-13', 'APPROVED', '2026-02-20', '2026-02-26', 'I like', 'yes', NULL, 6, '2026-02-14 23:00:19', '2026-02-13 13:17:41'),
(2, 2, 3, NULL, '2026-02-13', 'APPROVED', '2026-02-25', '2026-02-28', 'i like', 'i like', NULL, 6, '2026-02-13 13:30:13', '2026-02-13 13:22:32'),
(3, 2, 3, NULL, '2026-02-14', 'APPROVED', '2026-02-27', '2026-02-28', 'dfbghnb', 'rgdtfgh', NULL, 6, '2026-02-14 23:00:10', '2026-02-14 22:59:17'),
(4, 2, 3, NULL, '2026-02-15', 'APPROVED', '2026-02-17', '2026-02-28', 'hjjhj', NULL, NULL, 6, '2026-02-15 02:44:59', '2026-02-15 02:44:08'),
(5, 2, 3, NULL, '2026-02-15', 'APPROVED', '2026-02-25', '2026-02-26', 'nm', 'mnj,km', NULL, 6, '2026-02-15 03:11:46', '2026-02-15 03:06:10'),
(6, 2, 3, NULL, '2026-02-15', 'APPROVED', '2026-02-19', '2026-02-26', 'gvvhbj', 'ygghbjn', NULL, 6, '2026-02-15 03:11:41', '2026-02-15 03:11:08'),
(7, 2, 3, NULL, '2026-02-15', 'PENDING', '2026-02-17', '2026-02-26', 'jhkjlk', 'jkl;', NULL, NULL, NULL, '2026-02-15 03:26:38'),
(8, 2, 3, 1, '2026-02-15', 'PENDING', '2026-02-25', '2026-02-18', 'hjkl', 'jkll', NULL, NULL, NULL, '2026-02-15 03:32:55');

-- --------------------------------------------------------

--
-- Table structure for table `equipment_usage`
--

CREATE TABLE `equipment_usage` (
  `id` int(11) NOT NULL,
  `equipment_id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `used_by` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `category` enum('MATERIALS','LABOR','EQUIPMENT','SUPPLIES','SERVICES','OTHER') NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `expense_date` date NOT NULL,
  `payment_status` enum('PENDING','APPROVED','REJECTED','PAID') DEFAULT 'PENDING',
  `approved_by` int(11) DEFAULT NULL,
  `paid_by` int(11) DEFAULT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `receipt_path` varchar(255) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `project_id`, `category`, `description`, `amount`, `expense_date`, `payment_status`, `approved_by`, `paid_by`, `invoice_number`, `receipt_path`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, 'SUPPLIES', 'i LIKE IT', 2000.00, '2026-02-13', 'PAID', 5, 5, 'INV1', NULL, 5, '2026-02-13 13:52:00', '2026-02-13 13:52:35'),
(2, 3, 'EQUIPMENT', 'hjjkj', 1000000.00, '2026-02-15', 'APPROVED', 5, NULL, 'jkj', NULL, 5, '2026-02-15 03:46:37', '2026-02-15 03:47:29');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_transactions`
--

CREATE TABLE `inventory_transactions` (
  `id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `transaction_type` enum('PURCHASE','ISSUE','RETURN','ADJUSTMENT') NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `po_id` int(11) DEFAULT NULL,
  `site_id` int(11) DEFAULT NULL,
  `performed_by` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `materials`
--

CREATE TABLE `materials` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `current_stock` decimal(10,2) DEFAULT 0.00,
  `min_stock_level` decimal(10,2) DEFAULT 0.00,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `materials`
--

INSERT INTO `materials` (`id`, `name`, `description`, `unit`, `category`, `current_stock`, `min_stock_level`, `unit_price`, `created_at`, `updated_at`) VALUES
(1, 'Hammer', 'I like hammer', '20pieces', 'Contruction', 0.00, 1.00, 5000.00, '2026-02-09 19:41:56', '2026-02-09 19:41:56'),
(2, 'Screw driver', 'Construction tools', '30pieces', 'Construction tools', 0.00, 30.00, 2000.00, '2026-02-13 11:27:24', '2026-02-13 11:27:24');

-- --------------------------------------------------------

--
-- Table structure for table `material_requests`
--

CREATE TABLE `material_requests` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','FULFILLED') DEFAULT 'PENDING',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `priority` enum('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `material_requests`
--

INSERT INTO `material_requests` (`id`, `site_id`, `requested_by`, `material_id`, `quantity`, `status`, `approved_by`, `approved_at`, `notes`, `created_at`, `priority`, `rejection_reason`) VALUES
(1, 2, 3, 1, 10.00, 'APPROVED', 6, '2026-02-12 16:24:30', 'I like it', '2026-02-09 21:55:42', 'HIGH', NULL),
(2, 2, 3, 2, 20.00, 'APPROVED', 6, '2026-02-14 23:00:28', 'I like it', '2026-02-13 11:33:08', 'HIGH', NULL),
(3, 2, 3, 2, 30.00, 'PENDING', NULL, NULL, 'gfhgjhkj', '2026-02-15 04:19:00', 'URGENT', NULL),
(4, 2, 3, 1, 6.00, 'APPROVED', 6, '2026-02-15 04:31:45', 'gbhjjn', '2026-02-15 04:31:18', 'HIGH', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `type` enum('INFO','WARNING','ALERT','SUCCESS') DEFAULT 'INFO',
  `is_read` tinyint(1) DEFAULT 0,
  `related_module` varchar(100) DEFAULT NULL,
  `related_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `target_role` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `related_module`, `related_id`, `created_at`, `target_role`) VALUES
(1, NULL, 'Test notification', 'Sample notification for Project Manager - you can approve material requests', 'INFO', 1, NULL, NULL, '2026-02-15 04:25:10', 'PROJECT_MANAGER'),
(2, NULL, 'Welcome', 'Sample notification for Site Supervisor', 'INFO', 1, NULL, NULL, '2026-02-15 04:25:10', 'SITE_SUPERVISOR'),
(3, NULL, 'Payment reminder', 'Sample notification for Finance Officer', 'INFO', 1, NULL, NULL, '2026-02-15 04:25:10', 'FINANCE_OFFICER'),
(4, NULL, 'PO update', 'Sample notification for Procurement Officer', 'INFO', 1, NULL, NULL, '2026-02-15 04:25:10', 'PROCUREMENT_OFFICER'),
(5, NULL, 'System broadcast', 'This is a broadcast notification visible to all users', 'INFO', 1, NULL, NULL, '2026-02-15 04:25:10', NULL),
(6, NULL, 'Admin alert', 'Sample notification for System Admin - track all system activity', 'INFO', 0, NULL, NULL, '2026-02-15 04:25:31', 'SYSTEM_ADMIN'),
(7, NULL, 'New material request: Hammer for BK Arena 1 (pending approval)', 'New material request: Hammer for BK Arena 1 (pending approval)', 'INFO', 1, NULL, NULL, '2026-02-15 04:31:18', 'PROJECT_MANAGER'),
(8, 3, 'Your material request has been approved', 'Your material request has been approved', 'INFO', 0, NULL, NULL, '2026-02-15 04:31:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `project_manager_id` int(11) DEFAULT NULL,
  `status` enum('PLANNING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') DEFAULT 'PLANNING',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `name`, `description`, `start_date`, `end_date`, `budget`, `project_manager_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Building BK Arena', 'I like to build', '2026-01-13', '2026-01-29', 2999999.82, NULL, 'PLANNING', '2026-01-13 09:25:19', '2026-01-13 10:52:57'),
(2, 'Build BK', 'I am building my a BK', '2026-01-14', '2026-01-14', 4000000.00, 6, 'COMPLETED', '2026-01-13 21:24:39', '2026-01-25 23:08:17'),
(3, 'Test', 'Hello', '2026-02-18', '2026-02-26', 600000.00, 6, 'PLANNING', '2026-02-15 02:37:08', '2026-02-15 02:37:08');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `order_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `status` enum('DRAFT','PENDING','APPROVED','REJECTED','ORDERED','DELIVERED','CANCELLED') DEFAULT 'DRAFT',
  `total_amount` decimal(15,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `po_number`, `supplier_id`, `created_by`, `order_date`, `expected_delivery_date`, `status`, `total_amount`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'PO-1770666188509', 1, 4, '2026-02-09', '2026-02-15', 'DELIVERED', 50000.00, 'I like it ', '2026-02-09 19:43:08', '2026-02-15 03:01:58'),
(2, 'PO-1771125181272', 1, 4, '2026-02-18', '2026-02-19', 'DRAFT', 40200.00, 'gg', '2026-02-15 03:13:01', '2026-02-15 03:13:01');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `purchase_order_items`
--

INSERT INTO `purchase_order_items` (`id`, `po_id`, `material_id`, `quantity`, `unit_price`, `total_price`) VALUES
(1, 1, 1, 10.00, 5000.00, 50000.00),
(2, 2, 2, 67.00, 600.00, 40200.00);

-- --------------------------------------------------------

--
-- Table structure for table `quotations`
--

CREATE TABLE `quotations` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `valid_until` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `quotation_date` date DEFAULT NULL,
  `validity_period` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PENDING',
  `created_by` int(11) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `quotations`
--

INSERT INTO `quotations` (`id`, `supplier_id`, `material_id`, `unit_price`, `valid_until`, `notes`, `created_at`, `quotation_date`, `validity_period`, `status`, `created_by`, `quantity`, `total`) VALUES
(1, 1, 1, 5000.00, NULL, 'I like it', '2026-02-09 19:49:37', '2026-02-09', 30, 'PENDING', 4, 10.00, 50000.00);

-- --------------------------------------------------------

--
-- Table structure for table `sites`
--

CREATE TABLE `sites` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `supervisor_id` int(11) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `sites`
--

INSERT INTO `sites` (`id`, `project_id`, `name`, `location`, `supervisor_id`, `status`, `created_at`) VALUES
(1, 2, 'BK 1', 'Muhima', NULL, 'ACTIVE', '2026-02-09 20:55:02'),
(2, 2, 'BK Arena 1', 'Kamombo', 3, 'ACTIVE', '2026-02-09 21:52:33');

-- --------------------------------------------------------

--
-- Table structure for table `site_activities`
--

CREATE TABLE `site_activities` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `reported_by` int(11) NOT NULL,
  `activity_date` date NOT NULL,
  `progress_percentage` decimal(5,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `photos_path` text DEFAULT NULL,
  `weather_conditions` varchar(100) DEFAULT NULL,
  `incidents` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `workforce_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `site_activities`
--

INSERT INTO `site_activities` (`id`, `site_id`, `reported_by`, `activity_date`, `progress_percentage`, `description`, `photos_path`, `weather_conditions`, `incidents`, `created_at`, `workforce_count`) VALUES
(1, 2, 3, '2026-02-13', 29.00, 'Summary', '[\"/uploads/site-photos/site-1770983722463-678807247.jpeg\"]', 'SUNNY', 'Record', '2026-02-13 11:55:22', 0),
(2, 2, 3, '2026-02-14', 18.00, 'p', '[]', 'SUNNY', 'like', '2026-02-14 22:53:20', 5),
(3, 2, 3, '2026-02-17', 35.00, 'jh', '[\"/uploads/site-photos/site-1771125266489-178465957.jpeg\"]', 'PARTLY_CLOUDY', 'hjjm', '2026-02-15 03:14:26', 7);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact_person`, `email`, `phone`, `address`, `status`, `created_at`) VALUES
(1, 'Elias', NULL, 'it.elias38@gmail.com', '+250785354935', 'Kirehe', 'ACTIVE', '2026-01-25 23:43:17');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `assigned_by` int(11) NOT NULL,
  `assigned_to` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `project_id`, `assigned_by`, `assigned_to`, `title`, `description`, `due_date`, `priority`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 6, 3, 'Do it', 'Do it', '2026-01-14', 'MEDIUM', 'PENDING', '2026-01-13 21:29:05', '2026-01-13 21:29:05');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role` enum('SYSTEM_ADMIN','PROJECT_MANAGER','SITE_SUPERVISOR','PROCUREMENT_OFFICER','FINANCE_OFFICER') NOT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `must_change_password` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `role`, `status`, `must_change_password`, `created_at`, `updated_at`) VALUES
(1, 'sylvia@gmail.com', '$2a$10$KlP9Sq28S7sIpSNQHqhaEOrQ4Rk1v9vfNy8lnl6Crz.PuKlHNtivW', 'Sylvia', 'Admin', 'SYSTEM_ADMIN', 'ACTIVE', 0, '2026-01-04 16:49:07', '2026-01-12 10:27:17'),
(3, 'dukuzelie123@gmail.com', '$2a$10$BAp56uvuhOYHUauwuh4DIuzBBR0czOR6jfK8EWa/0mk6I/i//5mfe', 'musabeyezu', 'phoebe', 'SITE_SUPERVISOR', 'ACTIVE', 0, '2026-01-13 11:45:06', '2026-01-13 11:45:58'),
(4, 'jeannette@gmail.com', '$2a$10$3VJp2p8Drk3pCBffi.rQI.UfelgV1/89lfwAW70IqNW8vOo0FYJNK', 'BUGENIMANA ', 'Jeannette', 'PROCUREMENT_OFFICER', 'ACTIVE', 0, '2026-01-13 18:21:10', '2026-01-13 18:48:08'),
(5, 'ismael@gmail.com', '$2a$10$RgZAYqaDTl47PuypfFtGauqrtIc1BCcVQDkaPxhqDRY62ymvUAl3K', 'NTIRUSHWAMABOKO', 'Ismael', 'FINANCE_OFFICER', 'ACTIVE', 0, '2026-01-13 18:22:04', '2026-01-13 18:23:16'),
(6, 'ishimwe@gmail.com', '$2a$10$nob8TiEPrj0Nnl4MEJbbleqbY1I0zfP7fWCSd8O..O9LwxZMrnj.i', 'Patience', 'Ishimwe', 'PROJECT_MANAGER', 'ACTIVE', 0, '2026-01-13 21:15:31', '2026-01-13 21:19:41'),
(8, 'sylviau@gmail.com', '$2a$10$VMjIfEMBwgUsgglgFS02UeZvp/3VI.u3GFsqEPhlR01G.f2rGz63W', 'Crane', 'Crane', 'SITE_SUPERVISOR', 'INACTIVE', 1, '2026-02-15 04:03:23', '2026-02-15 04:03:50');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`employee_id`,`site_id`,`date`),
  ADD KEY `site_id` (`site_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `equipment`
--
ALTER TABLE `equipment`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `equipment_requests`
--
ALTER TABLE `equipment_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `site_id` (`site_id`),
  ADD KEY `requested_by` (`requested_by`);

--
-- Indexes for table `equipment_usage`
--
ALTER TABLE `equipment_usage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `equipment_id` (`equipment_id`),
  ADD KEY `site_id` (`site_id`),
  ADD KEY `used_by` (`used_by`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `paid_by` (`paid_by`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `material_id` (`material_id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `site_id` (`site_id`),
  ADD KEY `performed_by` (`performed_by`);

--
-- Indexes for table `materials`
--
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `site_id` (`site_id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `material_id` (`material_id`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_manager_id` (`project_manager_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `quotations`
--
ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `sites`
--
ALTER TABLE `sites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `supervisor_id` (`supervisor_id`);

--
-- Indexes for table `site_activities`
--
ALTER TABLE `site_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `site_id` (`site_id`),
  ADD KEY `reported_by` (`reported_by`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `assigned_by` (`assigned_by`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=176;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `equipment`
--
ALTER TABLE `equipment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `equipment_requests`
--
ALTER TABLE `equipment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `equipment_usage`
--
ALTER TABLE `equipment_usage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `material_requests`
--
ALTER TABLE `material_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `sites`
--
ALTER TABLE `sites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `site_activities`
--
ALTER TABLE `site_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `equipment_requests`
--
ALTER TABLE `equipment_requests`
  ADD CONSTRAINT `equipment_requests_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `equipment_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `equipment_usage`
--
ALTER TABLE `equipment_usage`
  ADD CONSTRAINT `equipment_usage_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `equipment_usage_ibfk_2` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `equipment_usage_ibfk_3` FOREIGN KEY (`used_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expenses_ibfk_3` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expenses_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `inventory_transactions_ibfk_3` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `inventory_transactions_ibfk_4` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD CONSTRAINT `material_requests_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `material_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `material_requests_ibfk_3` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `material_requests_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`project_manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quotations`
--
ALTER TABLE `quotations`
  ADD CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sites`
--
ALTER TABLE `sites`
  ADD CONSTRAINT `sites_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sites_ibfk_2` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `site_activities`
--
ALTER TABLE `site_activities`
  ADD CONSTRAINT `site_activities_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `site_activities_ibfk_2` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
