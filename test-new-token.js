const TOKEN = 'EAAWKfVA5uZCMBQZDWG98CSKqLGFdXTiUzXHWPSOJY3XBOFiZA4xsSLAcZC11+T+4kYHH1URrawG6ExsbHAojtRZAHAw';
const WABA_ID = '504086999455720';
const CATALOG_ID = '894655139864702';

async function testToken() {
    console.log('🧪 Testing new access token...\n');

    // Test 1: Debug token to see permissions
    console.log('1️⃣ Checking token permissions...');
    try {
        const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`;
        const debugRes = await fetch(debugUrl);
        const debugData = await debugRes.json();
        
        if (debugData.error) {
            console.error('❌ Token debug failed:', debugData.error);
        } else {
            console.log('✅ Token is valid!');
            console.log('   App ID:', debugData.data.app_id);
            console.log('   User ID:', debugData.data.user_id);
            console.log('   Permissions:', debugData.data.scopes?.join(', ') || 'none');
            console.log('   Expires:', debugData.data.expires_at === 0 ? 'Never (permanent)' : new Date(debugData.data.expires_at * 1000));
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    console.log('\n2️⃣ Checking WABA access...');
    try {
        const wabaUrl = `https://graph.facebook.com/v21.0/${WABA_ID}?fields=id,name,message_template_namespace&access_token=${TOKEN}`;
        const wabaRes = await fetch(wabaUrl);
        const wabaData = await wabaRes.json();
        
        if (wabaData.error) {
            console.error('❌ WABA access failed:', wabaData.error);
        } else {
            console.log('✅ WABA accessible!');
            console.log('   WABA ID:', wabaData.id);
            console.log('   Name:', wabaData.name);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    console.log('\n3️⃣ Checking Catalog access...');
    try {
        const catalogUrl = `https://graph.facebook.com/v21.0/${CATALOG_ID}?fields=id,name,product_count&access_token=${TOKEN}`;
        const catalogRes = await fetch(catalogUrl);
        const catalogData = await catalogRes.json();
        
        if (catalogData.error) {
            console.error('❌ Catalog access failed:', catalogData.error);
        } else {
            console.log('✅ Catalog accessible!');
            console.log('   Catalog ID:', catalogData.id);
            console.log('   Name:', catalogData.name);
            console.log('   Products:', catalogData.product_count || 'N/A');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    console.log('\n4️⃣ Testing catalog-WABA link...');
    try {
        const linkUrl = `https://graph.facebook.com/v21.0/${WABA_ID}?fields=product_catalogs&access_token=${TOKEN}`;
        const linkRes = await fetch(linkUrl);
        const linkData = await linkRes.json();
        
        if (linkData.error) {
            console.error('❌ Link check failed:', linkData.error);
        } else {
            console.log('✅ Current linked catalogs:', linkData.product_catalogs?.data || []);
            
            const isLinked = linkData.product_catalogs?.data?.some(cat => cat.id === CATALOG_ID);
            if (isLinked) {
                console.log('✅ Catalog is already linked to WABA!');
            } else {
                console.log('⚠️  Catalog is NOT linked yet. Will attempt to link...');
                
                // Try to link
                const linkCatalogUrl = `https://graph.facebook.com/v21.0/${WABA_ID}?access_token=${TOKEN}`;
                const linkCatalogRes = await fetch(linkCatalogUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ catalog_id: CATALOG_ID })
                });
                const linkCatalogData = await linkCatalogRes.json();
                
                if (linkCatalogData.error) {
                    console.error('❌ Linking failed:', linkCatalogData.error);
                } else {
                    console.log('✅ Successfully linked catalog to WABA!', linkCatalogData);
                }
            }
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    console.log('\n✅ Test complete!\n');
}

testToken();
