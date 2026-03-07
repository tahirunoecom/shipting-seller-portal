-- Update access token for wh_account_id = 1035
-- New token with whatsapp_business_management permission
-- Generated from: Shipting Meta Embedded Signup - 1403441077449207

UPDATE seller_whatsapp_config
SET access_token = 'EAAWKfVA5uZCMBQZDWG98CSKqLGFdXTiUzXHWPSOJY3XBOFiZA4xsSLAcZC11+T+4kYHH1URrawG6ExsbHAojtRZAHAw',
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
