# Shipting Platform - Complete User Guide

**Version:** 1.0
**Last Updated:** February 2026
**Platform URL:** https://partners.shipting.com

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Part 1: Seller Journey](#part-1-seller-journey)
3. [Part 2: Customer Journey (WhatsApp)](#part-2-customer-journey-whatsapp)
4. [Part 3: Admin Journey](#part-3-admin-journey)
5. [Part 4: Driver Journey](#part-4-driver-journey)
6. [Part 5: Order Lifecycle](#part-5-order-lifecycle-summary)
7. [Part 6: Features Status](#part-6-features-status)
8. [Part 7: Quick Reference](#part-7-quick-reference)

---

## Platform Overview

**Shipting** is a comprehensive delivery management platform that connects four key user types:

| User Type | Description |
|-----------|-------------|
| **Sellers** | Restaurants/Stores that list products and receive orders via WhatsApp |
| **Customers** | End users who order products via WhatsApp chat |
| **Drivers** | Delivery partners who fulfill and deliver orders |
| **Admin** | Platform administrators who manage and approve sellers |

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    CUSTOMER     │────►│     SELLER      │────►│     DRIVER      │
│   (WhatsApp)    │     │    (Portal)     │     │     (App)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  Orders via          │  Manages              │  Delivers
        │  WhatsApp Bot        │  Products & Orders    │  Orders
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                              │
                    ┌─────────────────┐
                    │      ADMIN      │
                    │    (Portal)     │
                    └─────────────────┘
                              │
                    Approves Sellers
                    Manages Platform
```

---

# Part 1: Seller Journey

## 1.1 Registration

### Step 1: Go to Registration Page

1. Open your web browser
2. Visit **https://partners.shipting.com**
3. Click the **"Sign Up"** or **"Register"** button

### Step 2: Fill Registration Form

Fill in the following information:

**Personal Details:**
- Full Name
- Email Address
- Phone Number
- Password (create a strong password)

**Business Details:**
- Store/Company Name
- Store Address
- City
- State
- ZIP Code
- Country

**Account Type Selection:**
- ☑️ **Seller** (Scan & Sell) - To sell products
- ☑️ **Driver** (Local Delivery) - To deliver orders *(optional, you can select both)*

Click **"Register"** to proceed.

### Step 3: Email OTP Verification

1. Check your email inbox for a verification email
2. Find the **6-digit OTP** (One-Time Password)
3. Return to the verification page
4. Enter the OTP in the provided field
5. Click **"Verify"**
6. Success message: ✅ *"Email verified successfully"*

### Step 4: Submit Verification Documents

After email verification, you'll be redirected to the **Verification Page**:

1. **Upload Required Documents:**
   - Government-issued ID (Driver's License, Passport, or National ID)
   - Business License *(if applicable)*
   - Proof of Business Address *(utility bill, lease agreement)*

2. **Fill Additional Details:**
   - Business registration number *(if applicable)*
   - Tax ID *(if applicable)*

3. Click **"Submit for Verification"**

4. Your status will show: **"Pending Approval"**

### Step 5: Wait for Admin Approval

1. Platform admin will review your application
2. This typically takes 1-2 business days
3. You'll receive an email notification when:
   - ✅ **Approved** - You can start using the platform
   - ❌ **Rejected** - With reason and steps to resubmit

---

## 1.2 First Login & Dashboard

### Step 1: Login to Your Account

1. Go to **https://partners.shipting.com**
2. Enter your registered **Email**
3. Enter your **Password**
4. Click **"Login"**

### Step 2: Understanding Your Dashboard

After successful login, you'll see your **Seller Dashboard**:

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │ Total Orders │  │   Revenue    │  │   Pending    │      │
│   │      24      │  │   $1,250     │  │      3       │      │
│   └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│   Recent Orders                                              │
│   ─────────────                                              │
│   #1142 - WhatsApp Customer - $11.15 - Pending              │
│   #1141 - John Doe - $25.00 - Delivered                     │
│   #1140 - Jane Smith - $18.50 - In Transit                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Dashboard Elements:**
- **Total Orders** - Total number of orders received
- **Revenue** - Total earnings from completed orders
- **Pending Orders** - Orders waiting to be processed
- **Recent Orders** - List of your latest orders

### Step 3: Navigation Menu

Your left sidebar menu includes:

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Overview of your store performance |
| **Products** | Add, edit, and manage your products |
| **Orders** | View and manage customer orders |
| **Order Board** | Kanban-style order management |
| **Catalog** | Product catalog management *(coming soon)* |
| **WhatsApp Bot** | Connect and manage WhatsApp integration |
| **Find Driver** | Find delivery drivers *(coming soon)* |
| **Payments** | View payment transactions |
| **Billing** | Manage payouts and Stripe connection |
| **Settings** | Profile, account type, and verification |

---

## 1.3 Adding Products

### Step 1: Navigate to Products Page

1. Click **"Products"** in the left sidebar menu
2. You'll see your product list (empty for new accounts)

### Step 2: Add a New Product

1. Click the **"+ Add Product"** button (top right)

2. Fill in the product details:

   **Basic Information:**
   - **Product Name** - e.g., "Margherita Pizza"
   - **Description** - Detailed description of the product
   - **Category** - Select or create a category (e.g., "Pizza", "Beverages")
   - **Price** - Set the selling price (e.g., $12.99)

   **Media:**
   - **Product Image(s)** - Upload high-quality images
   - Recommended size: 800x800 pixels
   - Supported formats: JPG, PNG

   **Inventory:**
   - **Stock Quantity** - Number of items available
   - **SKU** - Stock Keeping Unit *(optional)*

3. Click **"Save Product"**

4. Success: ✅ *"Product added successfully"*

### Step 3: Bulk Upload Products (Optional)

For adding multiple products at once:

1. Click **"Bulk Upload"** button
2. Click **"Download Template"** to get the CSV file
3. Open the CSV file in Excel or Google Sheets
4. Fill in your products following the template format:

```
name,description,category,price,stock,sku
Margherita Pizza,Classic tomato and mozzarella,Pizza,12.99,50,PIZ001
Pepperoni Pizza,Loaded with pepperoni,Pizza,14.99,50,PIZ002
Coca Cola,330ml can,Beverages,2.99,100,BEV001
```

5. Save the file as CSV
6. Click **"Upload CSV"** and select your file
7. Review the imported products
8. Click **"Confirm Import"**

### Step 4: Manage Existing Products

**To Edit a Product:**
1. Find the product in your list
2. Click on the product or the **"Edit"** button
3. Make your changes
4. Click **"Save Changes"**

**To Delete a Product:**
1. Find the product in your list
2. Click the **"Delete"** button
3. Confirm deletion

**To Update Stock:**
1. Click on the product
2. Update the **Stock Quantity** field
3. Save changes

---

## 1.4 Connecting WhatsApp Bot

This is the most important step to start receiving orders via WhatsApp.

### Prerequisites

Before connecting, ensure you have:
- ✅ A Facebook account
- ✅ A Meta Business account (will guide you to create if not available)
- ✅ A phone number for WhatsApp (can be your business number or purchase one)

### Step 1: Navigate to WhatsApp Bot Page

1. Click **"WhatsApp Bot"** in the left sidebar menu
2. You'll see the WhatsApp connection interface

### Step 2: Start Facebook Login

1. Find the **"Connect WhatsApp"** section
2. Click the **"Login with Facebook"** button
3. A Facebook popup window will open

### Step 3: Facebook Authentication

1. **Login to Facebook** (if not already logged in)
2. **Grant Permissions** - Allow the app to:
   - Access your business information
   - Manage your WhatsApp Business Account

### Step 4: Embedded Signup Flow

After Facebook authentication, you'll go through the Meta Embedded Signup:

**Step 4a: Select or Create Business Portfolio**
- If you have an existing Meta Business account, select it
- If not, click **"Create New"** and follow the prompts

**Step 4b: Select or Create WhatsApp Business Account (WABA)**
- Choose an existing WABA if you have one
- Or create a new WABA for your business

**Step 4c: Add Phone Number**

This is where you add the phone number customers will message:

```
┌─────────────────────────────────────────────────────────────┐
│  ADD PHONE NUMBER                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Country: [United States        ▼]                          │
│                                                              │
│  Phone Number: [+1] [___-___-____]                          │
│                                                              │
│  ⚠️ Important Notes:                                        │
│  • Use a number NOT already registered on WhatsApp          │
│  • This number will receive all customer messages           │
│  • Can be a mobile or landline number                       │
│                                                              │
│  [Continue]                                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Phone Number Options:**
1. **Your existing business number** - Most recommended
2. **Your personal mobile** - If you don't have a business line
3. **Purchase a Twilio number** - If you don't have any suitable number (see Section 1.5)

**Step 4d: Verify Phone Number**

1. Choose verification method:
   - **SMS** - Receive code via text message
   - **Voice Call** - Receive code via automated call

2. Click **"Send Code"**

3. Enter the **6-digit verification code**

4. Click **"Verify"**

### Step 5: Connection Complete

After successful verification:

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ WhatsApp Connected Successfully!                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phone Number: +1 234-567-8900                              │
│  Status: 🟢 Connected                                        │
│  Quality Rating: High                                        │
│  Messaging Tier: Tier 1 (1,000 conversations/day)           │
│                                                              │
│  Business Name: Your Store Name                              │
│  Verified: ✅ Yes                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Set Up Business Profile

Complete your WhatsApp Business profile:

1. Find **"Business Profile"** section on the WhatsApp Bot page

2. Fill in your business details:
   - **Business Name** - Your store name
   - **Business Description** - Brief description (max 256 characters)
   - **Business Category** - e.g., Restaurant, Retail Store
   - **Business Address** - Your physical location
   - **Business Hours** - Operating hours
   - **Website** - Your website URL *(optional)*
   - **Email** - Business email *(optional)*

3. **Upload Profile Picture**
   - Recommended: Your logo or storefront image
   - Size: 640x640 pixels minimum

4. Click **"Save Profile"**

### Step 7: Sync Product Catalog

Make your products visible on WhatsApp:

1. Find **"Catalog"** section on WhatsApp Bot page

2. Click **"Sync Catalog"** button

3. Wait for synchronization to complete (may take a few minutes)

4. Success message: ✅ *"Catalog synced successfully"*

**Note:** Currently, catalog sync is manual. Click "Sync Catalog" whenever you:
- Add new products
- Update existing products
- Change prices

### Step 8: Get Your WhatsApp Link & QR Code

Share your WhatsApp with customers:

1. Find **"Share"** section on WhatsApp Bot page

2. You'll see:

```
┌─────────────────────────────────────────────────────────────┐
│  SHARE YOUR WHATSAPP                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WhatsApp Link:                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ https://wa.me/12345678900                            │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Copy Link]                                                 │
│                                                              │
│  QR Code:                                                    │
│  ┌─────────────┐                                            │
│  │ ▄▄▄▄▄▄▄▄▄▄ │                                            │
│  │ █ QR CODE █ │  [Download QR]                             │
│  │ ▀▀▀▀▀▀▀▀▀▀ │                                            │
│  └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**How to Use:**
- **Copy Link** - Share on social media, email signatures, website
- **Download QR** - Print and display in your store, on menus, flyers

---

## 1.5 Purchasing a Twilio Number (Optional)

If you don't have a suitable phone number for WhatsApp, you can purchase one:

### Step 1: Find Twilio Section

1. On the WhatsApp Bot page
2. Scroll to **"Need a Phone Number?"** section
3. Click **"Get a Twilio Number"**

### Step 2: Search for Available Numbers

```
┌─────────────────────────────────────────────────────────────┐
│  SEARCH PHONE NUMBERS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Country: [United States ▼]                                  │
│                                                              │
│  Area Code (optional): [415    ]  ← e.g., San Francisco     │
│                                                              │
│  Contains (optional):  [PIZZA  ]  ← for vanity numbers      │
│                                                              │
│  [Search Available Numbers]                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Select and Purchase

1. Review the list of available numbers
2. Each number shows:
   - Phone number
   - Location
   - Monthly cost (~$1.15/month)

3. Click **"Buy"** next to your preferred number

4. Confirm purchase

5. Number is now assigned to your account

### Step 4: Use for WhatsApp Registration

1. Your new Twilio number appears in your account
2. Use this number during the WhatsApp Embedded Signup (Step 4c above)
3. When OTP is sent, check the **"SMS Inbox"** on the same page
4. The OTP will appear automatically

### Step 5: SMS Inbox

View messages received on your Twilio number:

```
┌─────────────────────────────────────────────────────────────┐
│  SMS INBOX                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  From: +1 800-555-0123                                       │
│  Time: 2 minutes ago                                         │
│  Message: Your WhatsApp code is 123456                       │
│  [OTP: 123456]  ← Auto-extracted                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  From: +1 800-555-0199                                       │
│  Time: 1 hour ago                                            │
│  Message: Welcome to WhatsApp Business...                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1.6 Managing Orders

### Step 1: View Orders List

1. Click **"Orders"** in the left sidebar menu
2. See all orders with details:

| Column | Description |
|--------|-------------|
| Order ID | Unique order number (e.g., #1142) |
| Customer | Customer name |
| Date/Time | When order was placed |
| Items | Number of items ordered |
| Total | Order total amount |
| Status | Current order status |
| Actions | Buttons to manage order |

### Step 2: Understanding Order Status

| Status | Meaning | Color |
|--------|---------|-------|
| **Pending** | New order, waiting for action | 🟡 Yellow |
| **Accepted** | Order confirmed, being prepared | 🟢 Green |
| **Packed** | Order ready for pickup/delivery | 🔵 Blue |
| **In Transit** | Order out for delivery | 🟣 Purple |
| **Delivered** | Order completed | ✅ Green |
| **Cancelled** | Order cancelled | 🔴 Red |

### Step 3: Processing New Orders

When a new order arrives, you have two options:

**Option A: Self Fulfillment (You deliver)**

1. Find the order in Pending status
2. Click **"Self"** button
3. Order status changes to **"Accepted"**
4. Prepare the order
5. Deliver it yourself
6. Update status as you progress

**Option B: Find a Driver (Driver delivers)**

1. Find the order in Pending status
2. Click **"Find Driver"** button
3. Status changes to **"Searching for Driver"**
4. Nearby drivers receive notification
5. When a driver accepts:
   - You'll see driver details
   - Customer is notified
   - Driver handles delivery

### Step 4: Using the Order Board

The Order Board provides a visual way to manage orders:

1. Click **"Order Board"** in the left sidebar

2. See Kanban-style columns:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Pending  │ Accepted │  Packed  │In Transit│Delivered │
│   (5)    │   (3)    │   (2)    │   (4)    │   (0)    │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ #1142    │ #1130    │ #1143    │ #1138    │          │
│ Customer │ Customer │ Customer │ Customer │  Drop    │
│ $11.15   │ $8.60    │ $11.15   │ $24.02   │  orders  │
│          │          │          │          │  here    │
│ [Self]   │          │          │          │          │
│ [Driver] │          │          │          │          │
├──────────┤          │          │          │          │
│ #1136    │          │          │          │          │
│ Customer │          │          │          │          │
│ $8.60    │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

3. **Drag and Drop** order cards between columns to update status

4. Or click on an order card to:
   - View full details
   - Update status manually
   - Contact customer

---

## 1.7 Payments & Billing

### Step 1: View Payments

1. Click **"Payments"** in the left sidebar
2. See all payment transactions:
   - Order ID
   - Customer
   - Amount
   - Payment method (Stripe)
   - Status (Paid/Pending/Failed)
   - Date

### Step 2: Connect Stripe for Payouts

To receive your earnings:

1. Click **"Billing"** in the left sidebar
2. Find **"Stripe Connect"** section
3. Click **"Connect with Stripe"**
4. Complete Stripe onboarding:
   - Business information
   - Bank account details
   - Identity verification
5. Once connected, payouts will be sent to your bank

**Note:** Stripe Connect integration is currently in progress.

---

## 1.8 Settings

### Step 1: Update Your Profile

1. Click **"Settings"** in the left sidebar
2. Go to **"Profile"** tab
3. Update your information:
   - Full Name
   - Email Address
   - Phone Number
   - Store/Company Name
   - Store Address
4. Click **"Save Changes"**

### Step 2: Change Account Type

If you registered as both Seller and Driver:

1. In Settings, go to **"Account Type"** tab
2. You'll see your current mode and options
3. Click **"Switch to Driver Mode"** to become a driver
4. Or stay in Seller mode to manage your store
5. Your menu will change based on the selected mode

### Step 3: View Verification Status

1. In Settings, go to **"Verification"** tab
2. See your verification details:
   - Documents you submitted
   - Approval status
   - Any pending requirements
   - Admin feedback (if any)

---

# Part 2: Customer Journey (WhatsApp)

## 2.1 Starting a Conversation

### How Customers Find Your WhatsApp

Customers can connect with your store via:

1. **QR Code** - Scanning the code at your store or on marketing materials
2. **WhatsApp Link** - Clicking a link you shared (wa.me/...)
3. **Direct Search** - Saving your number and messaging directly

### Step 1: Send First Message

1. Customer opens WhatsApp
2. Finds your business contact
3. Sends a greeting like **"Hi"**, **"Hello"**, or **"Hey"**

### Step 2: Welcome Message

The bot responds with a welcome message:

```
┌─────────────────────────────────────────────────────────────┐
│  🛍️ Welcome to [Your Store Name]!                           │
│                                                              │
│  I'm here to help you browse our products and place orders. │
│                                                              │
│  What would you like to do?                                  │
│                                                              │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ Browse Products│ │  View Cart     │ │  My Orders     │   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Automatic Registration/Login

- **New Customer:** Bot automatically creates an account using their phone number
- **Returning Customer:** Bot recognizes them and shows personalized options
- No manual registration or OTP needed!

---

## 2.2 Browsing & Ordering Products

### Browsing Products

**Method 1: Using Buttons**
- Tap **"Browse Products"** button
- See product categories
- Tap a category to see products

**Method 2: Using Text Commands**
- Type: "Show me products"
- Type: "Menu"
- Type: "What do you have?"

### Searching Products

Customer can search by typing:
- "I want pizza"
- "Show me burgers"
- "Search for drinks"
- "Find pasta"

Bot shows matching products with images and prices.

### Viewing Product Details

When a product is shown:

```
┌─────────────────────────────────────────────────────────────┐
│  🍕 Margherita Pizza                                         │
│                                                              │
│  [Product Image]                                             │
│                                                              │
│  Classic pizza with tomato sauce, fresh mozzarella,         │
│  and basil leaves.                                           │
│                                                              │
│  💰 Price: $12.99                                            │
│  ✅ In Stock                                                 │
│                                                              │
│  ┌────────────────┐ ┌────────────────┐                      │
│  │ 🛒 Add to Cart │ │ ❤️ Add to      │                      │
│  │                │ │    Wishlist    │                      │
│  └────────────────┘ └────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Adding to Cart

**Method 1: Tap Button**
- Tap **"Add to Cart"** button on product

**Method 2: Type Command**
- Type: "Add Margherita Pizza to cart"
- Type: "I want 2 burgers"

Bot confirms:
```
✅ Margherita Pizza added to cart!

What would you like to do?
[View Cart] [Continue Shopping]
```

### Viewing Cart

Type "View cart" or tap the button:

```
┌─────────────────────────────────────────────────────────────┐
│  🛒 Your Cart (3 items)                                      │
│                                                              │
│  1. Margherita Pizza x1      $12.99                         │
│  2. Pepperoni Pizza x1       $14.99                         │
│  3. Coca Cola x2             $5.98                          │
│                                                              │
│  ────────────────────────────────────                       │
│  Subtotal:                   $33.96                         │
│  ────────────────────────────────────                       │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Checkout │ │ Update   │ │ Clear    │ │ Continue │       │
│  │          │ │ Quantity │ │ Cart     │ │ Shopping │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2.3 Checkout & Payment

### Step 1: Start Checkout

- Tap **"Checkout"** button
- Or type: "Checkout" / "I want to order"

### Step 2: Delivery Address

Bot asks for delivery address:

```
┌─────────────────────────────────────────────────────────────┐
│  📍 Where should we deliver your order?                      │
│                                                              │
│  ┌────────────────────────┐ ┌────────────────────────┐      │
│  │ 📍 Share Location      │ │ ✏️ Type Address        │      │
│  └────────────────────────┘ └────────────────────────┘      │
│                                                              │
│  Or choose a saved address:                                  │
│  • 123 Main St, New York (Home)                             │
│  • 456 Office Blvd, New York (Work)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Option A: Share Location**
1. Tap "Share Location"
2. WhatsApp location picker opens
3. Select your exact location on map
4. Confirm

**Option B: Type Address**
1. Tap "Type Address"
2. Type your full address
3. Confirm when bot reads it back

**Option C: Saved Address**
1. Tap on a previously used address
2. Confirm selection

### Step 3: Apply Discount Code (Optional)

If customer has a coupon:

```
Customer: "I have a coupon"
Bot: "Please enter your coupon code:"
Customer: "SAVE10"
Bot: "✅ Coupon applied! You saved $3.40"
```

### Step 4: Review Order

Bot shows order summary:

```
┌─────────────────────────────────────────────────────────────┐
│  📋 ORDER SUMMARY                                            │
│                                                              │
│  Items:                                                      │
│  • Margherita Pizza x1       $12.99                         │
│  • Pepperoni Pizza x1        $14.99                         │
│  • Coca Cola x2              $5.98                          │
│                                                              │
│  ─────────────────────────────────────                      │
│  Subtotal:                   $33.96                         │
│  Discount (SAVE10):          -$3.40                         │
│  Delivery Fee:               $3.99                          │
│  Tax:                        $2.75                          │
│  ─────────────────────────────────────                      │
│  TOTAL:                      $37.30                         │
│                                                              │
│  📍 Delivery to:                                            │
│  123 Main St, Apt 4B, New York, NY 10001                    │
│                                                              │
│  ┌────────────────────────┐ ┌────────────────────────┐      │
│  │ ✅ Confirm & Pay       │ │ ✏️ Change Address      │      │
│  └────────────────────────┘ └────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: Payment

1. Tap **"Confirm & Pay"**

2. Bot sends Stripe payment link:

```
┌─────────────────────────────────────────────────────────────┐
│  💳 Complete Your Payment                                    │
│                                                              │
│  Please tap the link below to pay securely:                 │
│                                                              │
│  🔗 https://checkout.stripe.com/pay/abc123...               │
│                                                              │
│  Amount: $37.30                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

3. Customer taps link → Opens Stripe checkout page

4. Enters card details and completes payment

5. Returns to WhatsApp

6. Bot confirms order:

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ PAYMENT SUCCESSFUL!                                      │
│                                                              │
│  Thank you for your order!                                   │
│                                                              │
│  Order #1142                                                 │
│  Status: Confirmed                                           │
│                                                              │
│  We'll notify you when your order is on the way!            │
│                                                              │
│  ┌────────────────┐ ┌────────────────┐                      │
│  │ Track Order    │ │ Continue       │                      │
│  │                │ │ Shopping       │                      │
│  └────────────────┘ └────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2.4 Order Tracking

### Check Order Status

Type: "Track my order" or "Where is my order?"

```
┌─────────────────────────────────────────────────────────────┐
│  📦 ORDER #1142 STATUS                                       │
│                                                              │
│  ✅ Order Placed          10:30 AM                          │
│  ✅ Order Accepted         10:32 AM                          │
│  ✅ Being Prepared         10:35 AM                          │
│  🔄 Out for Delivery       10:50 AM  ← Current              │
│  ⏳ Delivered              --:-- --                          │
│                                                              │
│  ─────────────────────────────────────                      │
│  🚗 Driver Information:                                      │
│  Name: John Driver                                           │
│  Phone: +1 555-123-4567                                      │
│  Estimated Arrival: 15 minutes                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Status Updates

Customer receives automatic updates:

1. **Order Accepted** - "Your order is being prepared!"
2. **Driver Assigned** - "A driver has been assigned to your order"
3. **Out for Delivery** - "Your order is on the way!"
4. **Arrived** - "Driver has arrived at your location"
5. **Delivered** - "Order delivered! Thank you for ordering"

---

## 2.5 Other Customer Features

### Wishlist / Favorites

- Add products: "Add to wishlist"
- View saved items: "My wishlist" or "Favorites"
- Quick reorder from favorites

### Order History

- Type: "My orders" or "Order history"
- See all past orders
- Reorder from previous orders with one tap

### Help & Support

- Type: "Help" or "Support"
- Get assistance options
- Contact customer support

### Common Commands Summary

| What Customer Says | Bot Action |
|-------------------|------------|
| Hi, Hello, Hey | Welcome message |
| Menu, Products, Browse | Show product categories |
| Search [product] | Search for products |
| Add to cart | Add current product to cart |
| View cart, My cart | Show cart contents |
| Checkout, Order | Start checkout process |
| Track order, Where is my order | Show order status |
| My orders, Order history | Show past orders |
| Wishlist, Favorites | Show saved products |
| Help, Support | Show help options |

---

# Part 3: Admin Journey

## 3.1 Admin Login

### Step 1: Access Admin Panel

1. Open browser
2. Go to: **https://partners.shipting.com/admin**
3. Enter admin credentials
4. Click **"Login"**

### Step 2: Admin Dashboard

After login, you see the admin interface with:
- **All Shippers** - Left sidebar showing seller list
- **Seller Details** - Main area showing selected seller info

---

## 3.2 Managing Sellers

### Viewing All Sellers

1. Click **"All Shippers"** in the left menu
2. See list of all registered sellers:
   - Store Name
   - Owner Name
   - Email
   - Status (Pending/Approved/Rejected)
   - Registration Date

### Reviewing Seller Details

Click on any seller to see their complete profile:

**Overview Tab:**
```
┌─────────────────────────────────────────────────────────────┐
│  SELLER: DearDelhi                                           │
│  ID: 1016 | kale.tushar@gmail.com                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Overview] [Dashboard] [Products] [Orders] [WhatsApp] [Billing]
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ LOGIN DETAILS           │  │ ACCOUNT TYPE            │   │
│  │ Name: Tushar Kale       │  │ [Seller ✓] [Driver]     │   │
│  │ Email: kale.tushar@...  │  │ [Fulfillment]           │   │
│  │ Phone: 18608341662      │  │                         │   │
│  │ Created: 22/01/2026     │  │                         │   │
│  │ OTP Verified: ✅ Yes    │  │                         │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ VERIFICATION STATUS     │  │ VERIFICATION DETAILS    │   │
│  │ ✅ Account Verified     │  │ Address: 304 Georges Rd │   │
│  │ ✅ Verification Submit. │  │ City: Dayton            │   │
│  │ ✅ Approved             │  │ State: 3653             │   │
│  │ ❌ Stripe Connected: No │  │ ZIP: 08810              │   │
│  └─────────────────────────┘  │ Company: DearDelhi      │   │
│                               └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ STORE DETAILS           │  │ SYSTEM IDs              │   │
│  │ Store: DearDelhi        │  │ User ID: 931            │   │
│  │ Address: 304 Georges Rd │  │ WH Account ID: 1016     │   │
│  │ City: Dayton            │  │ Stripe: N/A             │   │
│  │ State: 3653             │  │ WABA ID: N/A            │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Approving/Rejecting Sellers

**To Approve:**
1. Review verification documents
2. Verify business information is legitimate
3. Click **"Approve"** button
4. Seller receives email notification
5. Seller can now access all features

**To Reject:**
1. Click **"Reject"** button
2. Enter reason for rejection
3. Seller receives notification with feedback

### Other Admin Tabs

**Dashboard Tab:**
- View seller's order statistics
- Revenue overview
- Recent activity

**Products Tab:**
- See all products listed by seller
- Can edit/remove if needed

**Orders Tab:**
- View all orders for this seller
- Order details and status

**WhatsApp Tab:**
- See WhatsApp connection status
- Phone number connected
- QR code
- Business profile status
- Can troubleshoot connection issues

**Billing Tab:**
- Payment history
- Stripe connection status
- Payout information

---

# Part 4: Driver Journey

## 4.1 Driver Registration

### Step 1: Register as Driver

1. Go to **https://partners.shipting.com**
2. Click **"Register"**
3. Fill in your details
4. Select Account Type: ☑️ **Driver (Local Delivery)**
5. Complete registration

### Step 2: Submit Driver Documents

After email verification:
- Driver's License
- Vehicle Registration
- Vehicle Insurance *(if required)*
- Profile Photo

### Step 3: Await Approval

Admin reviews and approves your driver application.

---

## 4.2 Driver Dashboard

### Switching to Driver Mode

If you have both Seller and Driver accounts:

1. Login to your account
2. Click **"Switch to Driver Mode"** button in the menu
3. Menu changes to driver-specific options

### Driver Menu

```
┌─────────────────────────────┐
│  DRIVER MODE                │
│  [Your Name]                │
├─────────────────────────────┤
│  ↩️ Switch to Seller Mode   │
├─────────────────────────────┤
│  📦 Available Orders        │
│  🚗 My Deliveries           │
│  💰 Earnings                │
│  📜 History                 │
│  ⚙️ Settings                │
├─────────────────────────────┤
│  🚪 Logout                  │
└─────────────────────────────┘
```

---

## 4.3 Accepting Orders

### Step 1: View Available Orders

1. Click **"Available Orders"**
2. See orders in your delivery area:

```
┌─────────────────────────────────────────────────────────────┐
│  AVAILABLE ORDERS                                            │
│  51 delivery requests                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🛒 R barbershop                                      │    │
│  │ Order #1145                                          │    │
│  │ 📦 1 items  •  $8.60                                │    │
│  │                                                      │    │
│  │ 📍 PICKUP: 13 adam street                           │    │
│  │ 📍 DROPOFF: Ryan in, apartment 5B                   │    │
│  │                                                      │    │
│  │ Distance: 2.3 miles                                  │    │
│  │                                                      │    │
│  │ [Accept Order]                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Accept an Order

1. Review order details:
   - Store location (pickup)
   - Customer location (dropoff)
   - Items count
   - Order value
   - Distance

2. Click **"Accept Order"**

3. Order moves to **"My Deliveries"**

4. Seller and customer are notified

---

## 4.4 Completing Deliveries

### Step 1: View My Deliveries

Click **"My Deliveries"** to see accepted orders.

### Step 2: Update Status Throughout Delivery

Update your status at each stage:

| Stage | Action | Status Update |
|-------|--------|---------------|
| 1 | Heading to store | **"Going to Store"** |
| 2 | Arrived at store | **"At Store"** |
| 3 | Collected order | **"Picked Up"** |
| 4 | Driving to customer | **"Out for Delivery"** |
| 5 | Arrived at destination | **"Arrived"** |
| 6 | Handed to customer | **"Delivered"** |

### Step 3: Complete Delivery

1. Hand order to customer
2. Take **photo proof** of delivery (optional/required)
3. Click **"Mark as Delivered"**
4. Upload delivery photo
5. Order completed ✅

---

## 4.5 Earnings & History

### View Earnings

1. Click **"Earnings"** in menu
2. See your delivery earnings:
   - Total earned
   - This week/month
   - Pending payouts

**Note:** Earnings feature is currently in development.

### View History

1. Click **"History"** in menu
2. See all completed deliveries
3. Filter by date range
4. View details of past orders

---

## 4.6 Driver Settings

### Update Profile

1. Click **"Settings"** → **"Profile"**
2. Update:
   - Name and contact info
   - Vehicle details
   - Profile photo
3. Save changes

### Switch Account Type

1. Click **"Settings"** → **"Account Type"**
2. Switch between Driver and Seller mode

### View Verification

See your driver documents and approval status.

---

# Part 5: Order Lifecycle Summary

## Complete Order Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE ORDER FLOW                          │
└─────────────────────────────────────────────────────────────────┘

CUSTOMER (WhatsApp)          SELLER (Portal)              DRIVER (App)
       │                           │                           │
       │  1. Browse Products       │                           │
       │  2. Add to Cart           │                           │
       │  3. Checkout              │                           │
       │  4. Pay via Stripe        │                           │
       │         │                 │                           │
       │         ▼                 │                           │
       │   ORDER CREATED ─────────►│ 5. New Order Received     │
       │                           │         │                 │
       │                           │    ┌────┴────┐            │
       │                           │    ▼         ▼            │
       │                           │  "Self"   "Find Driver"   │
       │                           │    │         │            │
       │                           │    │         ▼            │
       │                           │    │    Order visible ───►│ 6. See Order
       │                           │    │         │            │    │
       │                           │    │         │            │    ▼
       │                           │    │         │◄───────────│ 7. Accept
       │                           │    │         │            │    │
       │                           │    ▼         ▼            │    │
       │   8. Status Updates ◄─────│   PREPARING ORDER         │    │
       │                           │         │                 │    │
       │                           │         ▼                 │    │
       │   9. Driver Assigned ◄────│      PACKED ─────────────►│ 10. Pick Up
       │                           │                           │    │
       │   11. Out for Delivery ◄──│◄──────────────────────────│ 12. Update
       │                           │                           │    │
       │   13. Arrived ◄───────────│◄──────────────────────────│ 14. Update
       │                           │                           │    │
       │   15. DELIVERED ◄─────────│◄──────────────────────────│ 16. Complete
       │         ✅                │         ✅                │    ✅
       │                           │                           │
```

---

# Part 6: Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Seller Registration | ✅ Complete | |
| Email OTP Verification | ✅ Complete | |
| Admin Approval System | ✅ Complete | |
| Product Management | ✅ Complete | Add, edit, delete products |
| Bulk Product Upload | ✅ Complete | CSV import |
| WhatsApp Bot Connection | ✅ Complete | Facebook Embedded Signup |
| WhatsApp Business Profile | ✅ Complete | |
| WhatsApp Catalog Sync | ✅ Complete | Manual sync button |
| QR Code & Share Link | ✅ Complete | |
| Twilio Number Purchase | ✅ Complete | For sellers without phone |
| Customer Ordering (WhatsApp) | ✅ Complete | Full ordering flow |
| Stripe Payments | ✅ Complete | Payment links |
| Order Management | ✅ Complete | List view |
| Order Board (Kanban) | ✅ Complete | Drag and drop |
| Driver Registration | ✅ Complete | |
| Driver Order Acceptance | ✅ Complete | |
| Delivery Tracking | ✅ Complete | Status updates |
| Delivery Photo Proof | ✅ Complete | |
| Catalog Menu Link | 🚧 In Progress | Coming soon |
| Find Drivers Link | 🚧 In Progress | Coming soon |
| Stripe Connect Payouts | 🚧 In Progress | Seller payouts |
| Driver Earnings Dashboard | 🚧 In Progress | |
| Auto Catalog Sync | 📋 Planned | Automatic sync service |

---

# Part 7: Quick Reference

## Important URLs

| Portal | URL |
|--------|-----|
| Seller/Driver Portal | https://partners.shipting.com |
| Admin Panel | https://partners.shipting.com/admin |

## Account Types

| Type | Description | Can Switch To |
|------|-------------|---------------|
| Seller | Manage store, products, orders | Driver |
| Driver | Accept and deliver orders | Seller |
| Both | Full access to both modes | Toggle between |

## Order Statuses

| Status | Color | Meaning |
|--------|-------|---------|
| Pending | 🟡 | New order, awaiting action |
| Accepted | 🟢 | Order confirmed |
| Packed | 🔵 | Ready for pickup |
| In Transit | 🟣 | Out for delivery |
| Delivered | ✅ | Completed |
| Cancelled | 🔴 | Order cancelled |

## Support

For technical issues or questions, contact platform support.

---

**Document Version:** 1.0
**Last Updated:** February 2026
**Platform:** Shipting

---

*© 2026 Shipting. All rights reserved.*
