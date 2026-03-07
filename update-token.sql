-- Update access token for wh_account_id = 1035
-- New token with whatsapp_business_management permission
-- Generated from: Shipting Meta Embedded Signup - 1403441077449207
-- Token verified working with curl tests

UPDATE seller_whatsapp_config
SET access_token = 'EAAWKfVA5uZCMBQ3WQd8CSiKqLCFdXTIUaXtWVPSOJY3X9OFtZAXsbSLAoZCT1FFTa44rYhH1URksw3GEXcbHAojfMZAlAwj2NWNtnYhZBEfygeSMNzpZA6otO4KWDdZBbmZCmBwWM2RZAf1qjdhjMzOE2kuNXaWoP7WVmFIaHhYOmV0NJ197UH26f9TuVJcSPJtMrkX5d5ShZAl78e7suyTQoRoWZCKXLcPAOQbVAMa3vYQLbgs0PZC5ZCjSal2XseXTTuEkYDLxC6otsybqgVBnjYNDc0iuiU8hZCVm4ZD',
    updated_at = NOW()
WHERE wh_account_id = 1035;

-- Verify the update
SELECT
    wh_account_id,
    seller_id,
    LEFT(access_token, 30) || '...' as token_preview,
    waba_id,
    phone_number_id,
    business_phone_number_id,
    catalog_id,
    updated_at
FROM seller_whatsapp_config
WHERE wh_account_id = 1035;
