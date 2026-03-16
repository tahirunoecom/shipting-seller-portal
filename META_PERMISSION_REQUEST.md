# WhatsApp Business Management Permission Request

**App Name:** Shipting Seller Portal
**Business Name:** [Your Business Name]
**Permission Requested:** `whatsapp_business_management`
**Date:** March 16, 2026

---

## Business Overview

We operate **Shipting**, an e-commerce platform that connects sellers with customers. Our platform enables multiple sellers to manage their online stores, process orders, and communicate with their customers efficiently.

---

## Purpose of WhatsApp Business API Integration

We are integrating WhatsApp Business API to enable our sellers to:

1. **Send transactional notifications** to their customers
2. **Provide order status updates** in real-time
3. **Improve customer service** through WhatsApp messaging
4. **Enhance customer experience** with timely, relevant communications

---

## Use Cases for Template Messaging

### 1. **Order Confirmations**
When a customer places an order through our platform, we will send:
- Order confirmation with order number
- Order details and total amount
- Expected delivery timeline

**Example Template:**
```
Your order has been confirmed successfully. Order reference number is ORD-2024-12345. You will receive shipping updates via WhatsApp. Thank you for your purchase.
```

### 2. **Shipping Updates**
We will notify customers when:
- Order is packed and ready for shipment
- Order is dispatched with tracking number
- Order is out for delivery
- Order has been delivered

**Example Template:**
```
Your order ORD-2024-12345 has been shipped. Tracking number: TRK-987654. Expected delivery: March 18, 2026. Track your order at [link].
```

### 3. **Account Notifications**
We will send:
- Account verification messages
- Password reset confirmations
- Login alerts for security
- Profile update confirmations

**Example Template:**
```
Your account verification is complete. You can now browse products and place orders. Welcome to Shipting!
```

### 4. **Customer Support**
We will provide:
- Support ticket status updates
- Resolution confirmations
- Query response notifications

**Example Template:**
```
Your support ticket #12345 has been resolved. Our team has processed your request. Reply to this message if you need further assistance.
```

---

## Template Categories We Will Use

| Category | Purpose | Frequency |
|----------|---------|-----------|
| **UTILITY** | Order confirmations, shipping updates, account notifications | High (per transaction) |
| **AUTHENTICATION** | OTP codes, login verification | Medium (per user action) |
| **UTILITY** | Customer support updates, ticket status | Low (as needed) |

**We will NOT use:**
- ❌ MARKETING templates without explicit customer consent
- ❌ Promotional messages to users who haven't opted in
- ❌ Spam or unsolicited messages

---

## Compliance and Best Practices

### 1. **User Consent**
- ✅ Customers explicitly opt-in to receive WhatsApp notifications during checkout
- ✅ Clear opt-in checkbox: "Receive order updates via WhatsApp"
- ✅ Users can opt-out anytime by replying "STOP"
- ✅ We maintain opt-in records in our database

### 2. **Message Frequency**
- ✅ Transactional messages only (order-related)
- ✅ No more than 5-6 messages per order lifecycle
- ✅ Messages sent only when there's a status change
- ✅ No repetitive or spam messages

### 3. **Content Guidelines**
- ✅ Clear, informative, and professional content
- ✅ Relevant to the transaction or account activity
- ✅ No misleading or deceptive information
- ✅ Proper formatting with example values for variables

### 4. **WhatsApp Policies Compliance**
- ✅ Full compliance with WhatsApp Business Policy
- ✅ Full compliance with WhatsApp Commerce Policy
- ✅ No sensitive information (full card numbers, passwords)
- ✅ Secure handling of customer data
- ✅ GDPR and data privacy compliance

### 5. **Template Management**
- ✅ All templates submitted with example values
- ✅ Templates follow Meta's formatting guidelines
- ✅ Variables used appropriately with clear context
- ✅ Professional tone for UTILITY templates
- ✅ Regular review and updates of templates

---

## Technical Implementation

### How We Use `whatsapp_business_management` Permission:

1. **Create Message Templates**
   - Programmatically create and manage templates via Graph API
   - Submit templates with proper example values
   - Monitor template status (PENDING, APPROVED, REJECTED)

2. **Template Management**
   - List all templates for our business accounts
   - Update templates when needed
   - Delete obsolete or rejected templates
   - Track template quality ratings

3. **Multi-Tenant Architecture**
   - Each seller on our platform has their own WhatsApp Business Account
   - We manage templates on behalf of multiple sellers
   - Centralized template management through our seller portal
   - Each seller can customize their templates

4. **API Endpoints We Use**
   ```
   POST /{waba-id}/message_templates
   GET /{waba-id}/message_templates
   DELETE /{waba-id}/message_templates
   ```

---

## Data Privacy and Security

### Customer Data Protection:
- ✅ End-to-end encryption for all WhatsApp messages
- ✅ No storage of message content on our servers
- ✅ Customer phone numbers stored securely with encryption
- ✅ Compliance with GDPR, CCPA, and local data protection laws
- ✅ Regular security audits and penetration testing

### User Rights:
- ✅ Customers can request data deletion
- ✅ Clear privacy policy displayed during opt-in
- ✅ Transparent data usage explanations
- ✅ Easy opt-out mechanism

---

## Expected Volume and Scale

| Metric | Current | 6 Months | 12 Months |
|--------|---------|----------|-----------|
| Active Sellers | 50 | 200 | 500 |
| Monthly Orders | 1,000 | 5,000 | 15,000 |
| WhatsApp Messages/Month | 5,000 | 25,000 | 75,000 |
| Active Templates | 10 | 30 | 50 |

**Note:** All messages are transactional (order-related), not marketing.

---

## User Experience Benefits

### For Customers:
1. **Real-time order tracking** - Know exactly where their order is
2. **Convenient communication** - Updates on their preferred platform
3. **Reduced anxiety** - Proactive notifications reduce support inquiries
4. **Better engagement** - Can reply directly for questions

### For Sellers:
1. **Higher customer satisfaction** - Transparent order process
2. **Reduced support load** - Automated status updates
3. **Professional image** - Timely, professional communications
4. **Better retention** - Improved customer experience

---

## Quality Assurance

### Template Quality Control:
- ✅ Internal review process before submission
- ✅ Testing with real phone numbers before production
- ✅ Monitoring template approval/rejection rates
- ✅ Continuous improvement based on Meta feedback

### Message Quality:
- ✅ Personalized messages with customer/order details
- ✅ Clear, actionable information
- ✅ Professional tone and formatting
- ✅ Accurate and timely delivery

---

## Commitment to Meta Policies

We commit to:

1. ✅ **Full compliance** with all WhatsApp Business Policies
2. ✅ **Immediate response** to any policy violations
3. ✅ **Regular audits** of our messaging practices
4. ✅ **User-first approach** - No spam, only valuable messages
5. ✅ **Transparency** with customers about data usage
6. ✅ **Continuous monitoring** of message quality and user feedback
7. ✅ **Prompt action** on user complaints or opt-outs
8. ✅ **Cooperation** with Meta review processes

---

## Use Case Summary

**In Summary:**

We need `whatsapp_business_management` permission to programmatically manage WhatsApp message templates for our multi-seller e-commerce platform. This enables us to:

- Create and manage transactional notification templates
- Provide our sellers with professional communication tools
- Send timely order updates to customers who have opted in
- Maintain high-quality, policy-compliant messaging at scale

**We will ONLY use this permission for:**
- Creating UTILITY and AUTHENTICATION templates
- Managing template lifecycle (create, read, delete)
- Monitoring template status and quality
- Providing order-related transactional notifications

**We will NOT use this permission for:**
- Sending marketing messages without consent
- Creating spam or promotional content
- Violating user privacy or WhatsApp policies
- Any activity that degrades user experience

---

## Supporting Documentation

We can provide:
- Screenshots of our opt-in flow
- Sample templates we plan to use
- Privacy policy documents
- Data security certifications
- Example customer journey flows

---

## Contact Information

**Developer Contact:**
Name: [Your Name]
Email: [Your Email]
Phone: [Your Phone]

**Business Contact:**
Company: [Company Name]
Website: [Website URL]
Business Email: [Business Email]

---

## Request Summary

We respectfully request **Standard Access** (or **Advanced Access** if applicable) to the `whatsapp_business_management` permission to enable our e-commerce platform to deliver high-quality, policy-compliant transactional notifications to customers who have explicitly opted in.

Our use case is strictly limited to transactional messaging (order confirmations, shipping updates, account notifications) and we commit to full compliance with all Meta and WhatsApp policies.

Thank you for your consideration.

---

**Last Updated:** March 16, 2026
**Document Version:** 1.0
