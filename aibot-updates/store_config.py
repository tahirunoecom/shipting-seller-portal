# actions/store_config.py
"""
Multi-Tenant WhatsApp Store Configuration
Fetches seller configuration from API based on phone number

Supports two lookup methods:
1. get_store_from_phone() - by display phone number (e.g., +17158826516)
2. get_seller_by_phone_number_id() - by Meta's phone_number_id (e.g., "850008814869854")
"""
import os
import logging
import requests
import re
import time
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# API Configuration
API_BASE = os.getenv("SELLER_API_URL", "https://stageshipperapi.thedelivio.com/api")
SELLER_API_KEY = os.getenv("SELLER_API_KEY", "")  # Optional: for internal API auth

# Cache timeout (seconds)
CACHE_TIMEOUT = 1800  # 30 minutes

# In-memory cache for store configs
_store_config_cache: Dict[str, Dict[str, Any]] = {}
_cache_timestamps: Dict[str, float] = {}


def _is_cache_valid(cache_key: str) -> bool:
    """Check if cached data is still valid"""
    if cache_key not in _cache_timestamps:
        return False
    return (time.time() - _cache_timestamps[cache_key]) < CACHE_TIMEOUT


def _cache_store_info(cache_key: str, store_info: Dict[str, Any], ttl_seconds: int = None):
    """Cache store info with TTL"""
    _store_config_cache[cache_key] = store_info
    if ttl_seconds:
        # Custom TTL (for negative results)
        _cache_timestamps[cache_key] = time.time() - CACHE_TIMEOUT + ttl_seconds
    else:
        _cache_timestamps[cache_key] = time.time()


def normalize_phone(phone_number: str) -> str:
    """
    Normalize phone number by removing spaces, dashes, parentheses
    Keep only digits and + sign
    """
    if not phone_number:
        return ""
    # Remove 'whatsapp:' prefix if present
    clean = phone_number.replace("whatsapp:", "").strip()
    # Keep only digits and +
    clean = re.sub(r'[^0-9+]', '', clean)
    # Ensure + prefix
    if clean and not clean.startswith("+"):
        clean = f"+{clean}"
    return clean


# ============================================
# METHOD 1: Lookup by display phone number
# ============================================

def get_store_from_phone(phone_number: str) -> Optional[Dict[str, Any]]:
    """
    Get store information from display phone number via API

    Args:
        phone_number: Display phone number (e.g., +17158826516)

    Returns:
        dict with store_id, store_name, access_token, phone_number_id, catalog_id
        or None if not found/not connected
    """
    logger.info(f"[STORE CONFIG] ========== LOOKUP BY DISPLAY PHONE ==========")
    logger.info(f"[STORE CONFIG] Input phone_number: '{phone_number}'")

    # Normalize phone number
    clean_phone = normalize_phone(phone_number)
    logger.info(f"[STORE CONFIG] Normalized phone: '{clean_phone}'")

    if not clean_phone:
        logger.info(f"[STORE CONFIG] Empty phone number, returning None")
        return None

    # Check cache first
    cache_key = f"phone:{clean_phone}"
    if _is_cache_valid(cache_key) and cache_key in _store_config_cache:
        cached = _store_config_cache[cache_key]
        if cached.get("store_id"):
            logger.info(f"[STORE CONFIG] Cache HIT for {clean_phone}")
            return cached
        else:
            logger.info(f"[STORE CONFIG] Cache HIT (negative) for {clean_phone}")
            return None

    logger.info(f"[STORE CONFIG] Cache MISS - calling API...")

    # Call API
    try:
        response = requests.post(
            f"{API_BASE}/whatsapp-config-by-phone",
            json={"phone_number": clean_phone},
            timeout=10
        )
        data = response.json()
        logger.info(f"[STORE CONFIG] API response status: {data.get('status')}")

        if data.get("status") == 1 and data.get("data"):
            config = data["data"]

            # Check if connected
            if config.get("is_connected") != 1 or config.get("connection_status") != "connected":
                logger.warning(f"[STORE CONFIG] Store not connected")
                _cache_store_info(cache_key, {"store_id": None}, ttl_seconds=300)
                return None

            # Build store info
            store_info = {
                "store_id": str(config.get("wh_account_id")),
                "store_name": config.get("business_name") or config.get("company_name") or config.get("verified_name") or "Store",
                "access_token": config.get("access_token"),
                "phone_number_id": config.get("phone_number_id"),
                "catalog_id": config.get("catalog_id"),
                "waba_id": config.get("waba_id"),
                "display_phone_number": config.get("display_phone_number"),
                "email": config.get("email"),
            }

            logger.info(f"[STORE CONFIG] Found store: {store_info['store_name']} (ID: {store_info['store_id']})")
            _cache_store_info(cache_key, store_info)

            # Also cache by phone_number_id for cross-lookup
            if store_info.get("phone_number_id"):
                _cache_store_info(f"pnid:{store_info['phone_number_id']}", store_info)

            return store_info
        else:
            logger.warning(f"[STORE CONFIG] No config found for {clean_phone}: {data.get('message')}")
            _cache_store_info(cache_key, {"store_id": None}, ttl_seconds=300)
            return get_store_from_phone_fallback(clean_phone)

    except requests.exceptions.RequestException as e:
        logger.error(f"[STORE CONFIG] API request failed: {e}")
        if cache_key in _store_config_cache and _store_config_cache[cache_key].get("store_id"):
            logger.info(f"[STORE CONFIG] Using expired cache for {clean_phone}")
            return _store_config_cache[cache_key]
        return get_store_from_phone_fallback(clean_phone)
    except Exception as e:
        logger.error(f"[STORE CONFIG] Error: {e}")
        return get_store_from_phone_fallback(clean_phone)


# ============================================
# METHOD 2: Lookup by phone_number_id (Meta's ID)
# ============================================

def get_seller_by_phone_number_id(phone_number_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch seller configuration by WhatsApp phone_number_id (Meta's ID)
    Falls back to hardcoded mapping if API fails

    Args:
        phone_number_id: The WhatsApp Business phone number ID from Meta (e.g., "850008814869854")

    Returns:
        dict: Seller configuration including:
            - store_id (wh_account_id)
            - store_name
            - access_token (for WhatsApp API)
            - phone_number_id
            - catalog_id
        or None if not found
    """
    logger.info(f"[STORE CONFIG] ========== LOOKUP BY PHONE_NUMBER_ID ==========")
    logger.info(f"[STORE CONFIG] phone_number_id: '{phone_number_id}'")

    if not phone_number_id:
        return None

    # Check cache first
    cache_key = f"pnid:{phone_number_id}"
    if _is_cache_valid(cache_key) and cache_key in _store_config_cache:
        cached = _store_config_cache[cache_key]
        if cached.get("store_id"):
            logger.info(f"[STORE CONFIG] Cache HIT for phone_number_id: {phone_number_id}")
            return cached
        else:
            logger.info(f"[STORE CONFIG] Cache HIT (negative) for phone_number_id: {phone_number_id}")
            return None

    logger.info(f"[STORE CONFIG] Cache MISS - calling API...")

    # Call API (if endpoint exists)
    try:
        # Try the phone_number_id specific endpoint first
        headers = {"Content-Type": "application/json"}
        if SELLER_API_KEY:
            headers["X-Internal-API-Key"] = SELLER_API_KEY

        response = requests.post(
            f"{API_BASE}/whatsapp-config-by-phone-number-id",
            json={"phone_number_id": phone_number_id},
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1 and data.get("data"):
                config = data["data"]

                # Check if connected
                if config.get("is_connected") != 1 or config.get("connection_status") != "connected":
                    logger.warning(f"[STORE CONFIG] Store not connected")
                    _cache_store_info(cache_key, {"store_id": None}, ttl_seconds=300)
                    return None

                store_info = {
                    "store_id": str(config.get("wh_account_id")),
                    "store_name": config.get("business_name") or config.get("company_name") or config.get("verified_name") or "Store",
                    "access_token": config.get("access_token"),
                    "phone_number_id": config.get("phone_number_id"),
                    "catalog_id": config.get("catalog_id"),
                    "waba_id": config.get("waba_id"),
                    "display_phone_number": config.get("display_phone_number"),
                    "email": config.get("email"),
                }

                logger.info(f"[STORE CONFIG] Found store: {store_info['store_name']} (ID: {store_info['store_id']})")
                _cache_store_info(cache_key, store_info)
                return store_info

        # API didn't work, try fallback
        logger.warning(f"[STORE CONFIG] API failed for phone_number_id: {phone_number_id}, using fallback")
        return _get_fallback_by_phone_number_id(phone_number_id)

    except requests.exceptions.RequestException as e:
        logger.error(f"[STORE CONFIG] API error: {e}")
        if cache_key in _store_config_cache and _store_config_cache[cache_key].get("store_id"):
            return _store_config_cache[cache_key]
        return _get_fallback_by_phone_number_id(phone_number_id)
    except Exception as e:
        logger.error(f"[STORE CONFIG] Unexpected error: {e}")
        return _get_fallback_by_phone_number_id(phone_number_id)


# ============================================
# CACHE MANAGEMENT
# ============================================

def clear_cache(phone_number: str = None, phone_number_id: str = None):
    """
    Clear store config cache

    Args:
        phone_number: Clear by display phone number
        phone_number_id: Clear by phone_number_id
        If both None, clears all cache
    """
    global _store_config_cache, _cache_timestamps

    if phone_number:
        clean = normalize_phone(phone_number)
        key = f"phone:{clean}"
        _store_config_cache.pop(key, None)
        _cache_timestamps.pop(key, None)
        logger.info(f"[STORE CONFIG] Cleared cache for phone: {clean}")
    elif phone_number_id:
        key = f"pnid:{phone_number_id}"
        _store_config_cache.pop(key, None)
        _cache_timestamps.pop(key, None)
        logger.info(f"[STORE CONFIG] Cleared cache for phone_number_id: {phone_number_id}")
    else:
        _store_config_cache = {}
        _cache_timestamps = {}
        logger.info("[STORE CONFIG] Cleared all cache")


# Alias for backward compatibility
clear_store_cache = clear_cache


# ============================================
# FALLBACK: Hardcoded mapping for backward compatibility
# This ensures Dear Delhi bot keeps working even if API fails
# ============================================

# Map phone_number_id to store config
PHONE_NUMBER_ID_FALLBACK = {
    "850008814869854": {  # Dear Delhi
        "store_id": "966",
        "store_name": "Dear Delhi",
        "phone_number_id": "850008814869854",
        "access_token": None,  # Will use default from credentials.yml
        "catalog_id": "1160420602911130",
        "display_phone_number": "+17158826516",
    },
}

# Map display phone number to store
WHATSAPP_STORE_MAPPING_FALLBACK = {
    "+17158826516": {
        "store_id": "966",
        "store_name": "Dear Delhi",
        "phone_number_id": "850008814869854",
        "access_token": None,
        "catalog_id": "1160420602911130",
    },
}


def _get_fallback_by_phone_number_id(phone_number_id: str) -> Optional[Dict[str, Any]]:
    """Fallback to hardcoded mapping by phone_number_id"""
    result = PHONE_NUMBER_ID_FALLBACK.get(phone_number_id)
    if result:
        logger.info(f"[STORE CONFIG] FALLBACK: Found {result['store_name']} for phone_number_id {phone_number_id}")
    return result


def get_store_from_phone_fallback(phone_number: str) -> Optional[Dict[str, Any]]:
    """Fallback to hardcoded mapping by display phone number"""
    clean_phone = normalize_phone(phone_number)
    result = WHATSAPP_STORE_MAPPING_FALLBACK.get(clean_phone)
    if result:
        logger.info(f"[STORE CONFIG] FALLBACK: Found {result['store_name']} for {clean_phone}")
    return result
