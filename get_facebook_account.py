#!/usr/bin/env python3
"""
Script to retrieve Facebook account email from WhatsApp Business API IDs

Usage:
    python get_facebook_account.py YOUR_ACCESS_TOKEN

Or set ACCESS_TOKEN environment variable:
    ACCESS_TOKEN=your_token python get_facebook_account.py
"""

import sys
import os
import requests
import json
from datetime import datetime

# Your WhatsApp Business Account details
BUSINESS_ID = '1856101791959161'
WABA_ID = '1659914091647877'
PHONE_NUMBER_ID = '850008814869854'

# Get access token from argument or environment
ACCESS_TOKEN = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('ACCESS_TOKEN')

if not ACCESS_TOKEN or ACCESS_TOKEN == 'YOUR_ACCESS_TOKEN':
    print('❌ Error: Please provide an access token\n')
    print('Usage:')
    print('  python get_facebook_account.py YOUR_ACCESS_TOKEN\n')
    print('Or:')
    print('  ACCESS_TOKEN=your_token python get_facebook_account.py\n')
    print('💡 Tip: Your access token is stored in the database (seller_whatsapp_config table)')
    sys.exit(1)


def graph_request(path):
    """Make a Graph API request"""
    url = f'https://graph.facebook.com/v21.0{path}'
    separator = '&' if '?' in path else '?'
    url += f'{separator}access_token={ACCESS_TOKEN}'

    response = requests.get(url)
    data = response.json()

    if 'error' in data:
        raise Exception(f"API Error: {data['error']['message']}")

    return data


def main():
    print('\n🔍 Retrieving Facebook Account Information...\n')
    print('━' * 60 + '\n')

    # Method 1: Get current token owner (YOU)
    print('📧 Method 1: Getting token owner info...')
    try:
        me = graph_request('/me?fields=id,name,email')
        print('✅ Token Owner:')
        print(f"   Name:  {me.get('name')}")
        print(f"   Email: {me.get('email', '(not available - may need additional permissions)')}")
        print(f"   ID:    {me.get('id')}")
        print()
    except Exception as err:
        print(f'❌ {err}\n')

    # Method 2: Get business users/admins
    print('👥 Method 2: Getting business users...')
    try:
        business_users = graph_request(f'/{BUSINESS_ID}/business_users?fields=id,name,email')
        if business_users.get('data') and len(business_users['data']) > 0:
            print('✅ Business Users/Admins:')
            for index, user in enumerate(business_users['data'], 1):
                print(f"   {index}. {user.get('name')}")
                print(f"      Email: {user.get('email', '(not available)')}")
                print(f"      ID:    {user.get('id')}")
            print()
        else:
            print('⚠️  No business users found\n')
    except Exception as err:
        print(f'❌ {err}\n')

    # Method 3: Get WABA assigned users
    print('👤 Method 3: Getting WABA assigned users...')
    try:
        waba_users = graph_request(f'/{WABA_ID}/assigned_users?fields=name,email')
        if waba_users.get('data') and len(waba_users['data']) > 0:
            print('✅ WABA Assigned Users:')
            for index, user in enumerate(waba_users['data'], 1):
                print(f"   {index}. {user.get('name')}")
                print(f"      Email: {user.get('email', '(not available)')}")
            print()
        else:
            print('⚠️  No assigned users found\n')
    except Exception as err:
        print(f'❌ {err}\n')

    # Method 4: Debug token
    print('🔐 Method 4: Debug token information...')
    try:
        debug_info = graph_request(f'/debug_token?input_token={ACCESS_TOKEN}')
        if debug_info.get('data'):
            data = debug_info['data']
            print('✅ Token Info:')
            print(f"   User ID:    {data.get('user_id')}")
            print(f"   App ID:     {data.get('app_id')}")
            print(f"   Valid:      {data.get('is_valid')}")

            expires_at = data.get('expires_at')
            if expires_at and expires_at > 0:
                expires_date = datetime.fromtimestamp(expires_at).strftime('%Y-%m-%d %H:%M:%S')
                print(f"   Expires:    {expires_date}")
            else:
                print(f"   Expires:    Never")
            print()

            # Get user details from user_id
            user_id = data.get('user_id')
            if user_id:
                print('📧 Fetching user details from token user_id...')
                try:
                    user = graph_request(f'/{user_id}?fields=id,name,email')
                    print('✅ User Details:')
                    print(f"   Name:  {user.get('name')}")
                    print(f"   Email: {user.get('email', '(not available - may need additional permissions)')}")
                    print(f"   ID:    {user.get('id')}")
                    print()
                except Exception as err:
                    print(f'❌ {err}\n')
    except Exception as err:
        print(f'❌ {err}\n')

    print('━' * 60 + '\n')
    print('✨ Done!\n')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'\n❌ Error: {error}\n')
        sys.exit(1)
