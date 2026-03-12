# Partner Landing Page Setup Guide

## 📁 Files Created

1. **`partners-landing-page.html`** - Main landing page with form
2. **`backend-php/partner-signup-api.php`** - API handler for OTP and signup
3. **`backend-php/config.php`** - Configuration file
4. **`backend-php/database-migration.sql`** - Database schema
5. **`shipting-partner-flyer.html`** - Printable marketing flyer with QR code

---

## 🚀 Quick Start

### Step 1: Database Setup

1. Open your MySQL/MariaDB client
2. Run the migration file:

```bash
mysql -u your_username -p your_database < backend-php/database-migration.sql
```

Or import via phpMyAdmin:
- Go to Import tab
- Select `database-migration.sql`
- Click Go

### Step 2: Install PHP Dependencies

```bash
cd backend-php
composer require twilio/sdk
```

### Step 3: Configure Environment

Create `backend-php/config-local.php`:

```php
<?php
// Local configuration - DO NOT commit to Git

define('ENVIRONMENT', 'production'); // or 'development'
define('BASE_URL', 'https://www.shipting.com');

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'shipting_db');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

// Twilio Configuration
// Get from: https://console.twilio.com
define('TWILIO_ACCOUNT_SID', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
define('TWILIO_AUTH_TOKEN', 'your_twilio_auth_token');
define('TWILIO_PHONE_NUMBER', '+1234567890'); // Your Twilio number

// ElasticEmail Configuration
// Get from: https://elasticemail.com/account#/settings/new/create-api
define('ELASTICEMAIL_API_KEY', 'your_elasticemail_api_key');

// Admin Email
define('ADMIN_EMAIL', 'admin@shipting.com');
```

### Step 4: Get API Keys

#### Twilio (for SMS OTP):
1. Sign up at https://www.twilio.com
2. Go to Console Dashboard
3. Copy Account SID and Auth Token
4. Buy a phone number or use trial number

#### ElasticEmail (for sending emails):
1. Sign up at https://elasticemail.com
2. Go to Settings → Create API Key
3. Copy the API key
4. Verify your sender email domain

---

## 📂 Laravel Integration

### Option 1: Place in Public Directory

```bash
# From your Laravel project root
cp partners-landing-page.html public/partners.html
```

Access at: `https://www.shipting.com/partners.html`

### Option 2: Create Laravel Route

1. **Create Controller:**

```bash
php artisan make:controller PartnerController
```

2. **Add to `routes/web.php`:**

```php
Route::get('/partners', [PartnerController::class, 'index'])->name('partners');
```

3. **Create Controller Method:**

```php
// app/Http/Controllers/PartnerController.php
public function index()
{
    return view('partners');
}
```

4. **Create View:**

```bash
cp partners-landing-page.html resources/views/partners.blade.php
```

### Option 3: API Routes (Recommended)

Add to `routes/api.php`:

```php
use App\Http\Controllers\Api\PartnerSignupController;

Route::post('/send-otp', [PartnerSignupController::class, 'sendOTP']);
Route::post('/verify-otp', [PartnerSignupController::class, 'verifyOTP']);
Route::post('/partner-signup', [PartnerSignupController::class, 'signup']);
```

Then create Laravel controller that uses the backend PHP logic or reimplement in Laravel style.

---

## 🔧 Apache/Nginx Configuration

### Apache `.htaccess` for API:

```apache
RewriteEngine On
RewriteRule ^api/send-otp$ backend-php/partner-signup-api.php [L]
RewriteRule ^api/verify-otp$ backend-php/partner-signup-api.php [L]
RewriteRule ^api/partner-signup$ backend-php/partner-signup-api.php [L]
```

### Nginx Configuration:

```nginx
location /api/ {
    try_files $uri $uri/ /backend-php/partner-signup-api.php?$args;
}
```

---

## 📧 Email Configuration

### Testing Emails in Development

Set in `config-local.php`:

```php
define('ENVIRONMENT', 'development');
define('ADMIN_EMAIL', 'your-test-email@gmail.com');
```

### Production Email Setup

1. **Verify Domain in ElasticEmail:**
   - Add SPF record
   - Add DKIM record
   - Verify domain ownership

2. **Update FROM addresses:**
   ```php
   define('ADMIN_EMAIL', 'admin@yourdomain.com');
   ```

---

## 🎨 Customization

### Landing Page:

Edit `partners-landing-page.html`:

- **Colors:** Search for `--primary`, `--secondary`, `--dark` in CSS
- **Content:** Update text in each section
- **Images:** Replace placeholder SVG images with actual WhatsApp screenshots
- **Form fields:** Add/remove fields in the form section

### Email Templates:

Edit methods in `backend-php/partner-signup-api.php`:
- `sendAdminNotification()` - Admin email template
- `sendSellerConfirmation()` - Seller confirmation email

### Flyer:

Edit `shipting-partner-flyer.html`:
- Update contact info
- Change colors and branding
- Add your logo
- Modify pricing

---

## 🖨️ Printing the Flyer

1. Open `shipting-partner-flyer.html` in Chrome/Firefox
2. Click "Print Flyer" button OR use Ctrl+P / Cmd+P
3. Settings:
   - Paper: Letter (8.5" x 11")
   - Color: Yes
   - Margins: None or Minimum
4. Print or Save as PDF

The flyer includes:
- QR code pointing to `partners.shipting.com`
- 2 pages with all key information
- Professional design ready for distribution

---

## 🔒 Security Considerations

1. **Protect config file:**
   ```bash
   chmod 600 backend-php/config-local.php
   ```

2. **Add to `.gitignore`:**
   ```
   backend-php/config-local.php
   backend-php/logs/
   ```

3. **Rate limiting:** Add to API to prevent abuse

4. **Input validation:** Already included but review for your needs

5. **HTTPS only:** Ensure SSL certificate is installed

---

## 🧪 Testing

### Test OTP Flow:

1. Open landing page
2. Fill form with test phone number
3. Click "Verify" button
4. Check if SMS received
5. Enter OTP code
6. Submit form

### Test Email Delivery:

1. Submit form after phone verification
2. Check admin email inbox
3. Check seller email inbox
4. Verify email formatting

### Check Database:

```sql
-- Check OTP records
SELECT * FROM otp_verifications ORDER BY created_at DESC LIMIT 10;

-- Check partner signups
SELECT * FROM partner_signups ORDER BY created_at DESC LIMIT 10;

-- Check email logs
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```

---

## 📊 Monitoring & Maintenance

### Clean Old OTP Records:

Add to cron (daily):

```bash
0 0 * * * mysql -u user -p database -e "DELETE FROM otp_verifications WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY);"
```

### Monitor Signups:

```sql
-- Daily signup stats
SELECT DATE(created_at) as date, COUNT(*) as signups
FROM partner_signups
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Status breakdown
SELECT status, COUNT(*) as count
FROM partner_signups
GROUP BY status;
```

### Email Delivery Rate:

```sql
-- Email success rate
SELECT status, COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM email_logs), 2) as percentage
FROM email_logs
GROUP BY status;
```

---

## 🐛 Troubleshooting

### OTP Not Received:

1. Check Twilio console for delivery status
2. Verify phone number format (include country code)
3. Check Twilio balance
4. Review SMS logs table

### Emails Not Sending:

1. Check ElasticEmail dashboard
2. Verify API key is correct
3. Check email logs table
4. Ensure sender email is verified

### Form Submission Fails:

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check PHP error logs
4. Review database connection

### Database Connection Error:

1. Verify credentials in config-local.php
2. Check if database exists
3. Ensure user has proper permissions
4. Test connection: `mysql -u user -p`

---

## 📞 Support

For issues or questions:
- **Email:** admin@shipting.com
- **Phone:** +1 (555) 123-4567
- **Documentation:** www.shipting.com/docs

---

## ✅ Deployment Checklist

Before going live:

- [ ] Database tables created
- [ ] Config file updated with production credentials
- [ ] Twilio account funded and phone number active
- [ ] ElasticEmail sender domain verified
- [ ] Landing page accessible at partners.shipting.com
- [ ] API endpoints working
- [ ] OTP sending and verification tested
- [ ] Email delivery tested (admin + seller)
- [ ] Form validation working
- [ ] HTTPS certificate installed
- [ ] Error logging configured
- [ ] Backup system in place
- [ ] Monitoring alerts set up
- [ ] Printed flyers ready for distribution

---

## 🎯 Next Steps

After setup:

1. **Marketing:**
   - Print and distribute flyers
   - Share partners.shipting.com on social media
   - Email existing customers about partnership program

2. **Process:**
   - Set up workflow for reviewing signups
   - Create onboarding checklist
   - Schedule follow-up calls with new partners

3. **Optimization:**
   - Track conversion rates
   - A/B test landing page elements
   - Gather feedback from partners

---

## 📝 License

© 2026 Shipting. All rights reserved.
