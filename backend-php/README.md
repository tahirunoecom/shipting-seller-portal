# Partner Signup API - Backend

PHP backend for handling partner signups with OTP verification.

## 📦 Files

- `partner-signup-api.php` - Main API handler
- `config.php` - Configuration (use config-local.php for secrets)
- `database-migration.sql` - Database schema
- `PartnerSignupController-Laravel-Example.php` - Laravel controller example
- `composer.json` - PHP dependencies
- `.htaccess` - Apache routing configuration

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
composer install
```

### 2. Configure

Create `config-local.php`:

```php
<?php
define('ENVIRONMENT', 'production');
define('BASE_URL', 'https://www.shipting.com');

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'shipting_db');
define('DB_USER', 'your_user');
define('DB_PASS', 'your_password');

// Twilio
define('TWILIO_ACCOUNT_SID', 'ACxxx...');
define('TWILIO_AUTH_TOKEN', 'your_token');
define('TWILIO_PHONE_NUMBER', '+1234567890');

// ElasticEmail
define('ELASTICEMAIL_API_KEY', 'your_key');

// Admin
define('ADMIN_EMAIL', 'admin@shipting.com');
```

### 3. Setup Database

```bash
mysql -u root -p your_database < database-migration.sql
```

### 4. Test

```bash
# Test send OTP
curl -X POST http://localhost/backend-php/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890"}'

# Test verify OTP
curl -X POST http://localhost/backend-php/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890","otp":"123456"}'
```

## 🔐 Security

- Never commit `config-local.php`
- Use HTTPS in production
- Enable rate limiting
- Keep dependencies updated

## 📚 Documentation

See `../PARTNER-LANDING-PAGE-SETUP.md` for complete setup guide.

## 🐛 Issues

Check logs at `logs/error.log` (create directory if needed):

```bash
mkdir -p logs
chmod 755 logs
```

## 📞 Support

Email: admin@shipting.com
