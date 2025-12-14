"""
Multi-Tenant WhatsApp Store Configuration
Fetches seller configuration from Laravel API based on phone_number_id

This replaces the hardcoded mapping with dynamic database-driven lookup.
"""
import os
import logging
import requests
from typing import Optional, Dict, Any
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

# Laravel API Configuration
SELLER_API_BASE = os.getenv("SELLER_API_URL", "https://stageshipperapi.thedelivio.com/api")
SELLER_API_KEY = os.getenv("SELLER_API_KEY", "")  # Internal API key for bot-to-API auth

# Cache timeout (seconds)
CACHE_TIMEOUT = 300  # 5 minutes

# In-memory cache for seller configs
_seller_cache: Dict[str, Dict[str, Any]] = {}
_cache_timestamps: Dict[str, float] = {}


def _is_cache_valid(phone_number_id: str) -> bool:
    """Check if cached data is still valid"""
    if phone_number_id not in _cache_timestamps:
        return False
    return (time.time() - _cache_timestamps[phone_number_id]) < CACHE_TIMEOUT


def get_seller_by_phone_number_id(phone_number_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch seller configuration from Laravel API by WhatsApp phone_number_id

    Args:
        phone_number_id: The WhatsApp Business phone number ID (from Meta)

    Returns:
        dict: Seller configuration including:
            - store_id (wh_account_id)
            - store_name
            - access_token (for WhatsApp API)
            - waba_id
            - catalog_id
            - bot_settings
        or None if not found
    """
    try:
        # Check cache first
        if _is_cache_valid(phone_number_id) and phone_number_id in _seller_cache:
            logger.info(f"Cache hit for phone_number_id: {phone_number_id}")
            return _seller_cache[phone_number_id]

        logger.info(f"Fetching seller config for phone_number_id: {phone_number_id}")

        # Call Laravel API
        response = requests.post(
            f"{SELLER_API_BASE}/internal/whatsapp/get-seller-by-phone",
            json={"phone_number_id": phone_number_id},
            headers={
                "Content-Type": "application/json",
                "X-Internal-API-Key": SELLER_API_KEY
            },
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1 and data.get("data"):
                seller_config = data["data"]

                # Cache the result
                _seller_cache[phone_number_id] = seller_config
                _cache_timestamps[phone_number_id] = time.time()

                logger.info(f"Found seller: {seller_config.get('store_name')} (ID: {seller_config.get('store_id')})")
                return seller_config

        logger.warning(f"No seller found for phone_number_id: {phone_number_id}")
        return None

    except requests.exceptions.RequestException as e:
        logger.error(f"API error fetching seller config: {e}")
        # Return cached data if available (even if expired)
        if phone_number_id in _seller_cache:
            logger.info(f"Using expired cache for phone_number_id: {phone_number_id}")
            return _seller_cache[phone_number_id]
        return None
    except Exception as e:
        logger.error(f"Unexpected error in get_seller_by_phone_number_id: {e}")
        return None


def get_store_from_phone(phone_number: str) -> Optional[Dict[str, Any]]:
    """
    Legacy function - Get store info from display phone number
    This is kept for backward compatibility with existing code

    For multi-tenant, use get_seller_by_phone_number_id instead

    Args:
        phone_number: Display phone number (e.g., +17158826516)

    Returns:
        dict with store_id and store_name, or None
    """
    try:
        # Clean phone number
        clean_phone = phone_number.replace("whatsapp:", "").strip()
        if not clean_phone.startswith("+"):
            clean_phone = f"+{clean_phone}"

        logger.info(f"Looking up store by display phone: {clean_phone}")

        # Call Laravel API
        response = requests.post(
            f"{SELLER_API_BASE}/internal/whatsapp/get-seller-by-display-phone",
            json={"display_phone": clean_phone},
            headers={
                "Content-Type": "application/json",
                "X-Internal-API-Key": SELLER_API_KEY
            },
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1 and data.get("data"):
                seller = data["data"]
                return {
                    "store_id": seller.get("store_id"),
                    "store_name": seller.get("store_name")
                }

        return None

    except Exception as e:
        logger.error(f"Error in get_store_from_phone: {e}")
        return None


def clear_cache(phone_number_id: str = None):
    """
    Clear seller cache

    Args:
        phone_number_id: Specific ID to clear, or None to clear all
    """
    global _seller_cache, _cache_timestamps

    if phone_number_id:
        _seller_cache.pop(phone_number_id, None)
        _cache_timestamps.pop(phone_number_id, None)
        logger.info(f"Cleared cache for: {phone_number_id}")
    else:
        _seller_cache = {}
        _cache_timestamps = {}
        logger.info("Cleared all seller cache")


# ============================================
# FALLBACK: Hardcoded mapping for testing
# Remove this in production
# ============================================

WHATSAPP_STORE_MAPPING_FALLBACK = {
    "+17158826516": {"store_id": "966", "store_name": "Dear Delhi"},
}

def get_store_from_phone_fallback(phone_number: str) -> Optional[Dict[str, Any]]:
    """Fallback to hardcoded mapping if API fails"""
    clean_phone = phone_number.replace("whatsapp:", "").strip()
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"
    return WHATSAPP_STORE_MAPPING_FALLBACK.get(clean_phone)
