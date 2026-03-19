# How to Retrieve Your Facebook Account Email

You have the following WhatsApp Business API information:
- **WABA ID**: `1659914091647877`
- **Phone Number ID**: `850008814869854`
- **Business ID**: `1856101791959161`
- **WhatsApp Number**: `+1 715-882-6516`
- **Catalog ID**: `1160420602911130`

But you forgot which Facebook account (email) was used to connect this WhatsApp Business Account.

---

## 🎯 Quick Solution

Use one of the provided scripts to retrieve your Facebook account information using the access token.

### Prerequisites

You need your **Access Token** which is stored in your database (`seller_whatsapp_config` table).

---

## 📊 Option 1: Query Database for Access Token

If you have database access:

```sql
SELECT access_token, waba_id, phone_number_id, business_id
FROM seller_whatsapp_config
WHERE waba_id = '1659914091647877';
```

This will give you the `access_token` needed for the next steps.

---

## 🔧 Option 2: Run the JavaScript Script

```bash
# Using Node.js
node get_facebook_account.js YOUR_ACCESS_TOKEN
```

Or set as environment variable:
```bash
ACCESS_TOKEN=your_token_here node get_facebook_account.js
```

---

## 🐍 Option 3: Run the Python Script

```bash
# Using Python 3
python get_facebook_account.py YOUR_ACCESS_TOKEN
```

Or set as environment variable:
```bash
ACCESS_TOKEN=your_token_here python get_facebook_account.py
```

---

## 📝 What the Scripts Do

The scripts will try **4 different methods** to retrieve your Facebook account information:

### Method 1: Token Owner Info
- Gets the Facebook user who owns the access token
- **Returns**: Name, Email, ID

### Method 2: Business Users/Admins
- Gets all users/admins of the Business Account (ID: `1856101791959161`)
- **Returns**: List of all admins with their names and emails

### Method 3: WABA Assigned Users
- Gets users assigned to the WhatsApp Business Account
- **Returns**: Users who have access to manage the WABA

### Method 4: Token Debug Info
- Inspects the access token to find the user ID
- Then retrieves that user's profile information
- **Returns**: Token validity, expiration, and user details

---

## 🎨 Example Output

```
🔍 Retrieving Facebook Account Information...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Method 1: Getting token owner info...
✅ Token Owner:
   Name:  John Doe
   Email: john.doe@example.com
   ID:    123456789

👥 Method 2: Getting business users...
✅ Business Users/Admins:
   1. John Doe
      Email: john.doe@example.com
      ID:    987654321

👤 Method 3: Getting WABA assigned users...
✅ WABA Assigned Users:
   1. John Doe
      Email: john.doe@example.com

🔐 Method 4: Debug token information...
✅ Token Info:
   User ID:    123456789
   App ID:     1559645705059315
   Valid:      true
   Expires:    Never

📧 Fetching user details from token user_id...
✅ User Details:
   Name:  John Doe
   Email: john.doe@example.com
   ID:    123456789

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Done!
```

---

## 🌐 Alternative: Use Graph API Explorer

If you don't want to run scripts:

1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app: **Anythinginstantly** (App ID: `1559645705059315`)
3. Paste your access token
4. Run these queries one by one:

### Query 1: Get Token Owner
```
GET /me?fields=id,name,email
```

### Query 2: Get Business Users
```
GET /1856101791959161/business_users?fields=id,name,email
```

### Query 3: Get WABA Users
```
GET /1659914091647877/assigned_users?fields=name,email
```

### Query 4: Debug Token
```
GET /debug_token?input_token=YOUR_ACCESS_TOKEN
```

Then use the `user_id` from the response:
```
GET /{USER_ID}?fields=id,name,email
```

---

## ⚠️ Common Issues

### "Email not available"
Some methods might not return email if:
- The user hasn't granted email permission
- The access token doesn't have `email` scope
- Business user (not personal account)

**Solution**: Try all 4 methods - at least one should work!

### "Invalid OAuth access token"
- Your access token may have expired
- You need to reconnect WhatsApp to get a new token

### "Insufficient permissions"
- The access token might not have the required permissions
- Try using a different method from the 4 available

---

## 🔒 Security Note

⚠️ **Never share your access token publicly!**

The access token provides access to your WhatsApp Business Account. Keep it secure.

---

## 🤔 Still Can't Find It?

If none of the methods return an email, you can:

1. **Check Meta Business Suite**
   - Go to: https://business.facebook.com/
   - Look at Business Settings → People → Admins

2. **Check WhatsApp Manager**
   - Go to: https://business.facebook.com/wa/manage/home/
   - Look at Settings → Business info

3. **Reconnect via Portal**
   - Go to your seller portal WhatsApp page
   - Click "Connect WhatsApp Business"
   - This time note down which Facebook account you use!

---

## 📚 Need Help?

If you're still stuck, provide the output from running the script and we can help troubleshoot further!
