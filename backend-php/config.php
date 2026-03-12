<?php
/**
 * Configuration file for Partner Signup API
 *
 * Copy this file and create config-local.php with your actual credentials
 * Add config-local.php to .gitignore to keep credentials secure
 */

// Load environment-specific config if exists
if (file_exists(__DIR__ . '/config-local.php')) {
    require_once __DIR__ . '/config-local.php';
} else {
    // Default configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS

    // Environment
    define('ENVIRONMENT', getenv('ENVIRONMENT') ?: 'production'); // 'development' or 'production'
    define('BASE_URL', getenv('BASE_URL') ?: 'https://www.shipting.com');

    // Database Configuration
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
    define('DB_NAME', getenv('DB_NAME') ?: 'shipting_db');
    define('DB_USER', getenv('DB_USER') ?: 'root');
    define('DB_PASS', getenv('DB_PASS') ?: '');

    // Twilio Configuration
    // Get these from https://console.twilio.com
    define('TWILIO_ACCOUNT_SID', getenv('TWILIO_ACCOUNT_SID') ?: 'your_twilio_account_sid');
    define('TWILIO_AUTH_TOKEN', getenv('TWILIO_AUTH_TOKEN') ?: 'your_twilio_auth_token');
    define('TWILIO_PHONE_NUMBER', getenv('TWILIO_PHONE_NUMBER') ?: '+1234567890');

    // ElasticEmail Configuration
    // Get your API key from https://elasticemail.com/account#/settings/new/create-api
    define('ELASTICEMAIL_API_KEY', getenv('ELASTICEMAIL_API_KEY') ?: 'your_elasticemail_api_key');

    // Admin Email
    define('ADMIN_EMAIL', getenv('ADMIN_EMAIL') ?: 'admin@shipting.com');

    // Timezone
    date_default_timezone_set('America/New_York');
}

// Error reporting based on environment
if (ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/error.log');
}
