import json
from typing import Any, Text, Dict, List

import os
import re
import requests
import stripe
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, EventType
from rasa_sdk.events import FollowupAction
from rasa_sdk.forms import FormValidationAction
from dotenv import load_dotenv
import random

# Import store mapping configuration
from actions.store_config import get_store_from_phone


# Load environment variables
load_dotenv()

# Import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    print("[WARNING] OpenAI library not installed. Smart fallback will use basic mode.")
    OPENAI_AVAILABLE = False

API_BASE = "https://stageshipperapi.thedelivio.com/api"


# ============================================================================
# LLM-BASED ENTITY EXTRACTION FOR NATURAL LANGUAGE SEARCH
# ============================================================================

def extract_product_with_llm(user_query: str) -> dict:
    """
    Use LLM to intelligently extract product/category from natural language.

    Examples:
    - "Buy me a samosa" → {"product": "samosa", "type": "product"}
    - "I want something spicy" → {"product": "spicy", "type": "preference"}
    - "What's popular?" → {"product": "popular", "type": "recommendation"}
    - "Show me vegetarian options" → {"product": "vegetarian", "type": "category"}

    Returns: {"product": str, "type": str, "confidence": str} or None
    """
    if not OPENAI_AVAILABLE:
        print("[LLM EXTRACT] OpenAI not available")
        return None

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[LLM EXTRACT] No API key")
        return None

    system_prompt = """You are a product extraction assistant for a food ordering chatbot.
Your job is to extract WHAT THE USER WANTS TO ORDER from their message.

RULES:
1. Extract the CORE product/food name only (not articles like "a", "an", "the", "some")
2. If user asks for recommendations/suggestions, return "popular"
3. If user mentions a category (vegetarian, spicy, desserts), extract that
4. If user is just greeting or chatting, return null
5. Be concise - extract 1-3 words max

RESPOND WITH JSON ONLY:
{"product": "extracted_term", "type": "product|category|preference|recommendation"}

If nothing to extract, respond: {"product": null, "type": null}

EXAMPLES:
"Buy me a samosa" → {"product": "samosa", "type": "product"}
"I want 2 pizzas" → {"product": "pizza", "type": "product"}
"Get me something spicy" → {"product": "spicy", "type": "preference"}
"What's good here?" → {"product": "popular", "type": "recommendation"}
"Show vegetarian items" → {"product": "vegetarian", "type": "category"}
"I'm craving paneer tikka" → {"product": "paneer tikka", "type": "product"}
"Any snacks?" → {"product": "snacks", "type": "category"}
"Surprise me" → {"product": "popular", "type": "recommendation"}
"hello" → {"product": null, "type": null}"""

    try:
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
            max_tokens=50,
            temperature=0.1  # Low temperature for consistent extraction
        )

        result_text = response.choices[0].message.content.strip()
        print(f"[LLM EXTRACT] Query: '{user_query}' → {result_text}")

        # Parse JSON response
        result = json.loads(result_text)

        if result.get("product"):
            return result
        return None

    except json.JSONDecodeError as e:
        print(f"[LLM EXTRACT] JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"[LLM EXTRACT] Error: {e}")
        return None


def simple_extract_product(user_query: str) -> str:
    """
    Simple fallback extraction when LLM is unavailable.
    Uses pattern removal to extract product name.
    """
    query = user_query.lower().strip()

    # Remove question marks and punctuation first
    query = re.sub(r'[?!.,;:]+', '', query).strip()

    # Remove common PHRASES first (order matters - longer phrases first)
    phrase_patterns = [
        # Question patterns
        r"^do you have\s+",
        r"^do you sell\s+",
        r"^do you serve\s+",
        r"^do u have\s+",
        r"^you got\s+",
        r"^got any\s+",
        r"^have any\s+",
        r"^is there\s+",
        r"^are there\s+",
        r"^any\s+",
        # Looking/searching patterns
        r"^looking for\s+",
        r"^searching for\s+",
        r"^search for\s+",
        r"^i'?m looking for\s+",
        r"^i'?m searching for\s+",
        r"^i'?m craving\s+",
        r"^craving\s+",
        # Request patterns
        r"^can i have\s+",
        r"^can i get\s+",
        r"^can you get me\s+",
        r"^can you show me\s+",
        r"^could i have\s+",
        r"^i want\s+",
        r"^i need\s+",
        r"^i'?d like\s+",
        r"^i would like\s+",
        r"^get me\s+",
        r"^give me\s+",
        r"^show me\s+",
        r"^find me\s+",
        r"^bring me\s+",
        # Simple patterns
        r"^buy\s+",
        r"^order\s+",
        r"^find\s+",
        r"^search\s+",
        r"^show\s+",
        # Hinglish
        r"^mujhe\s+",
        r"^mere liye\s+",
        r"\s+chahiye$",
        r"\s+dena$",
        r"\s+do$",
    ]

    result = query
    for pattern in phrase_patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE)

    # Remove remaining filler words
    remove_words = [
        "me", "us", "some", "a", "an", "the", "one", "two",
        "please", "pls", "plz",
        "yo", "hey", "hi", "hello", "bro", "dude", "man",
        "ek",
    ]

    for word in remove_words:
        result = re.sub(rf'\b{word}\b', '', result, flags=re.IGNORECASE)

    # Clean up whitespace
    result = re.sub(r'\s+', ' ', result).strip()

    print(f"[SIMPLE EXTRACT] '{user_query}' → '{result}'")
    return result if len(result) >= 2 else None


class ActionShowCategoriesWithProducts(Action):
    """Modified to show NATIVE LIST on WhatsApp"""
    
    def name(self) -> Text:
        return "action_show_categories_with_products"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        try:
            # Check inputs
            store_id = tracker.get_slot("store_id")  # No fallback - use store from session
            store_name = tracker.get_slot("store_name") or "Store"
            catalog_id = tracker.get_slot("catalog_id")
            is_dedicated_bot = tracker.get_slot("is_dedicated_bot")

            # Detect WhatsApp
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

            # Fetch Categories & Products
            payload = {"zipcode": ""}
            response = requests.post(f"{API_BASE}/getCategories", json=payload, timeout=10)
            response.raise_for_status()
            data = response.json()
            categories = data.get("data", {}).get("getCategories", [])
            
            if not categories:
                dispatcher.utter_message(text="Sorry, no categories found.")
                return []
            
            # Collect products
            all_products = []
            for category in categories:
                cat_products = category.get("getMasterProductOfCategory", [])
                # Filter by store if needed (using shipper_id or wh_account_id)
                if store_id:
                     cat_products = [p for p in cat_products if str(p.get("shipper_id")) == str(store_id)]
                all_products.extend(cat_products)

            # ⭐ NATIVE WHATSAPP LIST LOGIC
            if is_whatsapp and all_products:
                product_items = []
                # WhatsApp limits lists to 30 items
                for p in all_products[:30]:
                    # Get ID that matches your Catalog
                    raw_id = p.get("product_id") or p.get("ai_product_id") or p.get("id")
                    if raw_id:
                        product_items.append({
                            "product_retailer_id": str(raw_id).strip()
                        })

                if product_items and catalog_id:
                    dispatcher.utter_message(
                        json_message={
                            "type": "product_list",
                            "catalog_id": catalog_id,  # ⭐ DYNAMIC CATALOG ID
                            "header": f"{store_name} Menu",
                            "body": f"Here are our top items available for you.",
                            "sections": [
                                {
                                    "title": "Popular Items",
                                    "product_items": product_items
                                }
                            ]
                        }
                    )
                    return [SlotSet("recent_products", json.dumps(all_products))]
                elif product_items and not catalog_id:
                    # No catalog - fallback to text list
                    messages = []
                    for idx, p in enumerate(all_products[:10], start=1):
                        title = p.get("title", "Product")
                        price = p.get("product_price", "-")
                        messages.append(f"{idx}. {title} (${price})")
                    prod_text = "\n".join(messages)
                    dispatcher.utter_message(text=f"🛍️ Products at {store_name}:\n{prod_text}")
                    return [SlotSet("recent_products", json.dumps(all_products))]

            # --- Fallback for Website / Non-WhatsApp (Text List) ---
            messages = []
            global_idx = 1
            for p in all_products[:10]:
                title = p.get("title", "Product")
                price = p.get("product_price", "-")
                messages.append(f"{global_idx}. {title} (${price})")
                global_idx += 1
            
            prod_text = "\n".join(messages)
            dispatcher.utter_message(text=f"Here are some products:\n{prod_text}")

            return [SlotSet("recent_products", json.dumps(all_products))]

        except Exception as e:
            print(f"[EXCEPTION] in ActionShowCategoriesWithProducts: {e}")
            dispatcher.utter_message(text="Sorry, I couldn't fetch products right now.")
            return []


class ActionSearchProducts(Action):
    """Search products with free text or entity-based search"""

    def name(self) -> Text:
        return "action_search_products"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:

        # Get entities from the latest user message
        category = next(tracker.get_latest_entity_values("product_category"), None)
        name = next(tracker.get_latest_entity_values("product_name"), None)

        # Get the user's full message for free text search
        user_message = tracker.latest_message.get("text", "").strip()

        # Extract search query
        search_string = ""

        # Priority: entity > extracted from message
        if name:
            search_string = name
        elif category:
            search_string = category
        else:
            # Try to extract search query from common patterns
            message_lower = user_message.lower()
            search_patterns = [
                "search for ", "search ", "find ", "looking for ",
                "i want ", "show me ", "do you have ", "get me ",
                "order ", "buy ", "i need "
            ]
            for pattern in search_patterns:
                if pattern in message_lower:
                    # Extract text after the pattern
                    idx = message_lower.find(pattern)
                    search_string = user_message[idx + len(pattern):].strip()
                    # Clean up common suffixes
                    for suffix in ["?", "!", ".", "please", "pls"]:
                        search_string = search_string.replace(suffix, "").strip()
                    break

            # If still empty, use the whole message (minus common words)
            if not search_string:
                skip_words = ["search", "find", "show", "products", "product", "me", "i", "want", "to", "a", "the"]
                words = [w for w in user_message.split() if w.lower() not in skip_words]
                search_string = " ".join(words)

        if not search_string or len(search_string) < 2:
            dispatcher.utter_message(text="What would you like to search for? Type something like 'search pizza' or 'find samosa'")
            return []

        print(f"[SEARCH] Query: '{search_string}'")

        # Get store context for filtering
        store_id = tracker.get_slot("store_id")
        is_dedicated_bot = tracker.get_slot("is_dedicated_bot")

        # Detect channel
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        url = f"{API_BASE}/getMasterProducts"
        json_body = {
            "wh_account_id": str(store_id) if (is_dedicated_bot and store_id) else "",
            "upc": "",
            "ai_category_id": "",
            "ai_product_id": "",
            "product_id": "",
            "search_string": search_string,
            "zipcode": "",
            "user_id": "",
            "page": "1",
            "items": "10"
        }

        try:
            print(f"[SEARCH] API request: {json_body}")
            response = requests.post(url, json=json_body, timeout=10)
            data = response.json()

            print(f"[SEARCH] API status: {data.get('status')}")

            # Correct parsing: data.getMasterProducts
            products = data.get("data", {}).get("getMasterProducts", [])

            if not products or len(products) == 0:
                if is_whatsapp:
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": f"🔍 No products found for '{search_string}'.\n\nTry a different search or browse our catalog.",
                            "buttons": [
                                {"id": "browse_products", "title": "🛍️ Browse Products"}
                            ]
                        }
                    )
                else:
                    dispatcher.utter_message(text=f"No products found matching '{search_string}'.")
                return []

            print(f"[SEARCH] Found {len(products)} products")

            if is_whatsapp:
                # Build WhatsApp list message for search results
                sections = [{
                    "title": f"Results for '{search_string[:20]}'",
                    "rows": []
                }]

                for p in products[:10]:  # Max 10 items
                    product_id = p.get("product_id", p.get("ai_product_id", ""))
                    title = p.get("title", "Product")[:24]

                    try:
                        price = float(p.get("discounted_price") or p.get("product_price", 0))
                        price_str = f"${price:.2f}"
                    except:
                        price_str = ""

                    store_name = p.get("store_name", "")[:20]
                    description = f"{price_str} - {store_name}" if store_name else price_str

                    sections[0]["rows"].append({
                        "id": f"product_{product_id}",
                        "title": title,
                        "description": description[:72]
                    })

                dispatcher.utter_message(
                    json_message={
                        "type": "list",
                        "text": f"🔍 Found {len(products)} result(s) for *{search_string}*\n\nTap below to view:",
                        "button_text": "View Products",
                        "sections": sections
                    }
                )
            else:
                # Text format for web
                product_lines = []
                for idx, p in enumerate(products[:5], start=1):
                    title = p.get("title", "Unnamed Product")
                    try:
                        price = float(p.get("discounted_price") or p.get("product_price", 0))
                        price_str = f"${price:.2f}"
                    except:
                        price_str = "-"
                    product_lines.append(f"{idx}. {title} ({price_str})")

                message = f"🔍 Search results for '{search_string}':\n\n" + "\n".join(product_lines)
                dispatcher.utter_message(text=message + "\n\nReply with the product number to select it.")

            # Save product list in slot for selection
            return [SlotSet("recent_products", json.dumps(products))]

        except Exception as e:
            print(f"[SEARCH] Exception: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Sorry, I couldn't search right now. Please try again.")
            return []


class ActionSelectProduct(Action):
    def name(self) -> Text:
        return "action_select_product"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        
        # 1. Handle login flow first
        if tracker.get_slot("login_step"):
            try:
                login_action = ActionLoginUser()
                return login_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] delegating to login: {e}")
                return [FollowupAction("action_login_user")]
        
        user_text = tracker.latest_message.get("text", "").strip().lower()
        
        # 2. ✅ NEW: Check for store selection context FIRST
        # This is the most important check. If stores_list exists, we are selecting a store.
        stores_list = tracker.get_slot("stores_list")
        if stores_list:
            print("[ActionSelectProduct] Detected stores_list, delegating to ActionSetSelectedStore.")
            try:
                store_action = ActionSetSelectedStore()
                return store_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] delegating to store action: {e}")
                return [FollowupAction("action_set_selected_store")]
                
        # 3. Check for product selection context
        recent_products_json = tracker.get_slot("recent_products")
        if not recent_products_json:
            # 3a. No products AND no stores. Check if it's a new zip code.
            if re.fullmatch(r"\d{5}", user_text):
                return [
                    SlotSet("zipcode", user_text),
                    SlotSet("stores_list", None),
                    SlotSet("selected_store", None),
                    FollowupAction("action_get_nearest_store")
                ]
            # 3b. No context at all.
            dispatcher.utter_message(text="I don't have any recently shown products to select from. Please search for products first.")
            return []

        # 4. We are NOT selecting a store and we HAVE recent products. Proceed with product selection.
        try:
            products = json.loads(recent_products_json)
            if not isinstance(products, list):
                raise ValueError("recent_products slot did not contain a list!")
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"[EXCEPTION] loading recent products: {e}, slot content: {recent_products_json}")
            dispatcher.utter_message(text="Sorry, there was an internal error with product selection. Please show the categories/products again first.")
            return [SlotSet("recent_products", None)] # Clear bad slot

        # Check if this is a WhatsApp list selection
        metadata = tracker.latest_message.get("metadata", {})
        list_item_id = metadata.get("list_item_id")

        selected_product = None

        # Handle WhatsApp list selection (format: "product_{product_id}")
        if list_item_id and list_item_id.startswith("product_"):
            try:
                # Extract product_id from list_item_id
                product_id_from_list = list_item_id.split("_", 1)[1]  # "product_123" -> "123"
                print(f"[SELECT] WhatsApp list selection: {list_item_id} -> product_id: {product_id_from_list}")

                # Find product by product_id
                for p in products:
                    pid = str(p.get("product_id") or p.get("id", ""))
                    if pid == product_id_from_list:
                        selected_product = p
                        print(f"[SELECT] Found product by ID: {pid}")
                        break

                # Fallback: try as index (for older format)
                if not selected_product:
                    try:
                        index = int(product_id_from_list) - 1
                        if 0 <= index < len(products):
                            selected_product = products[index]
                            print(f"[SELECT] Found product by index: {index}")
                    except ValueError:
                        pass
            except (ValueError, IndexError) as e:
                print(f"[SELECT] Error parsing list_item_id: {e}")

        # Handle text-based selection (number)
        if not selected_product and user_text.isdigit():
            index = int(user_text) - 1
            if 0 <= index < len(products):
                selected_product = products[index]

        # Handle text-based selection (name matching)
        if not selected_product:
            # Clean user text - might include description from list click
            # e.g., "Veg Samosa\n₹5.95 - Crispy Pastry..."
            clean_text = user_text.split('\n')[0].strip().lower()  # Take first line
            clean_text = re.sub(r'[₹$€£]\d+\.?\d*', '', clean_text).strip()  # Remove price

            for p in products:
                title = (p.get("title") or p.get("product_name") or "").lower()
                # Exact match first
                if clean_text == title:
                    selected_product = p
                    break
                # Partial match
                if clean_text in title or title in clean_text:
                    selected_product = p
                    break
        
        if not selected_product:
            dispatcher.utter_message(text="Sorry, I couldn't find a product matching your selection. Please try again.")
            return []

        title = selected_product.get("title", "Unnamed Product")
        try:
            price = float(selected_product.get("discounted_price")) if selected_product.get("discounted_price") else float(selected_product.get("product_price", 0))
            price_str = f"${price:.2f}"
        except (ValueError, TypeError):
            price_str = "-"
        description = selected_product.get("description", "No description available.")
        product_type = selected_product.get("product_type", "")
        store_name = selected_product.get("store_name", "Unknown Store")
        discount = selected_product.get("discount")
        try:
            qty = float(selected_product.get("quantity", 0))
            ordered = float(selected_product.get("ordered_qty", 0))
            available = int(qty - ordered)
        except (ValueError, TypeError):
            available = "Unknown"
        extras = []
        try:
            if discount and float(discount) > 0:
                extras.append(f"{discount}% off")
        except (ValueError, TypeError):
            pass
        if available != "Unknown":
            extras.append(f"{available} available")
        extra_info = " | ".join(extras)

        # Get product image
        image_url = selected_product.get("images", "")
        if image_url and isinstance(image_url, str):
            # Handle comma-separated images
            image_url = image_url.split(",")[0].strip()

        # Detect if WhatsApp
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        if is_whatsapp:
            # Send product image first (if available)
            if image_url:
                try:
                    message = f"*{title}*\n\n{description}\n\n💰 Price: {price_str}"
                    if extra_info:
                        message += f"\n📦 {extra_info}"

                    dispatcher.utter_message(image=image_url, text=message)
                except Exception as e:
                    print(f"[SELECT] Error sending image: {e}")

            # Send interactive buttons (WhatsApp allows max 3 buttons)
            button_message = "What would you like to do?"
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": button_message,
                    "buttons": [
                        {"id": "add_to_cart", "title": "🛒 Add to Cart"},
                        {"id": "add_to_wishlist", "title": "❤️ Save to Favorites"},
                        {"id": "no_thanks", "title": "❌ No, thanks"}
                    ]
                }
            )
        else:
            # Web widget - show details with buttons
            message = (
                f"You selected: {title}\n"
                f"Price: {price_str}\n"
            )
            if product_type:
                message += f"Type: {product_type}\n"
            message += (
                f"Store: {store_name}\n"
                f"Availability: {extra_info}\n"
                f"Description: {description}\n\n"
                "Would you like to add this product to your cart?"
            )

            dispatcher.utter_message(
                text=message,
                buttons=[
                    {"title": "🛒 Add to cart", "payload": "Add to Cart"},
                    {"title": "❤️ Save to Favorites", "payload": "/add_to_wishlist"},
                    {"title": "No", "payload": "No"}
                ]
            )

        # Store selected product info for wishlist action
        product_id = selected_product.get("product_id") or selected_product.get("id")
        shipper_id = selected_product.get("shipper_id")

        return [
            SlotSet("selected_product", json.dumps(selected_product)),
            SlotSet("selected_product_id", str(product_id) if product_id else None),
            SlotSet("selected_product_name", title),
            SlotSet("shipper_id", str(shipper_id) if shipper_id else None)
        ]


class ActionAddToCart(Action):
    def name(self) -> Text:
        return "action_add_to_cart"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        # Require login: user_id must be set and numeric
        user_id = tracker.get_slot("user_id")
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            # Check channel for WhatsApp
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

            if is_whatsapp:
                # WhatsApp interactive buttons
                dispatcher.utter_message(
                    text="You need to log in before adding a product to your cart.",
                    json_message={
                        "type": "buttons",
                        "text": "You need to log in before adding a product to your cart.",
                        "buttons": [
                            {"id": "login", "title": "🔐 Login"},
                            {"id": "register", "title": "📝 Register"}
                        ]
                    }
                )
            else:
                # Web widget buttons
                dispatcher.utter_message(
                    text="You need to log in before adding a product to your cart. Please type 'login' to log in.",
                    buttons=[
                        {"title": "Login", "payload": "login"},
                        {"title": "Register", "payload": "register"}
                    ]
                )
            return []  # ← Changed from FollowupAction to empty return

        selected_product_json = tracker.get_slot("selected_product")
        if not selected_product_json:
            dispatcher.utter_message(text="You have not selected a product to add. Please select a product first.")
            return []

        try:
            product = json.loads(selected_product_json)
        except (json.JSONDecodeError, TypeError) as e:
            print(f"[EXCEPTION] parsing selected product: {e}")
            dispatcher.utter_message(text="Sorry, I had trouble with your selected product.")
            return []

        product_id = product.get("product_id")
        shipper_id = product.get("shipper_id")
        if not product_id or not shipper_id:
            dispatcher.utter_message(text="Selected product information incomplete.")
            return []

        payload = {
            "user_id": user_id,
            "quantity": 1,
            "product_id": product_id,
            "shipper_id": shipper_id,
        }

        try:
            url = "https://stageshipperapi.thedelivio.com/api/add-product-to-cart"
            res = requests.post(url, json=payload, timeout=8)
            print(f"[API CALL] POST {url} - Status: {res.status_code}, Body: {payload}")
            resp_json = res.json()
            print(f"[API RESPONSE] {resp_json}")

            if res.status_code == 200 and resp_json.get("status") == 1:
                product_name = product.get('title', 'The product')

                # Check channel for WhatsApp
                input_channel = tracker.get_latest_input_channel()
                is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

                if is_whatsapp:
                    # WhatsApp interactive buttons with Favorites option
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": f"🛒 *{product_name}* added to cart!\n\nWhat would you like to do next?",
                            "buttons": [
                                {"id": "view_cart", "title": "🛒 View Cart"},
                                {"id": "add_to_wishlist", "title": "❤️ Save to Favorites"},
                                {"id": "continue_shopping", "title": "🛍️ Continue Shopping"}
                            ]
                        }
                    )
                else:
                    # Web widget buttons
                    dispatcher.utter_message(
                        text=f"🛒 {product_name} has been added to your cart!\n\nWhat would you like to do next?",
                        buttons=[
                            {"title": "🛒 View Cart", "payload": "View Cart"},
                            {"title": "❤️ Save to Favorites", "payload": "/add_to_wishlist"},
                            {"title": "🛍️ Continue Shopping", "payload": "/show_categories"}
                        ]
                    )
                
            else:
                msg = resp_json.get("message", "Could not add the product to your cart, please try again.")
                dispatcher.utter_message(text=msg)
        except Exception as e:
            print(f"[EXCEPTION] adding product to cart: {e}")
            dispatcher.utter_message(text="An error occurred while adding to cart.")
        return []


class ActionViewCart(Action):
    """Enhanced cart view with empty cart handling + remove buttons"""
    
    def name(self) -> Text:
        return "action_view_cart"

    def run(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> List[EventType]:
        user_id = tracker.get_slot("user_id")
        store_id = tracker.get_slot("store_id")  # Get store filter


        # Require login
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You need to log in before viewing your cart.")
            return [FollowupAction("action_prompt_login")]

        # Check if a coupon is applied and include it in cart request
        applied_coupon_id = tracker.get_slot("applied_coupon_id") or ""
        payload = {"user_id": user_id, "coupon_id": applied_coupon_id}

        # Add store filter if available (multi-tenant support)
        if store_id:
            payload["shipper_id"] = str(store_id)

        print(f"[CART VIEW] Fetching cart with coupon_id: {applied_coupon_id}, shipper_id: {store_id}")
        
        # Detect channel
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        try:
            url = "https://stageshipperapi.thedelivio.com/api/cart-list"
            response = requests.post(url, json=payload, timeout=10)
            
            print(f"[CART API] Status Code: {response.status_code}")
            print(f"[CART API] Raw Response: {response.text[:500]}")
            
            data = response.json()
            print(f"[CART API] Parsed JSON Status: {data.get('status')}")
            print(f"[CART API] API Code: {data.get('code')}")
            
            if response.status_code != 200:
                print(f"[CART API] HTTP Error: Status code {response.status_code}")
                dispatcher.utter_message(text="Sorry, I couldn't retrieve your cart details right now.")
                return []
            
            # Check for EMPTY CART using API code 402
            api_code = data.get("code")
            api_status = data.get("status")
            
            if api_code == 402 or (api_status == 0 and "Lonely" in data.get("message", "").lower()):
                print(f"[CART API] ✅ EMPTY CART DETECTED - Code: {api_code}, Status: {api_status}")

                if is_whatsapp:
                    # Use WhatsApp interactive buttons
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "🛒 Your cart is empty! Let's find something great.\n\nWhat would you like to do?",
                            "buttons": [
                                {"id": "browse_products", "title": "🛍️ Browse Products"},
                                {"id": "my_orders", "title": "📦 My Orders"}
                            ]
                        }
                    )
                else:
                    dispatcher.utter_message(
                        text="🛒 **Your cart is empty!** Let's find something great.",
                        buttons=[
                            {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                            {"title": "📦 My Orders", "payload": "/track_my_orders"}
                        ]
                    )
                return []

            if api_status != 1:
                print(f"[CART API] API Error: Status field is {api_status}, Code: {api_code}")
                dispatcher.utter_message(text="Sorry, I couldn't retrieve your cart details right now.")
                return []

            cart_data = data.get("data")
            if not isinstance(cart_data, dict):
                print(f"[CART API] Error: 'data' is not a dict")
                dispatcher.utter_message(text="Sorry, I couldn't retrieve your cart details right now.")
                return []
            
            cartlist = cart_data.get("cartlist", [])
            print(f"[CART API] Cart List Length: {len(cartlist)}")

            if not cartlist or len(cartlist) == 0:
                print(f"[CART API] ✅ EMPTY CART - Empty cartlist")

                if is_whatsapp:
                    # Use WhatsApp interactive buttons
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "🛒 Your cart is empty! Let's find something great.\n\nWhat would you like to do?",
                            "buttons": [
                                {"id": "browse_products", "title": "🛍️ Browse Products"},
                                {"id": "my_orders", "title": "📦 My Orders"}
                            ]
                        }
                    )
                else:
                    dispatcher.utter_message(
                        text="🛒 **Your cart is empty!** Let's find something great.",
                        buttons=[
                            {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                            {"title": "📦 My Orders", "payload": "/track_my_orders"}
                        ]
                    )
                return []

            # 🛍️ CART HAS ITEMS - Show details with remove options
            print(f"[CART API] ✅ CART HAS {len(cartlist)} ITEMS")
            
            order_meta = cart_data.get("orderMetaData", {})
            
            # Build product list with item numbers - show clear pricing
            product_lines = []
            for idx, item in enumerate(cartlist, start=1):
                title = item.get("title", "Unnamed Product")
                qty = item.get("quantity", 1)

                # Get pricing info
                try:
                    original_price = float(item.get("product_price", 0) or item.get("price", 0) or 0)
                    discounted_price = float(item.get("discounted_price", 0) or 0)
                    discount_percent = float(item.get("discount", 0) or 0)
                except (ValueError, TypeError):
                    original_price = 0
                    discounted_price = 0
                    discount_percent = 0

                # Format price display - show original, discount %, and final price clearly
                if discount_percent > 0 and original_price > discounted_price > 0:
                    # Show: ~$999.00~ 99% OFF → $9.99
                    price_display = f"~${original_price:.2f}~ {discount_percent:.0f}% OFF → *${discounted_price:.2f}*"
                elif discounted_price > 0:
                    price_display = f"${discounted_price:.2f}"
                elif original_price > 0:
                    price_display = f"${original_price:.2f}"
                else:
                    price_display = "Price N/A"

                line = f"{idx}. {title}\n   Qty: {qty} | {price_display}"
                product_lines.append(line)

            # Payment summary - show clear breakdown
            payment_lines = []
            if order_meta:
                sub_total = float(order_meta.get("sub_total_amount", 0) or 0)
                discount = float(order_meta.get("discount_amount", 0) or 0)
                discounted_price = float(order_meta.get("discounted_price", 0) or 0)
                coupon_discount = float(order_meta.get("coupon_discount", 0) or 0)
                tax = float(order_meta.get("tax", 0) or 0)
                delivery = float(order_meta.get("total_delivery_charge", 0) or order_meta.get("delivery_fee", 0) or 0)
                platform_fee = float(order_meta.get("Platform_Fee", 0) or order_meta.get("platform_fee", 0) or 0)
                total = float(order_meta.get("total", 0) or 0)

                # Show original subtotal only if there are discounts
                if discount > 0:
                    payment_lines.append(f"~Subtotal: ${sub_total:.2f}~")  # Strikethrough
                    payment_lines.append(f"Discount: -${discount:.2f}")
                    payment_lines.append(f"*Subtotal: ${discounted_price:.2f}*")
                else:
                    payment_lines.append(f"Subtotal: ${sub_total:.2f}")

                if coupon_discount > 0:
                    payment_lines.append(f"Coupon: -${coupon_discount:.2f}")
                if tax > 0:
                    payment_lines.append(f"Tax: ${tax:.2f}")
                if delivery > 0:
                    payment_lines.append(f"Delivery: ${delivery:.2f}")
                if platform_fee > 0:
                    payment_lines.append(f"Platform Fee: ${platform_fee:.2f}")
                if total > 0:
                    payment_lines.append(f"\n*Total: ${total:.2f}*")

            cart_info = "\n".join(product_lines)
            payment_info = "\n".join(payment_lines)

            out_msg = f"🛒 **Your Cart** ({len(cartlist)} items):\n\n{cart_info}"
            if payment_info:
                out_msg += f"\n\n{payment_info}"
            
            # Show appropriate buttons based on channel
            if is_whatsapp:
                # Check if coupon is applied - use data from API response
                applied_coupon = tracker.get_slot("applied_coupon_code")
                coupon_msg = ""
                if applied_coupon:
                    # Get coupon discount from API response (orderMetaData.coupon_discount)
                    coupon_discount = float(order_meta.get("coupon_discount", 0)) if order_meta else 0
                    if coupon_discount > 0:
                        coupon_msg = f"\n\n🎟️ Coupon *{applied_coupon}* applied (-${coupon_discount:.2f})"
                    else:
                        # Fallback to slot value
                        discount_amount = tracker.get_slot("coupon_discount_amount") or 0
                        if discount_amount > 0:
                            coupon_msg = f"\n\n🎟️ Coupon *{applied_coupon}* applied (-${discount_amount:.2f})"

                dispatcher.utter_message(text=out_msg + coupon_msg)

                # WhatsApp list message with more options
                dispatcher.utter_message(
                    json_message={
                        "type": "list",
                        "text": "What would you like to do?",
                        "button_text": "Cart Options",
                        "sections": [
                            {
                                "title": "Checkout",
                                "rows": [
                                    {"id": "checkout", "title": "💳 Checkout", "description": "Proceed to payment"},
                                    {"id": "view_coupons", "title": "🎟️ Apply Promo Code", "description": "View available discounts"}
                                ]
                            },
                            {
                                "title": "More Options",
                                "rows": [
                                    {"id": "browse_products", "title": "🛍️ Continue Shopping", "description": "Add more items"},
                                    {"id": "clear_cart", "title": "🗑️ Clear Cart", "description": "Remove all items"}
                                ]
                            }
                        ]
                    }
                )
            else:
                dispatcher.utter_message(text=out_msg)
                
                # Add individual remove buttons for each item
                remove_buttons = []
                for idx in range(min(len(cartlist), 3)):  # Show 3 remove buttons
                    remove_buttons.append({
                        "title": f"❌ Remove Item {idx+1}",
                        "payload": f"remove {idx+1}"
                    })
                
                dispatcher.utter_message(
                    text="**Quick Actions:**",
                    buttons=remove_buttons + [
                        {"title": "🔄 Update Quantities", "payload": "/update_cart_quantity"},  # NEW
                        {"title": "📍 View Address", "payload": "/get_address"},
                        {"title": "🛍️ Continue Shopping", "payload": "/show_categories"},
                        {"title": "💾 Save Cart", "payload": "/save_cart_for_later"},  # NEW
                        {"title": "🗑️ Clear Cart", "payload": "/clear_cart"}
                    ]
                )
            
            return [SlotSet("recent_cart_items", json.dumps(cartlist))]
            
        except Exception as e:
            print(f"[EXCEPTION] in ActionViewCart: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Sorry, an error occurred while fetching your cart.")
            return []


class ActionCheckout(Action):
    """
    Main checkout action - delegates to appropriate step based on checkout state.
    Flow: Check login -> Check address -> Create Stripe payment
    """

    def name(self) -> Text:
        return "action_checkout"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        user_id = tracker.get_slot("user_id")

        # Step 1: Check if user is logged in
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You need to log in to proceed to checkout.")
            return [FollowupAction("action_prompt_login")]

        # Step 2: Check checkout step / address status
        checkout_step = tracker.get_slot("checkout_step")
        delivery_address_id = tracker.get_slot("delivery_address_id")

        print(f"[CHECKOUT] user_id: {user_id}, checkout_step: {checkout_step}, address_id: {delivery_address_id}")

        # If address is already confirmed, proceed to payment
        if checkout_step == "confirm_address" and delivery_address_id:
            print("[CHECKOUT] Address confirmed, proceeding to payment")
            return [FollowupAction("action_create_stripe_checkout")]

        # Otherwise, need to get/confirm address first
        print("[CHECKOUT] Need to confirm address first")
        return [FollowupAction("action_get_address")]


class ActionCustomFallback(Action):
    def name(self) -> Text:
        return "action_custom_fallback"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        # If we are currently in the middle of a login flow, delegate the message
        # to the login handler instead of treating it as a fallback.
        if tracker.get_slot("login_step"):
            try:
                login_action = ActionLoginUser()
                return login_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] delegating to login: {e}")
                return [FollowupAction("action_login_user")]

        # Check if we're awaiting typed address - delegate to address processor
        checkout_step = tracker.get_slot("checkout_step")
        if checkout_step == "awaiting_typed_address":
            print(f"[FALLBACK] Detected awaiting_typed_address, delegating to action_process_typed_address")
            try:
                typed_address_action = ActionProcessTypedAddress()
                return typed_address_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] delegating to typed address: {e}")
                return [FollowupAction("action_process_typed_address")]

        # Grab the raw text of the user's latest message
        user_text = (tracker.latest_message.get("text") or "").strip()
        # If it's a 5-digit number and no ZIP code has been set yet, treat it as
        # a zip code input and jump directly to the nearest store search.
        if re.fullmatch(r"\d{5}", user_text) and not tracker.get_slot("zipcode"):
            return [
                SlotSet("zipcode", user_text),
                SlotSet("stores_list", None),
                SlotSet("selected_store", None),
                FollowupAction("action_get_nearest_store"),
            ]
        # Otherwise, respond with the default fallback message
        dispatcher.utter_message(text="Sorry, I didn't understand that. Could you rephrase?")
        return []


class ActionPromptLogin(Action):
    def name(self) -> Text:
        return "action_prompt_login"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        dispatcher.utter_message(text="You need to log in to continue. If you already have an account, please choose 'Login' and we'll ask for your phone and password. If you're new, choose 'Register' to sign up on our website.",
                                 buttons=[
                                     {"title": "Login", "payload": "login"},
                                     {"title": "Register", "payload": "register"}
                                 ])
        return []

 
class ActionLoginUser(Action):
    """Enhanced login with pre-selected product handling"""
    
    def name(self) -> Text:
        return "action_login_user"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        events: List[EventType] = []

        login_step = tracker.get_slot("login_step") or ""
        login_phone = tracker.get_slot("login_phone") or ""
        login_password = tracker.get_slot("login_password") or ""
        last_message = (tracker.latest_message.get("text") or "").strip()

        def ask_phone() -> List[EventType]:
            dispatcher.utter_message(text="Please enter your phone number:")
            return [SlotSet("login_step", "awaiting_phone"), SlotSet("login_password", None)]

        def ask_password() -> List[EventType]:
            dispatcher.utter_message(text="Thanks. Now enter your password:")
            return [SlotSet("login_step", "awaiting_password")]

        # Entry point
        if not login_step:
            return ask_phone()

        # Collect phone
        if login_step == "awaiting_phone":
            if len(re.sub(r"\D", "", last_message)) >= 6 or len(last_message) >= 6:
                events += [SlotSet("login_phone", last_message)]
                return events + ask_password()
            dispatcher.utter_message(
                text="That doesn't look like a phone number. Please re-enter your phone number."
            )
            return [SlotSet("login_step", "awaiting_phone")]

        # Collect password and authenticate
        if login_step == "awaiting_password":
            password = login_password
            phone = login_phone

            if not password:
                dispatcher.utter_message(text="It seems you haven't provided a password. Please enter your password:")
                return [SlotSet("login_step", "awaiting_password")]

            try:
                payload = {
                    "phone": phone,
                    "password": password,
                    "iosDeviceToken": "",
                    "androidDeviceToken": "",
                }
                resp = requests.post(
                    f"{API_BASE}/customer-phone-login", json=payload, timeout=15
                )
                data = resp.json()

                status = data.get("status", 0)
                user_id = (
                    data.get("user_id")
                    or data.get("userid")
                    or data.get("data", {}).get("user_id")
                )

                if status == 1 and user_id:
                    # ✅ LOGIN SUCCESS
                    dispatcher.utter_message(text="Login successful! 🎉")
                    
                    # 🎯 CHECK IF USER HAD A SELECTED PRODUCT BEFORE LOGIN
                    selected_product = tracker.get_slot("selected_product")
                    stored_zipcode = tracker.get_slot("zipcode")
                    
                    # Detect channel
                    input_channel = tracker.get_latest_input_channel()
                    is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
                    
                    # 🛒 IF PRODUCT WAS SELECTED BEFORE LOGIN
                    if selected_product:
                        try:
                            product = json.loads(selected_product)
                            product_name = product.get("title", "Selected Product")
                            
                            if is_whatsapp:
                                # WhatsApp interactive buttons (max 3)
                                dispatcher.utter_message(
                                    text=f"🛍️ You were viewing: *{product_name}*\n\nWhat would you like to do?",
                                    json_message={
                                        "type": "buttons",
                                        "text": f"🛍️ You were viewing: *{product_name}*\n\nWhat would you like to do?",
                                        "buttons": [
                                            {"id": "add_to_cart", "title": "➕ Add to Cart"},
                                            {"id": "view_cart", "title": "🛒 View Cart"},
                                            {"id": "browse_products", "title": "🛍️ Browse More"}
                                        ]
                                    }
                                )
                            else:
                                dispatcher.utter_message(
                                    text=f"You were viewing: **{product_name}**\n\nWhat would you like to do?",
                                    buttons=[
                                        {"title": "➕ Add to Cart", "payload": "/add_to_cart"},
                                        {"title": "🛒 View Cart", "payload": "/view_cart"},
                                        {"title": "🛍️ Browse More", "payload": "/show_categories"},
                                        {"title": "📍 Find Stores", "payload": "find stores"}
                                    ]
                                )
                        except Exception as e:
                            print(f"[WARN] Could not parse selected product: {e}")
                            # Fallback to standard post-login menu
                            selected_product = None
                    
                    # 📍 STANDARD POST-LOGIN MENU (no pre-selected product)
                    if not selected_product:
                        if stored_zipcode:
                            if is_whatsapp:
                                # WhatsApp: Use ONLY json_message to avoid duplicates
                                dispatcher.utter_message(
                                    json_message={
                                        "type": "buttons",
                                        "text": "Welcome back! What would you like to do?",
                                        "buttons": [
                                            {"id": "view_cart", "title": "🛒 View Cart"},
                                            {"id": "browse_products", "title": "🛍️ Browse Products"},
                                            {"id": "my_orders", "title": "📦 My Orders"}
                                        ]
                                    }
                                )
                            else:
                                dispatcher.utter_message(
                                    text=f"Welcome back! What would you like to do?",
                                    buttons=[
                                        {"title": "🛒 View Cart", "payload": "/view_cart"},
                                        {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                        {"title": "📍 Find Stores", "payload": "find stores near me"},
                                        {"title": "📦 My Orders", "payload": "/track_my_orders"}
                                    ]
                                )
                        else:
                            if is_whatsapp:
                                # WhatsApp: Use ONLY json_message to avoid duplicates
                                dispatcher.utter_message(
                                    json_message={
                                        "type": "buttons",
                                        "text": "Great! Let's get started. What would you like to do?",
                                        "buttons": [
                                            {"id": "browse_products", "title": "🛍️ Browse Products"},
                                            {"id": "view_cart", "title": "🛒 View Cart"},
                                            {"id": "find_stores", "title": "📍 Find Stores"}
                                        ]
                                    }
                                )
                            else:
                                dispatcher.utter_message(
                                    text="Great! Let's get started. What would you like to do?",
                                    buttons=[
                                        {"title": "📍 Find Stores", "payload": "find stores near me"},
                                        {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                        {"title": "🛒 View Cart", "payload": "/view_cart"}
                                    ]
                                )
                    
                    # Store user_id and clear transient login slots
                    events += [SlotSet("user_id", str(user_id))]
                    events += [
                        SlotSet("login_step", None), 
                        SlotSet("login_phone", None), 
                        SlotSet("login_password", None)
                    ]
                    return events

                # ❌ LOGIN FAILURE
                msg = data.get("message") or "Login failed. Please check your phone and password."
                dispatcher.utter_message(text=msg)
                dispatcher.utter_message(text="Please try entering your password again.")
                return [SlotSet("login_step", "awaiting_password"), SlotSet("login_password", None)]

            except Exception as e:
                print(f"[EXCEPTION] in ActionLoginUser: {e}")
                dispatcher.utter_message(
                    text="Sorry, there was a problem contacting the login service. Please try again."
                )
                return [SlotSet("login_step", "awaiting_password"), SlotSet("login_password", None)]

        # Default fallback
        return ask_phone()


class ActionCustomGreet(Action):
    """Modified to show store-branded greeting for dedicated bots"""
    
    def name(self) -> Text:
        return "action_custom_greet"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        try:
            print("[DEBUG] ActionCustomGreet triggered")
            
            # If login in progress, continue login flow
            if tracker.get_slot("login_step"):
                try:
                    print("[DEBUG] Login step active, delegating to login")
                    login_action = ActionLoginUser()
                    return login_action.run(dispatcher, tracker, domain)
                except Exception as e:
                    print(f"[EXCEPTION] delegating to login: {e}")
                    dispatcher.utter_message(text="Hello! How can I help you today?")
                    return []

            # Check user status
            user_id = tracker.get_slot("user_id")
            is_logged_in = user_id and isinstance(user_id, str) and user_id.isdigit()
            
            # Check if already greeted
            has_been_greeted = tracker.get_slot("has_been_greeted")
            
            # Detect channel
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
            
            # ⭐ NEW: Check if this is a store-specific bot
            is_dedicated_bot = tracker.get_slot("is_dedicated_bot")
            store_name = tracker.get_slot("store_name")
            store_id = tracker.get_slot("store_id")

            print(f"🔍 DEBUG [GREETING]: is_dedicated_bot = {is_dedicated_bot}")
            print(f"🔍 DEBUG [GREETING]: store_name = '{store_name}'")
            print(f"🔍 DEBUG [GREETING]: store_id = '{store_id}'")
            print(f"🔍 DEBUG [GREETING]: input_channel = '{input_channel}'")
            print(f"🔍 DEBUG [GREETING]: is_whatsapp = {is_whatsapp}")
            
            # ✅ ALWAYS SHOW STORE GREETING FOR DEDICATED BOTS
            if is_dedicated_bot and store_name:
                print(f"[GREETING] Store-specific bot: {store_name}")

                if is_whatsapp:
                    # WhatsApp: Use list message for logged-in users (more options)
                    if is_logged_in:
                        dispatcher.utter_message(
                            json_message={
                                "type": "list",
                                "text": f"👋 Welcome to {store_name}!\n\nI'm your personal shopping assistant. What would you like to do?",
                                "button_text": "Menu Options",
                                "sections": [
                                    {
                                        "title": "Shopping",
                                        "rows": [
                                            {"id": "browse_products", "title": "🛍️ Browse Products", "description": "View our catalog"},
                                            {"id": "search_products", "title": "🔍 Search", "description": "Find specific items"},
                                            {"id": "view_wishlist", "title": "❤️ My Favorites", "description": "Saved items for quick reorder"}
                                        ]
                                    },
                                    {
                                        "title": "My Account",
                                        "rows": [
                                            {"id": "view_cart", "title": "🛒 View Cart", "description": "See items in your cart"},
                                            {"id": "my_orders", "title": "📦 My Orders", "description": "Track your orders"}
                                        ]
                                    }
                                ]
                            }
                        )
                    else:
                        # Not logged in - just show Browse Products (login happens automatically via WhatsApp)
                        dispatcher.utter_message(
                            json_message={
                                "type": "buttons",
                                "text": f"👋 Welcome to {store_name}!\n\nShop our products with ease.",
                                "buttons": [
                                    {"id": "browse_products", "title": "🛍️ View Products"}
                                ]
                            }
                        )
                else:
                    if is_logged_in:
                        dispatcher.utter_message(
                            text=f"👋 **Welcome to {store_name}!**\n\n"
                                 f"I'm your personal shopping assistant. What would you like to do?",
                            buttons=[
                                {"title": "🛍️ Browse Our Products", "payload": "/browse_store_products"},
                                {"title": "🛒 View Cart", "payload": "/view_cart"},
                                {"title": "📦 My Orders", "payload": "/track_my_orders"},
                                {"title": "🚪 Logout", "payload": "/logout"}
                            ]
                        )
                    else:
                        # Not logged in - just show Browse Products (login happens automatically)
                        dispatcher.utter_message(
                            text=f"👋 **Welcome to {store_name}!**\n\n"
                                 f"Shop our products with ease. What would you like to do?",
                            buttons=[
                                {"title": "🛍️ Browse Our Products", "payload": "/browse_store_products"}
                            ]
                        )
                
                return [SlotSet("has_been_greeted", True)]
            
            # ✅ MARKETPLACE BOT - SHOW FIRST-TIME GREETING
            elif not has_been_greeted:
                print("[GREETING] Marketplace bot - first time")

                if is_whatsapp:
                    if is_logged_in:
                        # Use list message for more options
                        dispatcher.utter_message(
                            json_message={
                                "type": "list",
                                "text": "👋 Welcome back! I'm your AnythingInstantly Shop Bot.\n\nWhat would you like to do?",
                                "button_text": "Menu Options",
                                "sections": [
                                    {
                                        "title": "Shopping",
                                        "rows": [
                                            {"id": "browse_products", "title": "🛍️ Browse Products", "description": "View categories & products"},
                                            {"id": "find_stores", "title": "📍 Find Stores", "description": "Stores near you"},
                                            {"id": "view_wishlist", "title": "❤️ My Favorites", "description": "Quick reorder saved items"}
                                        ]
                                    },
                                    {
                                        "title": "My Account",
                                        "rows": [
                                            {"id": "view_cart", "title": "🛒 View Cart", "description": "Items in your cart"},
                                            {"id": "my_orders", "title": "📦 My Orders", "description": "Track your orders"}
                                        ]
                                    }
                                ]
                            }
                        )
                    else:
                        dispatcher.utter_message(
                            json_message={
                                "type": "buttons",
                                "text": "👋 Hi! Welcome to AnythingInstantly!\n\nI can help you shop from local stores.",
                                "buttons": [
                                    {"id": "browse_products", "title": "🛍️ Browse Products"},
                                    {"id": "find_stores", "title": "📍 Find Stores"},
                                    {"id": "login", "title": "🔐 Login"}
                                ]
                            }
                        )
                else:
                    if is_logged_in:
                        dispatcher.utter_message(
                            text="👋 **Welcome back!** I'm your AnythingInstantly Shop Bot.\n\n"
                                 "What would you like to do today?",
                            buttons=[
                                {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                {"title": "🏪 Find Stores", "payload": "find stores near me"},
                                {"title": "🛒 View Cart", "payload": "/view_cart"},
                                {"title": "📦 My Orders", "payload": "/track_my_orders"},
                                {"title": "🚪 Logout", "payload": "/logout"}
                            ]
                        )
                    else:
                        dispatcher.utter_message(
                            text="👋 **Hi! Welcome to AnythingInstantly!**\n\n"
                                 "I can help you shop from local stores. What would you like to do?",
                            buttons=[
                                {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                {"title": "🏪 Find Stores", "payload": "find stores near me"},
                                {"title": "🔐 Login", "payload": "/login"}
                            ]
                        )
                
                return [SlotSet("has_been_greeted", True)]
            
            # ✅ RETURNING USER - SHORT GREETING
            else:
                print("[GREETING] Returning user")
                if is_whatsapp:
                    if is_logged_in:
                        dispatcher.utter_message(
                            text="Hello again! 👋\n\n"
                                 "Reply: *1* Browse | *2* Cart | *3* Orders"
                        )
                    else:
                        dispatcher.utter_message(
                            text="Hello again! 👋\n\n"
                                 "Reply: *1* Browse | *2* Stores | *3* Login"
                        )
                else:
                    if is_logged_in:
                        dispatcher.utter_message(
                            text="Hello again! What would you like to do?",
                            buttons=[
                                {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                {"title": "🏪 Find Stores", "payload": "find stores near me"},
                                {"title": "🛒 View Cart", "payload": "/view_cart"},
                                {"title": "📦 My Orders", "payload": "/track_my_orders"}
                            ]
                        )
                    else:
                        dispatcher.utter_message(
                            text="Hello again! What would you like to do?",
                            buttons=[
                                {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                {"title": "🏪 Find Stores", "payload": "find stores near me"},
                                {"title": "🔐 Login", "payload": "/login"}
                            ]
                        )
                
                return []
        
        except Exception as e:
            print(f"[CRITICAL EXCEPTION] in ActionCustomGreet: {e}")
            import traceback
            traceback.print_exc()
            
            # Emergency fallback
            dispatcher.utter_message(
                text="Hi! How can I help you today?",
                buttons=[
                    {"title": "Browse Products", "payload": "/show_categories"},
                    {"title": "Find Stores", "payload": "find stores"}
                ]
            )
            return []


class ActionTrackOrder(Action):
    """
    Track order - shows recent orders for logged-in user
    If order_id entity is provided, tracks that specific order
    If last_created_order_id slot is set (just after payment), shows only that order
    """
    def name(self) -> Text:
        return "action_track_order"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        user_id = tracker.get_slot("user_id")

        print(f"[TRACK ORDER] Starting... user_id={user_id}")

        # Check if user is logged in
        if not user_id:
            dispatcher.utter_message(text="Please login to track your orders.")
            return [FollowupAction("action_prompt_login")]

        # Check for specific order ID in entity
        order_id = next(tracker.get_latest_entity_values("order_id"), None)

        # Check if we just completed payment - show only that order
        last_created_order_id = tracker.get_slot("last_created_order_id")
        if last_created_order_id and not order_id:
            order_id = last_created_order_id
            print(f"[TRACK ORDER] Using last_created_order_id: {order_id}")

        # Detect channel
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        try:
            # Fetch user's recent orders
            request_payload = {
                "customer_id": str(user_id),
                "order_id": "",
                "search_string": "",
                "status_type": "",
                "page": "1",
                "items": "5",
                "id": str(order_id) if order_id else ""
            }

            print(f"[TRACK ORDER] Request payload: {request_payload}")

            orders_response = requests.post(
                "https://stageshipperapi.thedelivio.com/api/order-lists",
                json=request_payload,
                timeout=10
            )

            print(f"[TRACK ORDER] API response status: {orders_response.status_code}")

            if orders_response.status_code == 200:
                data = orders_response.json()
                print(f"[TRACK ORDER] API status: {data.get('status')}, message: {data.get('message')}")

                # API returns data as array directly
                if data.get("status") == 1:
                    orders = data.get("data", [])

                    print(f"[TRACK ORDER] Found {len(orders) if orders else 0} orders")

                    if not orders or len(orders) == 0:
                        if is_whatsapp:
                            dispatcher.utter_message(
                                json_message={
                                    "type": "buttons",
                                    "text": "📦 You don't have any orders yet.\n\nStart shopping now!",
                                    "buttons": [
                                        {"id": "browse_products", "title": "🛍️ Browse Products"}
                                    ]
                                }
                            )
                        else:
                            dispatcher.utter_message(text="You don't have any orders yet. Start shopping! 🛍️")
                        return []

                    # Build order summary message
                    msg_lines = ["📦 *Your Recent Orders*\n"]

                    for order in orders[:5]:
                        # Use correct field names from API
                        oid = order.get("id", "N/A")
                        store_name = order.get("shipper_company_name", order.get("shipper_name", ""))
                        status = order.get("order_status", "Processing")
                        total = order.get("total_amount", order.get("discounted_amount_after_coupon", "0"))
                        order_date = order.get("order_date", "")

                        # Format date (order_date is "2025-12-06 12:34:36")
                        date_display = order_date[:10] if order_date else ""

                        # Status emoji
                        status_emoji = "🟡"  # Default - Order Placed
                        status_lower = str(status).lower() if status else ""
                        if "deliver" in status_lower:
                            status_emoji = "✅"
                        elif "cancel" in status_lower:
                            status_emoji = "❌"
                        elif "ship" in status_lower or "transit" in status_lower or "on the way" in status_lower:
                            status_emoji = "🚚"
                        elif "picked" in status_lower:
                            status_emoji = "📦"
                        elif "accept" in status_lower or "confirmed" in status_lower:
                            status_emoji = "👍"
                        elif "placed" in status_lower or "pending" in status_lower:
                            status_emoji = "⏳"

                        msg_lines.append(f"{status_emoji} *Order #{oid}*")
                        if store_name:
                            msg_lines.append(f"   🏪 {store_name[:30]}")
                        msg_lines.append(f"   📋 {status}")
                        try:
                            msg_lines.append(f"   💰 ${float(total):.2f}")
                        except:
                            msg_lines.append(f"   💰 ${total}")
                        if date_display:
                            msg_lines.append(f"   📅 {date_display}")
                        msg_lines.append("")

                    msg_text = "\n".join(msg_lines)

                    if is_whatsapp:
                        dispatcher.utter_message(
                            json_message={
                                "type": "buttons",
                                "text": msg_text,
                                "buttons": [
                                    {"id": "continue_shopping", "title": "🛍️ Shop More"},
                                    {"id": "view_cart", "title": "🛒 View Cart"}
                                ]
                            }
                        )
                    else:
                        dispatcher.utter_message(text=msg_text)
                else:
                    print(f"[TRACK ORDER] API returned status != 1")
                    dispatcher.utter_message(text="Couldn't fetch your orders. Please try again later.")
            else:
                print(f"[TRACK ORDER] HTTP error: {orders_response.status_code}")
                dispatcher.utter_message(text="Couldn't connect to orders. Please try again later.")

        except Exception as e:
            print(f"[TRACK ORDER] Exception: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="An error occurred while fetching your orders. Please try again.")

        # Clear the last_created_order_id slot after showing it
        return [SlotSet("last_created_order_id", None)]


class ActionGetAddress(Action):

    def name(self) -> Text:
        return "action_get_address"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        user_id = tracker.get_slot("user_id")
        # Require login: if user_id missing or invalid, prompt login
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You need to log in to view your address. Please type 'login' to log in.")
            return [FollowupAction("action_prompt_login")]

        # Check channel for WhatsApp (needed for prompts)
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        # ✅ FIRST: Check if we already have address info in slot (from native order flow)
        delivery_address = tracker.get_slot("delivery_address")
        delivery_address_id = tracker.get_slot("delivery_address_id")

        if delivery_address and delivery_address_id:
            print(f"[ADDRESS FETCH] Using existing address from slot: {delivery_address_id}")
            try:
                # Parse the stored address JSON
                if isinstance(delivery_address, str):
                    addr = json.loads(delivery_address)
                else:
                    addr = delivery_address

                # Display the address
                title = addr.get("address_name", "Home")
                name = addr.get("name", "")
                line1 = addr.get("full_address") or addr.get("address", "")
                city = addr.get("city", "")
                state = addr.get("state", "")
                zipc = addr.get("zip", "")
                country = addr.get("country_name", "")

                address_msg = f"🏠 *{title}*\n{name}\n{line1}"
                if city or state or zipc:
                    address_msg += f"\n{city}, {state} {zipc}"
                if country:
                    address_msg += f"\n{country}"

                dispatcher.utter_message(text=address_msg)

                if is_whatsapp:
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "Would you like to proceed with this address?",
                            "buttons": [
                                {"id": "pay_now", "title": "💳 Pay Now"},
                                {"id": "change_address", "title": "📍 Different Address"}
                            ]
                        }
                    )
                else:
                    dispatcher.utter_message(
                        text="Would you like to proceed with this address?",
                        buttons=[{"title": "Pay Now", "payload": "Pay Now"}]
                    )

                return [SlotSet("checkout_step", "confirm_address")]

            except Exception as e:
                print(f"[ADDRESS FETCH] Error parsing stored address: {e}")
                # Fall through to API call

        # Get store_id from slot for shipper_id
        store_id = tracker.get_slot("store_id") or ""
        # Get delivery_address_id from slot if available (from native order flow)
        address_id = tracker.get_slot("delivery_address_id") or ""

        payload = {
            "user_id": user_id,
            "shipper_id": store_id,
            "address_id": address_id,
        }
        print(f"[ADDRESS FETCH] Request: {payload}")

        try:
            url = "https://stageshipperapi.thedelivio.com/api/getAddress"
            response = requests.post(url, json=payload, timeout=8)
            resp_json = response.json()
            print(f"[API RESPONSE] {resp_json}")

            print(f"[ADDRESS FETCH] Response status: {response.status_code}")
            print(f"[ADDRESS FETCH] Response data: {resp_json}")

            # Check channel for WhatsApp (needed for prompts)
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

            if (
                response.status_code != 200
                or resp_json.get("status") != 1
                or not resp_json.get("data")
            ):
                print(f"[ADDRESS FETCH] API error or no data")
                # Instead of just error, prompt user to add address
                if is_whatsapp:
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "No saved delivery address found. Please share your delivery location:",
                            "buttons": [
                                {"id": "share_location", "title": "📍 Share Location"},
                                {"id": "type_address", "title": "✏️ Type Address"}
                            ]
                        }
                    )
                    return [SlotSet("checkout_step", "awaiting_address")]
                else:
                    dispatcher.utter_message(text="No saved delivery address found. Please add your address first.")
                return []

            data = resp_json.get("data", {})
            address_list = data.get("addressList")
            if not address_list or not isinstance(address_list, list) or len(address_list) == 0:
                print(f"[ADDRESS FETCH] No addresses in list")
                # Prompt user to add address
                if is_whatsapp:
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "No saved delivery address found. Please share your delivery location:",
                            "buttons": [
                                {"id": "share_location", "title": "📍 Share Location"},
                                {"id": "type_address", "title": "✏️ Type Address"}
                            ]
                        }
                    )
                    return [SlotSet("checkout_step", "awaiting_address")]
                else:
                    dispatcher.utter_message(text="No saved delivery address found. Please add your address first.")
                return []

            address = address_list[0]  # pick first (or loop if you want to display all)

            # Extract address fields
            address_id = address.get("id") or address.get("address_id")
            title = address.get("address_name", "Home")
            name = address.get("name", "")
            line1 = address.get("address", "")
            line2 = address.get("address2", "")
            city = address.get("city", "")
            state = address.get("state", "")
            zipc = address.get("zip", "")
            country = address.get("country_name", "")
            phone = address.get("phone", "")
            email = address.get("email", "")

            print(f"[ADDRESS FETCH] Found address ID: {address_id}, title: {title}")

            address_msg = (
                f"🏠 **{title}**\n\n"
                f"{name}\n"
                f"{line1}" + (f"\n{line2}" if line2 else "") + "\n"
                f"{city}, {state}, {zipc}\n"
                f"{country}\n\n"
                f"📞 {phone}"
            )
            dispatcher.utter_message(text=address_msg)

            # is_whatsapp already defined above

            if is_whatsapp:
                # WhatsApp interactive buttons
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "Would you like to proceed with this address?",
                        "buttons": [
                            {"id": "pay_now", "title": "💳 Pay Now"},
                            {"id": "change_address", "title": "📍 Different Address"}
                        ]
                    }
                )
            else:
                # Web widget buttons
                dispatcher.utter_message(
                    text="Would you like to proceed with this address?",
                    buttons=[{"title": "Pay Now", "payload": "Pay Now"}]
                )

            # Store address info in slots for later use in checkout
            return [
                SlotSet("delivery_address_id", str(address_id) if address_id else ""),
                SlotSet("delivery_address", json.dumps(address)),
                SlotSet("checkout_step", "confirm_address")
            ]

        except Exception as e:
            print(f"[EXCEPTION] in ActionGetAddress: {e}")
            import traceback
            traceback.print_exc()
            # Prompt to add address on error
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
            if is_whatsapp:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "Sorry, couldn't fetch address. Please share your delivery location:",
                        "buttons": [
                            {"id": "share_location", "title": "📍 Share Location"},
                            {"id": "type_address", "title": "✏️ Type Address"}
                        ]
                    }
                )
                return [SlotSet("checkout_step", "awaiting_address")]
            else:
                dispatcher.utter_message(text="Sorry, an error occurred while retrieving your address.")
        return []


class ActionCreateStripeCheckout(Action):
    def name(self) -> Text:
        return "action_create_stripe_checkout"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        
        user_id = tracker.get_slot("user_id")
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You must be logged in to proceed with payment.")
            return [FollowupAction("action_prompt_login")]
        
        # Get WhatsApp number
        sender_id = tracker.sender_id
        whatsapp_number = None
        
        if sender_id:
            if isinstance(sender_id, str) and sender_id.startswith("whatsapp:"):
                whatsapp_number = sender_id.replace("whatsapp:", "").strip()
            elif isinstance(sender_id, str) and (sender_id.startswith("+") or sender_id.isdigit()):
                whatsapp_number = sender_id.strip()
            elif isinstance(sender_id, str):
                cleaned = ''.join(c for c in sender_id if c.isdigit() or c == '+')
                if len(cleaned) >= 10:
                    whatsapp_number = cleaned
        
        print(f"[DEBUG] WhatsApp number: {whatsapp_number}")

        # Get applied coupon if any
        applied_coupon_id = tracker.get_slot("applied_coupon_id") or ""
        applied_coupon_code = tracker.get_slot("applied_coupon_code") or ""
        store_id = tracker.get_slot("store_id")  # Get store filter
        print(f"[STRIPE CHECKOUT] Applied coupon: {applied_coupon_code} (ID: {applied_coupon_id}), store_id: {store_id}")

        # Fetch Cart with coupon applied
        try:
            cart_payload = {"user_id": user_id, "coupon_id": applied_coupon_id}
            if store_id:
                cart_payload["shipper_id"] = str(store_id)

            cart_response = requests.post(
                f"{API_BASE}/cart-list",
                json=cart_payload,
                timeout=10
            )
            cart_data = cart_response.json()
            print(f"[STRIPE CHECKOUT] Cart response: {cart_data}")

            if cart_response.status_code != 200 or cart_data.get("status") != 1:
                dispatcher.utter_message(text="Sorry, I couldn't fetch your cart.")
                return []

            order_meta = cart_data.get("data", {}).get("orderMetaData", {})
            # Use discounted total if coupon applied, otherwise use regular total
            total_amount = float(order_meta.get("total", 0))
            coupon_discount = float(order_meta.get("coupon_discount", 0))

            print(f"[STRIPE CHECKOUT] Total: ${total_amount:.2f}, Coupon discount: ${coupon_discount:.2f}")
            
            if total_amount <= 0:
                dispatcher.utter_message(text="Your cart is empty.")
                return []
            
            # ✅ FORCE USD: Assume cart returns USD already
            # If cart returns INR, you need to convert here
            # Example: total_amount_usd = total_amount / 83  # INR to USD conversion
            
            if total_amount < 0.50:
                dispatcher.utter_message(text=f"⚠️ Cart total (${total_amount:.2f}) is below minimum $0.50.")
                return []
            
            amount_in_cents = int(total_amount * 100)
            
        except Exception as e:
            print(f"[EXCEPTION] Fetching cart: {e}")
            dispatcher.utter_message(text="Error fetching cart.")
            return []
        
        # Create Stripe Session - FORCE USD ONLY
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        
        try:
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
            
            # Get delivery address ID for order
            delivery_address_id = tracker.get_slot("delivery_address_id") or ""

            metadata = {
                "user_id": user_id,
                "channel": "whatsapp" if is_whatsapp else "website",
                "delivery_address_id": delivery_address_id,
                "store_id": tracker.get_slot("store_id") or "",  # ⭐ For backend to know which WhatsApp to notify
                "wh_account_id": tracker.get_slot("store_id") or "",  # ⭐ Same as store_id for clarity
                "store_name": tracker.get_slot("store_name") or ""
            }

            # Add coupon info to metadata if applied
            if applied_coupon_id:
                metadata["coupon_id"] = applied_coupon_id
                metadata["coupon_code"] = applied_coupon_code
                metadata["coupon_discount"] = str(coupon_discount)

            if whatsapp_number:
                metadata["whatsapp_number"] = whatsapp_number
                print(f"[DEBUG] ✅ Added WhatsApp to metadata: {whatsapp_number}")

            # Build description
            description = f"Order for User #{user_id}"
            if applied_coupon_code:
                description += f" (Coupon: {applied_coupon_code})"

            # ✅ CRITICAL FIX: Only specify USD, remove any other currency hints
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",  # ✅ ONLY USD
                        "product_data": {
                            "name": "AnythingInstantly Cart Payment",
                            "description": description
                        },
                        "unit_amount": amount_in_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                locale="en",  # Force English locale
                currency="usd",  # Force USD currency display
                metadata=metadata,
                success_url="https://stageshipperapi.thedelivio.com/api/bot-payment-status?session_id={CHECKOUT_SESSION_ID}&status=success",
                cancel_url="https://stageshipperapi.thedelivio.com/api/bot-payment-status?session_id={CHECKOUT_SESSION_ID}&status=cancel",
                payment_intent_data={
                    "capture_method": "automatic",
                },
            )
            
            payment_url = session.url

            print(f"[DEBUG] Stripe session created: {session.id}")
            print(f"[DEBUG] Currency: usd")
            print(f"[DEBUG] Amount: ${total_amount:.2f}")

            # Build payment text with coupon info
            if coupon_discount > 0 and applied_coupon_code:
                payment_text = (
                    f"🎟️ Coupon: {applied_coupon_code}\n"
                    f"💵 Discount: -${coupon_discount:.2f}\n"
                    f"💰 Total: ${total_amount:.2f}\n\n"
                    f"Tap the button below to complete your secure payment."
                )
            else:
                payment_text = f"💰 Total: ${total_amount:.2f}\n\nTap the button below to complete your secure payment."

            # Send payment link
            if is_whatsapp:
                # Send CTA URL button for beautiful payment link
                dispatcher.utter_message(
                    json_message={
                        "type": "cta_url",
                        "header": "💳 Ready to Pay!",
                        "text": payment_text,
                        "button_text": "💳 Pay Now",
                        "url": payment_url,
                        "footer": "Secure payment by Stripe"
                    }
                )
                # Send follow-up message with confirmation button
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "After payment, tap below to confirm:",
                        "buttons": [
                            {"id": "check_payment", "title": "✅ I've Paid"}
                        ]
                    }
                )
            else:
                dispatcher.utter_message(
                    text=f"💳 **Complete your payment of ${total_amount:.2f}**\n\n"
                         f"Click below to open secure checkout:\n\n"
                         f'<a href="{payment_url}" target="_blank">👉 Pay ${total_amount:.2f} with Stripe</a>\n\n'
                         f"You'll receive automatic confirmation after payment!"
                )
                dispatcher.utter_message(
                    text="After payment, click here:",
                    buttons=[
                        {"title": "✅ Check Payment", "payload": "/check_payment_status"}
                    ]
                )
            
            return [
                SlotSet("stripe_session_id", session.id),
                SlotSet("payment_amount", total_amount)
            ]
            
        except Exception as e:
            print(f"[EXCEPTION] Creating Stripe session: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Error creating payment session")
            return []

class ActionChangeZipcode(Action):
    def name(self) -> Text:
        return "action_change_zipcode"

    def run(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> List[EventType]:
        # Clear the zipcode and related store slots
        dispatcher.utter_message(text="Sure, please provide your 5-digit ZIP code.")
        return [
            SlotSet("zipcode", None),
            SlotSet("stores_list", None),
            SlotSet("selected_store", None),
            SlotSet("store_context", False),
            SlotSet("recent_products", None)
        ]


class ActionProductLLMSearch(Action):
    """Modified to auto-filter by store for dedicated bots"""
    
    def name(self) -> str:
        return "action_product_llm_search"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        user_query = tracker.latest_message.get("text", "").strip()
        if user_query and "near" in user_query.lower():
            try:
                store_action = ActionGetNearestStore()
                return store_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] delegating to ActionGetNearestStore: {e}")
                pass

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            dispatcher.utter_message(text="OpenAI API key not configured. Please contact administrator.")
            return []

        if not user_query:
            dispatcher.utter_message(text="Please tell me what product or category you want to search for.")
            return []

        intent_name = tracker.latest_message.get("intent", {}).get("name")

        page = tracker.get_slot("search_page")
        try:
            page = int(page) if page else 1
        except (TypeError, ValueError):
            page = 1

        last_search_string = tracker.get_slot("last_search_string")

        if intent_name == "search_products":
            # ============================================================
            # LLM-BASED NATURAL LANGUAGE UNDERSTANDING FOR SEARCH
            # ============================================================
            query_lower = user_query.lower().strip()

            # ============================================================
            # BUTTON CLICK DETECTION - prompt user for search query
            # ============================================================
            search_button_patterns = [
                "search_products",
                "🔍 search",
                "🔍 search products",
                "🔍search",
            ]
            is_button_click = any(query_lower == pattern.lower() or query_lower.replace(" ", "") == pattern.lower().replace(" ", "") for pattern in search_button_patterns)

            if is_button_click:
                print(f"[DEBUG] Search button clicked, prompting user for query")
                dispatcher.utter_message(
                    text="🔍 What would you like to search for?\n\nType a product name like *pizza*, *burger*, *samosa*, etc."
                )
                return [SlotSet("last_search_string", None)]

            # ============================================================
            # USE LLM TO EXTRACT PRODUCT FROM NATURAL LANGUAGE
            # ============================================================
            search_keyword = None

            # Try LLM extraction first (handles all natural language cases)
            llm_result = extract_product_with_llm(user_query)

            if llm_result and llm_result.get("product"):
                search_keyword = llm_result["product"]
                extract_type = llm_result.get("type", "unknown")
                print(f"[LLM SEARCH] Extracted '{search_keyword}' (type: {extract_type}) from: '{user_query}'")

            # ============================================================
            # FALLBACK: Simple extraction if LLM fails
            # ============================================================
            if not search_keyword:
                print(f"[LLM SEARCH] LLM extraction failed, using simple fallback")
                search_keyword = simple_extract_product(user_query)

            # If still nothing, use original query cleaned up
            if not search_keyword:
                search_keyword = re.sub(r'[?!.,;:]+', '', user_query).strip()
                print(f"[LLM SEARCH] Using cleaned original query: '{search_keyword}'")

            # ============================================================
            # REMOVED: All the old regex patterns - now handled by LLM
            # - Category patterns (breakfast, lunch, dinner, etc.)
            # - Dietary patterns (veg, non-veg, spicy, etc.)
            # - Hunger patterns
            # - 50+ search patterns
            # ============================================================

            print(f"[DEBUG] Final search keyword: '{search_keyword}' from query: '{user_query}'")

            last_search_string = search_keyword
            page = 1

        elif intent_name == "search_products_next":
            if not last_search_string:
                last_search_string = user_query
        else:
            if not last_search_string:
                last_search_string = user_query

        print(f"[DEBUG] Using search string for backend API: '{last_search_string}', page: {page}")

        # ⭐ NEW: Get store context for filtering
        store_id = tracker.get_slot("store_id")
        is_dedicated_bot = tracker.get_slot("is_dedicated_bot")
        
        # Build payload with store filter
        search_endpoint = f"{API_BASE}/getMasterProducts"
        payload = {
            "wh_account_id": str(store_id) if (is_dedicated_bot and store_id) else "",  # ⭐ AUTO-FILTER
            "upc": "",
            "ai_category_id": "",
            "ai_product_id": "",
            "product_id": "",
            "search_string": last_search_string,
            "zipcode": "",
            "user_id": "",
            "page": str(page),
            "items": "5"
        }

        print(f"[DEBUG] Calling backend API with payload: {payload}")
        print(f"[STORE FILTER] wh_account_id: {payload['wh_account_id']}")

        try:
            api_response = requests.post(search_endpoint, json=payload, timeout=8)
            api_response.raise_for_status()
            data = api_response.json()
            api_data = data.get("data", {}) if data else {}
            if isinstance(api_data, dict):
                products = api_data.get("getMasterProducts", [])
            else:
                products = api_data
            print(f"[DEBUG] Backend API returned {len(products)} products")
        except Exception as e:
            print(f"[WARN] Could not fetch products from backend: {e}")
            products = []

        product_dicts = [p for p in products if isinstance(p, dict)] if isinstance(products, list) else []

        if product_dicts:
            # Build WhatsApp list message for better UX
            sections = []
            items = []
            for idx, p in enumerate(product_dicts):
                product_id = p.get('product_id') or p.get('id', str(idx+1))
                title = p.get('product_name') or p.get('title', 'Unnamed Product')
                price = p.get('discounted_price', p.get('product_price', ''))
                price_str = f"₹{price}" if price else ""
                desc = p.get('description', '').strip()
                desc_short = (desc[:70] + '...') if desc and len(desc) > 70 else desc

                items.append({
                    "id": f"product_{product_id}",
                    "title": title[:24] if len(title) > 24 else title,
                    "description": f"{price_str} - {desc_short}" if desc_short else price_str
                })

            sections.append({
                "title": "Products",
                "rows": items
            })

            # Add "Show More" option if there might be more results
            sections.append({
                "title": "More Options",
                "rows": [
                    {"id": "next_page", "title": "Show More Results", "description": "See more products"}
                ]
            })

            dispatcher.utter_message(
                json_message={
                    "type": "list",
                    "text": f"🔍 Found {len(product_dicts)} result(s) for *{last_search_string}*\n\nTap below to view products:",
                    "button_text": "View Products",
                    "sections": sections
                }
            )
        else:
            # Special handling for recommendation queries (popular, etc.)
            if last_search_string in ["popular", "featured", "best seller", "recommended"]:
                # Show menu/categories instead of error message
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "🍽️ Let me show you what we have!\n\nTap below to browse our menu:",
                        "buttons": [
                            {"id": "browse_products", "title": "🛍️ Browse Menu"},
                            {"id": "search_products", "title": "🔍 Search Products"}
                        ]
                    }
                )
            else:
                # Regular "not found" message with helpful buttons
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"😕 Sorry, I couldn't find any products matching *{last_search_string}*.\n\nTry browsing our menu or searching for something else:",
                        "buttons": [
                            {"id": "browse_products", "title": "🛍️ Browse Menu"},
                            {"id": "search_products", "title": "🔍 Search Again"}
                        ]
                    }
                )

        if product_dicts:
            return [
                SlotSet("recent_products", json.dumps(product_dicts)),
                SlotSet("search_page", page),
                SlotSet("last_search_string", last_search_string)
            ]
        else:
            return [
                SlotSet("recent_products", None),
                SlotSet("search_page", 1),
                SlotSet("last_search_string", last_search_string)
            ]


class ActionNextProductPage(Action):
    def name(self) -> str:
        return "action_next_product_page"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:

        page = tracker.get_slot("search_page")
        try:
            page = int(page) + 1 if page else 2
        except (ValueError, TypeError):
            page = 2

        print(f"[DEBUG] Incrementing search page slot to: {page}")

        # Update page slot, search action will use updated page on next call
        return [SlotSet("search_page", page)]


class ActionResetSearchPage(Action):
    def name(self) -> str:
        return "action_reset_search_page"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:

        print("[DEBUG] Resetting search_page slot to 1 for new search.")
        return [SlotSet("search_page", 1)]

        
# Regex to validate US ZIP code format (5 digits)
ZIP_REGEX = re.compile(r"^\d{5}$")


class ValidateZipcodeForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_zipcode_form"

    def validate_zipcode(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate ZIP code"""

        if slot_value and ZIP_REGEX.match(str(slot_value)):
            return {"zipcode": slot_value}
        else:
            dispatcher.utter_message(text="That ZIP code doesn't seem valid. Please enter a proper 5-digit US ZIP code.")
            return {"zipcode": None}


class ActionGetNearestStore(Action):
    """Modified to block store switching for dedicated bots"""

    def name(self) -> Text:
        return "action_get_nearest_store"

    def run(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> List[EventType]:
        
        # ⭐ NEW: Check if this is a store-specific bot
        is_dedicated_bot = tracker.get_slot("is_dedicated_bot")
        store_name = tracker.get_slot("store_name")
        
        # 🚫 BLOCK STORE SEARCH FOR DEDICATED BOTS
        if is_dedicated_bot:
            print(f"[STORE SEARCH] Blocked - This is a dedicated bot for {store_name}")
            
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
            
            if is_whatsapp:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"🏪 You're shopping at {store_name}!\n\nThis bot is exclusive to our store.\n\nWhat would you like to do?",
                        "buttons": [
                            {"id": "browse_products", "title": "🛍️ Browse Products"},
                            {"id": "view_cart", "title": "🛒 View Cart"},
                            {"id": "my_orders", "title": "📦 My Orders"}
                        ]
                    }
                )
            else:
                dispatcher.utter_message(
                    text=f"🏪 **You're shopping at {store_name}!**\n\n"
                         f"This bot is exclusive to our store.",
                    buttons=[
                        {"title": "🛍️ Browse Our Products", "payload": "/show_categories"},
                        {"title": "🛒 View Cart", "payload": "/view_cart"}
                    ]
                )
                dispatcher.utter_message(
                    text='<a href="https://stagebot.anythinginstantly.com" target="_blank">Visit Marketplace for other stores</a>'
                )
            
            return []
        
        # ✅ CONTINUE WITH MARKETPLACE LOGIC (original code)
        zipcode = tracker.get_slot("zipcode")
        user_text = (tracker.latest_message.get("text") or "").strip()
        
        if tracker.get_slot("login_step"):
            return [FollowupAction("action_login_user")]

        lower_text = user_text.lower()
        if lower_text in ["login", "log in", "log me in", "sign in"]:
            return [FollowupAction("action_login_user")]
        if lower_text in ["register", "sign up", "create account", "new user registration"]:
            dispatcher.utter_message(text="Sure, here is the sign-up page:\nhttps://stage.anythinginstantly.com")
            return []

        if user_text.isdigit() and not re.fullmatch(r"\d{5}", user_text):
            if tracker.get_slot("store_context") or tracker.get_slot("stores_list"):
                try:
                    store_action = ActionSetSelectedStore()
                    return store_action.run(dispatcher, tracker, domain)
                except Exception as e:
                    print(f"[EXCEPTION] delegating to store action: {e}")
                    return [FollowupAction("action_set_selected_store")]
            
            recent_products_json = tracker.get_slot("recent_products")
            if recent_products_json:
                try:
                    product_action = ActionSelectProduct()
                    return product_action.run(dispatcher, tracker, domain)
                except Exception as e:
                    print(f"[EXCEPTION] delegating to product action: {e}")
                    return [FollowupAction("action_select_product")]

        if not zipcode:
            if re.fullmatch(r"\d{5}", user_text):
                zipcode = user_text
            else:
                dispatcher.utter_message(text="Please provide your 5-digit ZIP code first.")
                return []

        store_search_string = None
        for ent in tracker.latest_message.get("entities", []):
            if ent.get("entity") == "store_name":
                store_search_string = ent.get("value")
                break

        payload = {
            "address": {
                "store_type_id": "",
                "zip": str(zipcode),
                "search_string": store_search_string or "",
                "page": "0",
                "items": "20"
            }
        }

        url = f"{API_BASE}/getNearestStore"
        try:
            response = requests.post(url, json=payload, timeout=8)
            response.raise_for_status()
            data = response.json() or {}

            stores = []
            if isinstance(data, list):
                stores = data
            elif isinstance(data, dict):
                nested = data.get("data") or {}
                if isinstance(nested, dict) and nested.get("getNearestStore"):
                    stores = nested.get("getNearestStore")
                if not stores:
                    stores = nested.get("stores") if isinstance(nested, dict) else []
                if not stores and isinstance(nested, list):
                    stores = nested

            store_dicts: List[Dict[str, Any]] = []
            for s in stores:
                if not isinstance(s, dict):
                    continue
                name = s.get("store_name") or s.get("name") or "Unknown Store"
                addr = s.get("address") or s.get("address1") or ""
                city = s.get("city") or ""
                state = s.get("state") or ""
                zipcode_resp = s.get("zipcode") or s.get("zip") or ""
                parts: List[str] = []
                for part in [addr, city, state, zipcode_resp]:
                    if part:
                        parts.append(str(part))
                full_address = ", ".join(parts)

                wh_account_id = s.get("wh_account_id") or s.get("wh_account_id") or ""
                store_name_raw = s.get("store_name") or s.get("name") or ""

                store_dicts.append({
                    "name": str(name),
                    "address": full_address,
                    "wh_account_id": wh_account_id,
                    "store_name": store_name_raw
                })
                
            if store_search_string:
                store_dicts = [s for s in store_dicts if store_search_string.lower() in s["name"].lower()]

            if not store_dicts:
                dispatcher.utter_message(
                    text="Sorry, no stores found for this ZIP code. Would you like to try a different ZIP code?"
                )
                return [SlotSet("stores_list", []), SlotSet("selected_store", None)]

            lines = []
            for idx, store in enumerate(store_dicts[:5], start=1):
                lines.append(f"{idx}. {store['name']} - {store['address']}")
            dispatcher.utter_message(text="Found these stores in your area:\n" + "\n".join(lines))
            dispatcher.utter_message(text="Please select a store by typing its option number or name.")

            return [
                SlotSet("zipcode", zipcode),
                SlotSet("stores_list", store_dicts),
                SlotSet("recent_products", json.dumps(store_dicts)),
                SlotSet("store_context", True),
                SlotSet("selected_store", None)
            ]

        except Exception as e:
            print(f"[EXCEPTION] in ActionGetNearestStore: {e}")
            dispatcher.utter_message(text="Sorry, I am facing issues fetching stores right now. Please try again later.")
            return []


class ActionSetSelectedStore(Action):
    def name(self) -> Text:
        return "action_set_selected_store"

    def run(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> List[EventType]:

        selected_text = tracker.latest_message.get("text", "").strip()

        # If we are not currently in a store selection context but we do have a list of recent products
        if not tracker.get_slot("store_context"):
            recent_products_json = tracker.get_slot("recent_products")
            stores = tracker.get_slot("stores_list")
            if recent_products_json and (stores is None or stores == []) and selected_text and selected_text.isdigit():
                try:
                    product_action = ActionSelectProduct()
                    return product_action.run(dispatcher, tracker, domain)
                except Exception as e:
                    print(f"[EXCEPTION] delegating to product action: {e}")
                    return [FollowupAction("action_select_product")]
                    
        # Retrieve the list of stores
        stores = tracker.get_slot("stores_list")
        if not stores:
            recent_products_json = tracker.get_slot("recent_products")
            try:
                stores = json.loads(recent_products_json) if recent_products_json else []
            except (json.JSONDecodeError, TypeError):
                stores = []

        if not stores:
            dispatcher.utter_message(text="I don't have any store list in memory, please search for stores first.")
            return []

        # Try to infer store choice from number or name matches
        selected_store = None
        # Check if user input is a digit within range
        if selected_text.isdigit():
            idx = int(selected_text) - 1
            if 0 <= idx < len(stores):
                selected_store = stores[idx]
        else:
            # Match by name case-insensitive substring
            for store in stores:
                if selected_text.lower() in store.get("name", "").lower():
                    selected_store = store
                    break

        if selected_store:
            dispatcher.utter_message(text=f"You have selected {selected_store.get('name')} located at {selected_store.get('address')}.")
            events: List[EventType] = [
                SlotSet("selected_store", selected_store),
                SlotSet("store_context", True)
            ]

            # After selecting a store, fetch products specific to that store
            try:
                wh_account_id = selected_store.get("wh_account_id") or ""
                store_name = selected_store.get("store_name") or selected_store.get("name") or ""
                zipcode = tracker.get_slot("zipcode") or ""
                user_id = tracker.get_slot("user_id") or ""

                search_payload = {
                    "wh_account_id": str(wh_account_id),
                    "upc": "",
                    "ai_category_id": "",
                    "ai_product_id": "",
                    "product_id": "",
                    "search_string": "",
                    "zipcode": str(zipcode),
                    "user_id": str(user_id),
                    "page": "1",
                    "items": "5"
                }
                # Call getMasterProducts API to fetch products for the selected store
                products_resp = requests.post(f"{API_BASE}/getMasterProducts", json=search_payload, timeout=8)
                products_data = products_resp.json()
                # Parse products list
                product_list = []
                if isinstance(products_data, list):
                    product_list = products_data
                elif isinstance(products_data, dict):
                    pdata = products_data.get("data") or products_data.get("getMasterProducts") or products_data.get("products")
                    if isinstance(pdata, list):
                        product_list = pdata
                    elif isinstance(pdata, dict):
                        product_list = pdata.get("getMasterProducts", []) or pdata.get("products", [])
                        
                if product_list:
                    lines = []
                    for idx, p in enumerate(product_list[:5], start=1):
                        title = p.get("title") or p.get("product_name") or "Unnamed Product"
                        price = p.get("discounted_price") or p.get("product_price") or "-"
                        price_str = f"₹{price}"
                        desc = p.get("description", "").strip()
                        if len(desc) > 80:
                            desc = desc[:80] + "…"
                        lines.append(f"{idx}. **{title}**\n{price_str}\n{desc}")
                    msg = "🛒 **Products available in this store:**\n\n" + "\n\n".join(lines) + "\n\n➡️ Reply with the product number to see details."
                    dispatcher.utter_message(text=msg)
                    # Save to recent_products slot
                    events.append(SlotSet("recent_products", json.dumps(product_list)))
                    # Reset search_page for next
                    events.append(SlotSet("search_page", 1))
                    # Exit store context after presenting store products
                    events.append(SlotSet("store_context", False))
                    # Clear the stores_list slot
                    events.append(SlotSet("stores_list", None))
                else:
                    dispatcher.utter_message(text="Sorry, I couldn't find any products for this store.")
                    events.append(SlotSet("recent_products", None))
                    events.append(SlotSet("store_context", False))
                    events.append(SlotSet("stores_list", None))
            except Exception as e:
                print(f"[EXCEPTION] fetching products for selected store: {e}")
                dispatcher.utter_message(text="An error occurred while fetching products for this store.")
            return events

        else:
            dispatcher.utter_message(text="Sorry, I couldn't find a matching store. Please try again or enter a different name.")
            return [SlotSet("selected_store", None)]


class ActionRecallPreviousLocation(Action):
    def name(self) -> Text:
        return "action_recall_previous_location"

    def run(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> List[EventType]:
        last_zip = tracker.get_slot("last_zipcode")
        last_store = tracker.get_slot("selected_store")

        if last_zip and last_store:
            store_name = last_store.get("name") if isinstance(last_store, dict) else str(last_store)
            dispatcher.utter_message(text=f"Welcome back! Would you like to continue with your last ZIP code {last_zip} and store {store_name}?")
            return []
        else:
            dispatcher.utter_message(text="Welcome! How can I assist you today?")
            return []


class ActionShowStoreOptions(Action):
    def name(self) -> Text:
        return "action_show_store_options"

    def run(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> List[EventType]:
        stores = tracker.get_slot("stores_list") or []
        if not stores or not isinstance(stores, list):
            dispatcher.utter_message(text="I don't have any stores to show. Please search for stores first.")
            return []

        store_lines = []
        for idx, store in enumerate(stores[:5], start=1):
            name = store.get("name", "Unknown Store")
            address = store.get("address", "")
            store_lines.append(f"{idx}. {name} - {address}")

        store_list_text = "Found these stores in your area:\n" + "\n".join(store_lines)
        dispatcher.utter_message(text=store_list_text)
        dispatcher.utter_message(text="Please select a store by typing its option number or name.")
        return []


class ActionChangeStore(Action):
    def name(self) -> Text:
        return "action_change_store"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        dispatcher.utter_message(text="Sure! Let me help you find a different store.")
        # Clear current store selection and trigger store search
        return [
            SlotSet("selected_store", None),
            SlotSet("store_context", True),
            SlotSet("recent_products", None),
            FollowupAction("action_get_nearest_store")
        ]


# General AI Actions for enhanced functionality
class ActionGeneralAIResponse(Action):
    def name(self) -> Text:
        return "action_general_ai_response"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        user_message = tracker.latest_message.get('text', '')
        
        # Try to get response from your API first
        api_response = self.try_api_call(user_message)
        
        if api_response:
            dispatcher.utter_message(text=api_response)
            return [SlotSet("api_fallback_used", False)]
        
        # If API fails, use AI fallback
        ai_response = self.generate_ai_response(user_message, tracker)
        dispatcher.utter_message(text=ai_response)
        
        return [
            SlotSet("api_fallback_used", True),
            SlotSet("last_query", user_message)
        ]
    
    def try_api_call(self, query: str) -> str:
        """Try to get response from your AnythingInstantly API"""
        try:
            # Replace with your actual API endpoint
            api_url = f"{API_BASE}/general-query"
            response = requests.post(api_url, 
                                   json={"query": query}, 
                                   timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('answer', '')
        except Exception:
            return ""
    
    def generate_ai_response(self, query: str, tracker: Tracker) -> str:
        """Generate AI-like response when API fails"""
        
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['weather', 'temperature']):
            return "I don't have real-time weather data, but you can check weather apps or websites for current conditions in your area."
        
        elif any(word in query_lower for word in ['time', 'clock']):
            return "I don't have access to current time, but you can check your device's clock or search 'current time' online."
        
        elif any(word in query_lower for word in ['joke', 'funny']):
            jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "I told my wife she was drawing her eyebrows too high. She looked surprised!",
                "Why did the scarecrow win an award? He was outstanding in his field!"
            ]
            import random
            return random.choice(jokes)
        
        elif any(word in query_lower for word in ['how are you', 'how do you feel']):
            return "I'm doing well, thank you for asking! I'm here and ready to help you with anything you need."
        
        elif any(word in query_lower for word in ['what is', 'define', 'meaning']):
            return f"I don't have detailed information about '{query}' in my current database, but I'd recommend checking reliable sources like Wikipedia or educational websites for accurate definitions."
        
        elif any(word in query_lower for word in ['calculate', 'math', '+', '-', '*', '/']):
            return "I can help with basic calculations, but for complex math, I'd recommend using a calculator app or math tool."
        
        else:
            # Generic intelligent response
            responses = [
                f"That's an interesting question about '{query}'. While I don't have specific information about this topic, I'm designed to help with shopping and general assistance. Is there something specific I can help you find or learn about?",
                f"I understand you're asking about '{query}'. I don't have detailed information on this topic, but I'm here to help however I can. Would you like me to help you find products related to this, or is there another way I can assist?",
                f"Thanks for your question about '{query}'. While this isn't in my specialty area, I'm always learning. Is there something shopping-related or another topic I might be better equipped to help with?"
            ]
            import random
            return random.choice(responses)


class ActionSmartFallback(Action):
    def name(self) -> Text:
        return "action_smart_fallback"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        # Get the user's message
        user_message = tracker.latest_message.get('text', '')
        
        # Check if the last action was a specific action that already handled the response
        last_action = tracker.get_last_event_for("action")
        if last_action and last_action.get("name") in [
            "action_track_my_orders",
            "action_prompt_login",
            "action_login_user",
            "action_view_cart",
            "action_get_address"
        ]:
            # Don't show fallback message if a specific action just ran
            return []
        
        # Provide contextual fallback based on conversation history
        if 'product' in user_message.lower() or 'buy' in user_message.lower():
            response = "I can help you find products! Try asking me to 'show categories' or 'search for [product name]'."
        elif 'store' in user_message.lower() or 'location' in user_message.lower():
            response = "I can help you find stores near you! Just say 'find stores' or 'search stores'."
        else:
            response = "I didn't quite understand that. I can help you with:\n• Shopping and finding products\n• Store locations\n• General questions\n• Cart management\n\nWhat would you like to help with?"
        
        dispatcher.utter_message(text=response)
        return []
        
# ============================================================================
# ENHANCED SMART FALLBACK WITH OPENAI - START
# ============================================================================

class ActionSmartFallbackEnhanced(Action):
    """
    Enhanced fallback that uses OpenAI to understand unclear queries
    """
    
    def name(self) -> Text:
        return "action_smart_fallback_enhanced"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        user_message = tracker.latest_message.get('text', '').strip()
        
        print(f"[FALLBACK] Triggered for message: '{user_message}'")
        
        if not user_message:
            dispatcher.utter_message(text="I didn't catch that. Could you please rephrase?")
            return []
        
        # Check if in login flow
        if tracker.get_slot("login_step"):
            try:
                login_action = ActionLoginUser()
                return login_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] Login delegation: {e}")
                return [FollowupAction("action_login_user")]

        # Check if awaiting typed address
        checkout_step = tracker.get_slot("checkout_step")
        if checkout_step == "awaiting_typed_address":
            print(f"[FALLBACK] Detected awaiting_typed_address, delegating to action_process_typed_address")
            try:
                from actions import ActionProcessTypedAddress
                typed_address_action = ActionProcessTypedAddress()
                return typed_address_action.run(dispatcher, tracker, domain)
            except Exception as e:
                print(f"[EXCEPTION] Typed address delegation: {e}")
                return [FollowupAction("action_process_typed_address")]

        # Check if it's a zipcode
        if re.fullmatch(r"\d{5}", user_message):
            return [
                SlotSet("zipcode", user_message),
                FollowupAction("action_get_nearest_store")
            ]
        
        # Try OpenAI analysis
        if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
            try:
                intent_analysis = self.analyze_intent_with_ai(user_message, tracker)
                
                if intent_analysis:
                    action = intent_analysis.get('action')
                    confidence = intent_analysis.get('confidence', 0)
                    clarification = intent_analysis.get('clarification')
                    response_text = intent_analysis.get('response')
                    
                    print(f"[AI ANALYSIS] Action: {action}, Confidence: {confidence}")
                    
                    # High confidence - execute action directly
                    if confidence >= 0.8 and action and action != 'none':
                        if response_text:
                            dispatcher.utter_message(text=response_text)
                        return [FollowupAction(action)]
                    
                    # Medium confidence - ask for confirmation
                    elif confidence >= 0.5 and action and action != 'none':
                        dispatcher.utter_message(
                            text=clarification or f"Did you mean: {response_text}?",
                            buttons=[
                                {"title": "Yes", "payload": "/affirm"},
                                {"title": "No, let me rephrase", "payload": "/deny"}
                            ]
                        )
                        return [
                            SlotSet("pending_action", action),
                            SlotSet("pending_query", user_message)
                        ]
                    
                    # Low confidence - provide response
                    else:
                        if response_text:
                            dispatcher.utter_message(text=response_text)
                            return []
            
            except Exception as e:
                print(f"[EXCEPTION] OpenAI analysis failed: {e}")
        
        # Fallback to basic pattern matching
        return self.basic_fallback(dispatcher, user_message)
    
    def analyze_intent_with_ai(self, user_message: str, tracker: Tracker) -> Dict[str, Any]:
        """Use OpenAI to analyze user intent"""
        
        if not OPENAI_AVAILABLE:
            return None
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("[WARN] OpenAI API key not found")
            return None
        
        # Get conversation context
        recent_intents = []
        for event in tracker.events[-5:]:
            if event.get("event") == "user":
                intent_name = event.get("parse_data", {}).get("intent", {}).get("name")
                if intent_name:
                    recent_intents.append(intent_name)
        
        context = f"Recent topics: {', '.join(recent_intents)}" if recent_intents else "New conversation"
        
        system_prompt = """You are an intent classifier for an AI shopping assistant bot.

Available actions:
- action_product_llm_search: Search products
- action_get_nearest_store: Find stores
- action_view_cart: View cart
- action_login_user: Login
- action_show_categories_with_products: Show categories
- none: Out of scope

For gibberish or random text, return:
{
    "action": "none",
    "confidence": 0.1,
    "response": "I didn't quite understand that. I can help you with shopping, finding stores, or managing your cart. What would you like to do?"
}

Return JSON with:
{
    "action": "action_name or none",
    "confidence": 0.0-1.0,
    "clarification": "confirmation question",
    "response": "helpful text"
}"""

        try:
            client = OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{context}\nUser: {user_message}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=300
            )
            
            result = json.loads(response.choices[0].message.content)
            print(f"[AI ANALYSIS] Result: {result}")
            return result
            
        except Exception as e:
            print(f"[EXCEPTION] OpenAI API call failed: {e}")
            return None
    
    def basic_fallback(self, dispatcher: CollectingDispatcher, user_message: str) -> List[EventType]:
        """Basic pattern matching fallback"""
        
        msg_lower = user_message.lower()
        
        print(f"[BASIC FALLBACK] Processing: '{msg_lower}'")
        
        # Check for gibberish (less than 3 chars or all same char)
        if len(user_message) < 3 or len(set(user_message.lower())) == 1:
            dispatcher.utter_message(
                text="I didn't understand that. Could you please try again?",
                buttons=[
                    {"title": "Browse Products", "payload": "/show_categories"},
                    {"title": "Find Stores", "payload": "find stores"},
                    {"title": "View Cart", "payload": "/view_cart"}
                ]
            )
            return []
        
        # Check if it looks like a store/business name
        store_keywords = ['barber', 'shop', 'salon', 'restaurant', 'cafe', 'store', 'mart', 
                          'market', 'mall', 'outlet', 'center', 'pizza', 'burger', 
                          'coffee', 'pharmacy', 'gym', 'spa']
        
        is_store_query = any(keyword in msg_lower for keyword in store_keywords)
        
        # Pattern matching for products vs stores
        if any(word in msg_lower for word in ['product', 'buy', 'find', 'show']) or 'ice' in msg_lower or 'cream' in msg_lower:
            
            if is_store_query:
                # Asking about a specific store/business
                dispatcher.utter_message(
                    text="I can help you find stores nearby! What are you looking for?",
                    buttons=[
                        {"title": "Show Nearest Stores", "payload": "find stores near me"},
                        {"title": "Browse Products", "payload": "/show_categories"}
                    ]
                )
            else:
                # General product search
                dispatcher.utter_message(
                    text="I can help you find products! What are you looking for?",
                    buttons=[
                        {"title": "Show Categories", "payload": "/show_categories"},
                        {"title": "Find Stores", "payload": "find stores near me"}
                    ]
                )
        
        elif any(word in msg_lower for word in ['store', 'location', 'near', 'shop']):
            dispatcher.utter_message(
                text="I can help you find stores. Please provide your ZIP code.",
                buttons=[
                    {"title": "Enter ZIP Code", "payload": "08852"}
                ]
            )
            return []
        
        elif any(word in msg_lower for word in ['cart', 'basket']):
            return [FollowupAction("action_view_cart")]
        
        else:
            # Complete fallback
            dispatcher.utter_message(
                text="I'm not sure what you mean. I can help you with:\n"
                     "🛍️ Finding products\n"
                     "📍 Locating stores\n"
                     "🛒 Managing your cart\n"
                     "💳 Checkout\n\n"
                     "What would you like to do?",
                buttons=[
                    {"title": "Browse Products", "payload": "/show_categories"},
                    {"title": "Find Stores", "payload": "find stores near me"},
                    {"title": "View Cart", "payload": "/view_cart"}
                ]
            )
        return []


class ActionConfirmAndExecute(Action):
    """Execute pending action after user confirmation"""
    
    def name(self) -> Text:
        return "action_confirm_and_execute"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        pending_action = tracker.get_slot("pending_action")
        pending_query = tracker.get_slot("pending_query")
        
        # Clear pending slots
        events = [
            SlotSet("pending_action", None),
            SlotSet("pending_query", None)
        ]
        
        # User confirmed - execute the action
        if pending_action:
            # For product search, set the search query
            if pending_action == "action_product_llm_search" and pending_query:
                events.append(SlotSet("last_search_string", pending_query))
            
            events.append(FollowupAction(pending_action))
        else:
            dispatcher.utter_message(text="What would you like me to help you with?")
        
        return events


class ActionHandleDeny(Action):
    """Handle when user denies the clarification"""
    
    def name(self) -> Text:
        return "action_handle_deny"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        dispatcher.utter_message(
            text="No problem! Could you please rephrase what you're looking for?",
            buttons=[
                {"title": "Browse Products", "payload": "/show_categories"},
                {"title": "Find Stores", "payload": "find stores"},
                {"title": "View Cart", "payload": "/view_cart"}
            ]
        )
        
        return [
            SlotSet("pending_action", None),
            SlotSet("pending_query", None)
        ]


class ActionIntelligentResponse(Action):
    """Provide intelligent responses for general questions using OpenAI"""
    
    def name(self) -> Text:
        return "action_intelligent_response"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[EventType]:
        
        user_message = tracker.latest_message.get('text', '')
        
        # Try to get intelligent response from OpenAI
        response_text = self.generate_intelligent_response(user_message, tracker)
        
        if response_text:
            dispatcher.utter_message(text=response_text)
        else:
            # Fallback response
            dispatcher.utter_message(
                text="I'm here to help with shopping! What would you like to do?",
                buttons=[
                    {"title": "Browse Products", "payload": "/show_categories"},
                    {"title": "Find Stores", "payload": "find stores"},
                ]
            )
        
        return []
    
    def generate_intelligent_response(self, user_message: str, tracker: Tracker) -> str:
        """Generate intelligent response using OpenAI"""
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        
        system_prompt = """You are a helpful AI shopping assistant named AnythingInstantly Bot.

Your capabilities:
- Help users find and buy products
- Locate nearby stores
- Manage shopping carts
- Process payments

When users ask questions outside shopping:
1. Provide brief, helpful responses
2. Gently guide them back to shopping-related topics
3. Be friendly and conversational
4. Keep responses under 100 words

For shopping-related questions, encourage them to use your features."""

        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"[EXCEPTION] OpenAI response generation failed: {e}")
            return None

# ============================================================================
# ENHANCED SMART FALLBACK WITH OPENAI - END
# ============================================================================

class ActionLogoutUser(Action):
    """Handle user logout - clear all user-related slots"""
    
    def name(self) -> Text:
        return "action_logout_user"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        user_id = tracker.get_slot("user_id")
        
        if not user_id:
            dispatcher.utter_message(text="You are not currently logged in.")
            return []
        
        # Clear all user-related data
        dispatcher.utter_message(
            text="You have been logged out successfully. Have a great day! 👋",
            buttons=[
                {"title": "Login Again", "payload": "login"},
                {"title": "Browse Products", "payload": "/show_categories"},
                {"title": "Find Stores", "payload": "find stores near me"}
            ]
        )
        
        return [
            SlotSet("user_id", None),
            SlotSet("login_step", None),
            SlotSet("login_phone", None),
            SlotSet("login_password", None),
            SlotSet("selected_product", None),
            SlotSet("recent_products", None),
            SlotSet("order_id", None)
        ]


class ActionChangeZipcodeEnhanced(Action):
    """Enhanced zipcode change handler"""
    
    def name(self) -> Text:
        return "action_change_zipcode_enhanced"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        current_zipcode = tracker.get_slot("zipcode")
        
        if current_zipcode:
            dispatcher.utter_message(
                text=f"Your current ZIP code is: {current_zipcode}\n\nPlease enter your new 5-digit ZIP code to find stores in a different area."
            )
        else:
            dispatcher.utter_message(
                text="Please enter your 5-digit ZIP code to find stores near you."
            )
        
        # Clear all location-related slots
        return [
            SlotSet("zipcode", None),
            SlotSet("stores_list", None),
            SlotSet("selected_store", None),
            SlotSet("store_context", False),
            SlotSet("recent_products", None),
            SlotSet("last_zipcode", current_zipcode)  # Save for reference
        ]

class ActionTrackMyOrders(Action):
    def name(self) -> Text:
        return "action_track_my_orders"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        user_id = tracker.get_slot("user_id")

        if not user_id:
            dispatcher.utter_message(text="Please login to view your orders.")
            return [FollowupAction("action_prompt_login")]

        # Detect channel
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        orders_url = "https://stage.anythinginstantly.com/my-orders"

        try:
            # Fetch user's recent orders (limit to 5)
            orders_response = requests.post(
                "https://stageshipperapi.thedelivio.com/api/order-lists",
                json={
                    "customer_id": str(user_id),
                    "order_id": "",
                    "search_string": "",
                    "status_type": "",
                    "page": "1",
                    "items": "5",
                    "id": ""
                },
                timeout=10
            )

            if orders_response.status_code == 200:
                data = orders_response.json()

                if data.get("status") == 1:
                    orders = data.get("data", [])

                    if orders and len(orders) > 0:
                        # Build order summary message
                        msg_lines = ["📦 *Your Recent Orders*\n"]

                        for order in orders[:5]:
                            oid = order.get("id", "N/A")
                            store_name = order.get("shipper_company_name", order.get("shipper_name", ""))
                            status = order.get("order_status", "Processing")
                            total = order.get("total_amount", order.get("discounted_amount_after_coupon", "0"))
                            order_date = order.get("order_date", "")
                            date_display = order_date[:10] if order_date else ""

                            # Status emoji
                            status_emoji = "⏳"
                            status_lower = str(status).lower() if status else ""
                            if "deliver" in status_lower:
                                status_emoji = "✅"
                            elif "cancel" in status_lower:
                                status_emoji = "❌"
                            elif "ship" in status_lower or "transit" in status_lower or "on the way" in status_lower:
                                status_emoji = "🚚"
                            elif "picked" in status_lower:
                                status_emoji = "📦"
                            elif "accept" in status_lower or "confirmed" in status_lower:
                                status_emoji = "👍"

                            msg_lines.append(f"{status_emoji} *Order #{oid}*")
                            if store_name:
                                msg_lines.append(f"   🏪 {store_name[:30]}")
                            msg_lines.append(f"   📋 {status}")
                            try:
                                msg_lines.append(f"   💰 ${float(total):.2f}")
                            except:
                                msg_lines.append(f"   💰 ${total}")
                            if date_display:
                                msg_lines.append(f"   📅 {date_display}")
                            msg_lines.append("")

                        msg_lines.append(f"View all orders: {orders_url}")
                        msg_text = "\n".join(msg_lines)

                        if is_whatsapp:
                            dispatcher.utter_message(
                                json_message={
                                    "type": "buttons",
                                    "text": msg_text,
                                    "buttons": [
                                        {"id": "browse_products", "title": "🛍️ Shop More"},
                                        {"id": "view_cart", "title": "🛒 View Cart"}
                                    ]
                                }
                            )
                        else:
                            dispatcher.utter_message(text=msg_text)
                        return []

            # Fallback - no orders or error
            if is_whatsapp:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"📦 No recent orders found.\n\nView all orders: {orders_url}",
                        "buttons": [
                            {"id": "browse_products", "title": "🛍️ Browse Products"}
                        ]
                    }
                )
            else:
                dispatcher.utter_message(
                    text=f'📦 **Your Orders**\n\n'
                         f'<a href="{orders_url}" target="_blank" rel="noopener noreferrer">Click here to view your orders</a>'
                )

        except Exception as e:
            print(f"[TRACK MY ORDERS] Error: {e}")
            # Fallback to link only
            if is_whatsapp:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"📦 Your Orders\n\nView all your orders:\n{orders_url}",
                        "buttons": [
                            {"id": "browse_products", "title": "🛍️ Browse Products"}
                        ]
                    }
                )
            else:
                dispatcher.utter_message(
                    text=f'📦 **Your Orders**\n\n'
                         f'<a href="{orders_url}" target="_blank" rel="noopener noreferrer">Click here to view your orders</a>'
                )
        
        return []
        
class ActionCheckStripePayment(Action):
    """Manual payment check with full order details + Continue Shopping buttons"""
    
    def name(self) -> Text:
        return "action_check_stripe_payment"
    
    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        session_id = tracker.get_slot("stripe_session_id")
        user_id = tracker.get_slot("user_id")
        
        if not session_id:
            dispatcher.utter_message(text="No payment session found. Please create a new order.")
            return []
        
        if not user_id:
            dispatcher.utter_message(text="Please log in to check payment status.")
            return [FollowupAction("action_prompt_login")]
        
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

        # Detect channel FIRST (before any if/else blocks)
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        try:
            # Retrieve Stripe session
            session = stripe.checkout.Session.retrieve(session_id)

            print(f"[MANUAL CHECK] Session ID: {session_id}")
            print(f"[MANUAL CHECK] Payment Status: {session.payment_status}")
            print(f"[MANUAL CHECK] Channel: {input_channel}, is_whatsapp: {is_whatsapp}")

            if session.payment_status == "paid":
                # ✅ Payment is complete
                
                # Get payment amount from Stripe
                amount_total = session.amount_total / 100  # Convert cents to dollars
                
                # 🔍 Fetch the most recent order for this user
                order_id = None
                invoice_no = None
                
                try:
                    # Call your order-lists API
                    orders_response = requests.post(
                        "https://stageshipperapi.thedelivio.com/api/order-lists",
                        json={
                            "customer_id": user_id,
                            "order_id": "",
                            "search_string": "",
                            "status_type": "",
                            "page": "1",
                            "items": "1",
                            "id": ""
                        },
                        timeout=8
                    )
                    
                    print(f"[ORDER API] Status: {orders_response.status_code}")
                    
                    if orders_response.status_code == 200:
                        orders_data = orders_response.json()
                        print(f"[ORDER API] Full Response: {json.dumps(orders_data, indent=2)}")
                        
                        # ✅ CORRECTED PARSING based on your API structure
                        if orders_data.get("status") == 1:
                            # The data is an array directly
                            data_array = orders_data.get("data", [])
                            
                            print(f"[ORDER LIST] Data array length: {len(data_array)}")
                            
                            if data_array and len(data_array) > 0:
                                # Get the first order (most recent)
                                latest_order = data_array[0]
                                
                                # ✅ Extract order details from your API structure
                                order_id = latest_order.get("id")  # This is 1044 in your screenshot
                                invoice_no = latest_order.get("invoice_no")  # inv-1742965231
                                
                                print(f"[ORDER FOUND] Order ID: {order_id}, Invoice: {invoice_no}")
                            else:
                                print("[ORDER LIST] Data array is empty")
                        else:
                            print(f"[ORDER API] Status != 1: {orders_data.get('message')}")
                
                except Exception as e:
                    print(f"[WARNING] Could not fetch order: {e}")
                    import traceback
                    traceback.print_exc()

                # is_whatsapp already defined at function start

                # Build response message
                if order_id:
                    # ✅ We have order details
                    if is_whatsapp:
                        response_text = (
                            f"✅ *Payment Successful!*\n\n"
                            f"💳 *Amount Paid:* ${amount_total:.2f}\n"
                            f"📦 *Order ID:* #{order_id}\n"
                        )
                        if invoice_no:
                            response_text += f"📄 *Invoice:* {invoice_no}\n"
                        response_text += (
                            f"\nTrack your order:\n"
                            f"https://stage.anythinginstantly.com/my-orders\n\n"
                            f"Thank you for shopping! 🎉"
                        )
                        dispatcher.utter_message(text=response_text)

                        # WhatsApp interactive buttons for next actions
                        # Use ONLY json_message to avoid duplicate messages
                        dispatcher.utter_message(
                            json_message={
                                "type": "buttons",
                                "text": "What would you like to do next?",
                                "buttons": [
                                    {"id": "browse_products", "title": "🛍️ Browse Products"},
                                    {"id": "my_orders", "title": "📦 My Orders"},
                                    {"id": "view_cart", "title": "🛒 View Cart"}
                                ]
                            }
                        )
                    else:
                        response_text = (
                            f"✅ **Payment Confirmed!**\n\n"
                            f"💳 **Amount Paid:** ${amount_total:.2f}\n"
                            f"📦 **Order ID:** #{order_id}\n"
                        )
                        if invoice_no:
                            response_text += f"📄 **Invoice:** {invoice_no}\n"
                        response_text += "\nYour order has been placed successfully."
                        
                        dispatcher.utter_message(text=response_text)
                        
                        # Add clickable link
                        dispatcher.utter_message(
                            text='<a href="https://stage.anythinginstantly.com/my-orders" target="_blank" rel="noopener noreferrer">🔗 View Your Orders</a>'
                        )
                        
                        dispatcher.utter_message(text="Thank you! 🎉")
                        
                        # ✅ ADD CONTINUE SHOPPING BUTTONS
                        dispatcher.utter_message(
                            text="What would you like to do next?",
                            buttons=[
                                {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                {"title": "📍 Find Stores", "payload": "find stores near me"},
                                {"title": "📦 My Orders", "payload": "/track_my_orders"}
                            ]
                        )
                    
                else:
                    # ⚠️ Order not found yet
                    if is_whatsapp:
                        # Send payment confirmation text
                        dispatcher.utter_message(
                            text=f"✅ Payment Successful!\n\n💳 Amount Paid: ${amount_total:.2f}\n\nYour order is being processed.\n\nThank you! 🎉"
                        )
                        # Then send interactive buttons for next actions
                        dispatcher.utter_message(
                            json_message={
                                "type": "buttons",
                                "text": "What would you like to do next?",
                                "buttons": [
                                    {"id": "browse_products", "title": "🛍️ Browse Products"},
                                    {"id": "my_orders", "title": "📦 My Orders"},
                                    {"id": "view_cart", "title": "🛒 View Cart"}
                                ]
                            }
                        )
                    else:
                        response_text = (
                            f"✅ **Payment Confirmed!**\n\n"
                            f"💳 **Amount Paid:** ${amount_total:.2f}\n\n"
                            f"Your order is being processed."
                        )
                        dispatcher.utter_message(text=response_text)

                    if not is_whatsapp:
                        dispatcher.utter_message(
                            text='<a href="https://stage.anythinginstantly.com/my-orders" target="_blank" rel="noopener noreferrer">🔗 View Your Orders</a>'
                        )
                        dispatcher.utter_message(text="Thank you! 🎉")
                        
                        # ✅ ADD CONTINUE SHOPPING BUTTONS
                        dispatcher.utter_message(
                            text="What would you like to do next?",
                            buttons=[
                                {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                                {"title": "📍 Find Stores", "payload": "find stores near me"},
                                {"title": "📦 My Orders", "payload": "/track_my_orders"}
                            ]
                        )
                
                # Clear payment session and store last order ID
                return [
                    SlotSet("stripe_session_id", None),
                    SlotSet("payment_amount", None),
                    SlotSet("last_created_order_id", str(order_id) if order_id else None),
                    SlotSet("applied_coupon_id", None),  # Clear coupon after payment
                    SlotSet("applied_coupon_code", None),
                    SlotSet("applied_coupon_discount", None)
                ]

            elif session.payment_status == "unpaid":
                # Payment not completed yet
                if is_whatsapp:
                    # WhatsApp: Use ONLY json_message to avoid duplicates
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "⏳ Payment not completed yet.\n\nPlease complete your payment and click below:",
                            "buttons": [
                                {"id": "check_payment", "title": "✅ Check Again"}
                            ]
                        }
                    )
                else:
                    # Web widget
                    dispatcher.utter_message(
                        text="⏳ Payment not completed yet.\n\nPlease complete your payment.",
                        buttons=[
                            {"title": "✅ Check Again", "payload": "/check_payment_status"}
                        ]
                    )
                return []

            else:
                # Other status (pending, etc.)
                if is_whatsapp:
                    # WhatsApp: Use ONLY json_message to avoid duplicates
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": f"ℹ️ Payment status: {session.payment_status}\n\nPlease check again.",
                            "buttons": [
                                {"id": "check_payment", "title": "🔄 Retry"}
                            ]
                        }
                    )
                else:
                    # Web widget
                    dispatcher.utter_message(
                        text=f"ℹ️ Payment status: {session.payment_status}\n\nPlease check again.",
                        buttons=[
                            {"title": "🔄 Retry", "payload": "/check_payment_status"}
                        ]
                    )
                return []
                
        except stripe.error.InvalidRequestError as e:
            print(f"[ERROR] Invalid Stripe session: {e}")
            dispatcher.utter_message(text="Payment session expired. Please create a new order.")
            return [
                SlotSet("stripe_session_id", None),
                SlotSet("payment_amount", None)
            ]
        except Exception as e:
            print(f"[ERROR] Payment check failed: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Error checking payment. Please try again.")
            return []

class ActionRemoveFromCart(Action):
    """Remove a single product from cart"""
    
    def name(self) -> Text:
        return "action_remove_from_cart"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        user_id = tracker.get_slot("user_id")
        
        # Require login
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You need to log in to manage your cart.")
            return [FollowupAction("action_prompt_login")]
        
        # Get the cart item ID from slot (set by cart view)
        cart_item_id = tracker.get_slot("cart_item_to_remove")
        
        if not cart_item_id:
            dispatcher.utter_message(text="Please select an item to remove from your cart.")
            return [FollowupAction("action_view_cart")]
        
        try:
            url = "https://stageshipperapi.thedelivio.com/api/remove-product-from-cart"
            payload = {
                "user_id": user_id,
                "id": int(cart_item_id)  # cart_id from cartlist
            }
            
            print(f"[REMOVE FROM CART] Request: {payload}")
            
            response = requests.post(url, json=payload, timeout=8)
            data = response.json()
            
            print(f"[REMOVE FROM CART] Response: {data}")
            
            # Check response
            if response.status_code == 200 and data.get("status") == 1:
                # Success
                product_name = tracker.get_slot("cart_item_name") or "Product"
                dispatcher.utter_message(text=f"✅ {product_name} removed from your cart!")
                
                # Clear the temporary slots
                events = [
                    SlotSet("cart_item_to_remove", None),
                    SlotSet("cart_item_name", None)
                ]
                
                # Refresh cart view
                dispatcher.utter_message(text="Here's your updated cart:")
                return events + [FollowupAction("action_view_cart")]
            
            else:
                # Error
                error_msg = data.get("message", "Could not remove item from cart.")
                dispatcher.utter_message(text=f"❌ {error_msg}")
                return [
                    SlotSet("cart_item_to_remove", None),
                    SlotSet("cart_item_name", None)
                ]
        
        except Exception as e:
            print(f"[EXCEPTION] Removing from cart: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="An error occurred while removing the item.")
            return [
                SlotSet("cart_item_to_remove", None),
                SlotSet("cart_item_name", None)
            ]


class ActionClearCart(Action):
    """Clear entire cart"""
    
    def name(self) -> Text:
        return "action_clear_cart"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        user_id = tracker.get_slot("user_id")
        
        # Require login
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You need to log in to manage your cart.")
            return [FollowupAction("action_prompt_login")]
        
        try:
            url = "https://stageshipperapi.thedelivio.com/api/destroy-cart"
            payload = {"user_id": user_id}
            
            print(f"[CLEAR CART] Request: {payload}")
            
            response = requests.post(url, json=payload, timeout=8)
            data = response.json()
            
            print(f"[CLEAR CART] Response: {data}")
            
            # Detect channel
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
            
            # Check response
            if response.status_code == 200 and data.get("status") == 1:
                # Success - cart cleared
                if is_whatsapp:
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": "✅ Cart cleared successfully!\n\nWhat would you like to do?",
                            "buttons": [
                                {"id": "browse_products", "title": "🛍️ Browse Products"},
                                {"id": "my_orders", "title": "📦 My Orders"}
                            ]
                        }
                    )
                else:
                    dispatcher.utter_message(
                        text="✅ **Cart cleared successfully!**\n\nReady to shop again?",
                        buttons=[
                            {"title": "🛍️ Browse Products", "payload": "/show_categories"},
                            {"title": "📦 My Orders", "payload": "/track_my_orders"}
                        ]
                    )

                # Clear coupon slots when cart is cleared
                return [
                    SlotSet("applied_coupon_id", None),
                    SlotSet("applied_coupon_code", None),
                    SlotSet("applied_coupon_discount", None),
                    SlotSet("whatsapp_order_items", None),
                    SlotSet("whatsapp_order_total", None)
                ]
            
            else:
                # Error or cart not found
                error_msg = data.get("message", "Could not clear cart.")
                
                if "not found" in error_msg.lower():
                    # Cart already empty
                    dispatcher.utter_message(text="Your cart is already empty!")
                else:
                    dispatcher.utter_message(text=f"❌ {error_msg}")
                
                return []
        
        except Exception as e:
            print(f"[EXCEPTION] Clearing cart: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="An error occurred while clearing your cart.")
            return []


class ActionConfirmRemoveItem(Action):
    """Ask for confirmation before removing item"""
    
    def name(self) -> Text:
        return "action_confirm_remove_item"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        # Get the item info from message entities or latest message
        user_text = tracker.latest_message.get("text", "").strip().lower()
        
        # Check if user typed "remove 1", "delete 2", etc.
        match = re.search(r"(?:remove|delete)\s+(\d+)", user_text)
        
        if match:
            item_number = int(match.group(1))
            
            # Get recent cart data
            recent_cart_json = tracker.get_slot("recent_cart_items")
            
            if recent_cart_json:
                try:
                    cart_items = json.loads(recent_cart_json)
                    
                    if 1 <= item_number <= len(cart_items):
                        item = cart_items[item_number - 1]
                        item_id = item.get("id")  # cart_id for removal
                        item_name = item.get("title", "this item")
                        
                        # Detect channel
                        input_channel = tracker.get_latest_input_channel()
                        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
                        
                        if is_whatsapp:
                            dispatcher.utter_message(
                                json_message={
                                    "type": "buttons",
                                    "text": f"⚠️ Remove {item_name} from cart?",
                                    "buttons": [
                                        {"id": "confirm_yes", "title": "✅ Yes, Remove"},
                                        {"id": "confirm_no", "title": "❌ Cancel"}
                                    ]
                                }
                            )
                        else:
                            dispatcher.utter_message(
                                text=f"⚠️ Are you sure you want to remove **{item_name}** from your cart?",
                                buttons=[
                                    {"title": "Yes, Remove", "payload": "/confirm_remove_item"},
                                    {"title": "Cancel", "payload": "/deny"}
                                ]
                            )
                        
                        return [
                            SlotSet("cart_item_to_remove", str(item_id)),
                            SlotSet("cart_item_name", item_name),
                            SlotSet("pending_action", "remove_item")
                        ]
                
                except Exception as e:
                    print(f"[ERROR] Parsing cart items: {e}")
        
        dispatcher.utter_message(text="Please specify which item to remove (e.g., 'remove 1')")
        return [FollowupAction("action_view_cart")]


class ActionConfirmClearCart(Action):
    """Ask for confirmation before clearing entire cart"""
    
    def name(self) -> Text:
        return "action_confirm_clear_cart"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        # Detect channel
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
        
        if is_whatsapp:
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "⚠️ Clear your entire cart?\n\nThis will remove ALL items.",
                    "buttons": [
                        {"id": "confirm_yes", "title": "✅ Yes, Clear All"},
                        {"id": "confirm_no", "title": "❌ Cancel"}
                    ]
                }
            )
        else:
            dispatcher.utter_message(
                text="⚠️ **Are you sure you want to clear your entire cart?**\n\nThis will remove all items.",
                buttons=[
                    {"title": "Yes, Clear All", "payload": "/confirm_clear_cart"},
                    {"title": "Cancel", "payload": "/deny"}
                ]
            )
        
        return [SlotSet("pending_action", "action_clear_cart")]

class ActionUpdateCartQuantity(Action):
    """Update quantity of items in cart"""
    
    def name(self) -> Text:
        return "action_update_cart_quantity"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        user_id = tracker.get_slot("user_id")
        
        if not user_id or not isinstance(user_id, str) or not user_id.isdigit():
            dispatcher.utter_message(text="You need to log in to manage your cart.")
            return [FollowupAction("action_prompt_login")]
        
        user_text = tracker.latest_message.get("text", "").strip().lower()
        
        # Parse "change item 1 to 3" or "make it 5"
        match = re.search(r"(?:item\s+)?(\d+)(?:\s+to\s+|\s+)(\d+)", user_text)
        
        if match:
            item_number = int(match.group(1))
            new_quantity = int(match.group(2))
            
            # Get cart items
            recent_cart_json = tracker.get_slot("recent_cart_items")
            
            if recent_cart_json:
                try:
                    cart_items = json.loads(recent_cart_json)
                    
                    if 1 <= item_number <= len(cart_items):
                        item = cart_items[item_number - 1]
                        cart_id = item.get("id")
                        
                        # Call update API (you'll need to implement this)
                        url = "https://stageshipperapi.thedelivio.com/api/update-cart-quantity"
                        payload = {
                            "user_id": user_id,
                            "cart_id": cart_id,
                            "quantity": new_quantity
                        }
                        
                        response = requests.post(url, json=payload, timeout=8)
                        data = response.json()
                        
                        if response.status_code == 200 and data.get("status") == 1:
                            dispatcher.utter_message(
                                text=f"✅ Updated quantity to {new_quantity}!"
                            )
                            return [FollowupAction("action_view_cart")]
                        else:
                            dispatcher.utter_message(text="❌ Could not update quantity.")
                            return []
                
                except Exception as e:
                    print(f"[ERROR] Updating quantity: {e}")
        
        # If no match, show instructions
        dispatcher.utter_message(
            text="To update quantity, say:\n"
                 "• 'change item 1 to 3'\n"
                 "• 'make it 5'\n"
                 "• 'set item 2 to 10'"
        )
        return []


class ActionUndoCartAction(Action):
    """Undo last cart modification"""
    
    def name(self) -> Text:
        return "action_undo_cart_action"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        # Get last action from tracker
        last_action = None
        for event in reversed(tracker.events):
            if event.get("event") == "action":
                action_name = event.get("name")
                if action_name in ["action_remove_from_cart", "action_clear_cart"]:
                    last_action = action_name
                    break
        
        if last_action == "action_remove_from_cart":
            dispatcher.utter_message(
                text="⚠️ Undo is not yet supported. Please re-add the item from the product list."
            )
        elif last_action == "action_clear_cart":
            dispatcher.utter_message(
                text="⚠️ Cannot undo full cart clear. Please add items again."
            )
        else:
            dispatcher.utter_message(text="Nothing to undo.")
        
        return []


class ActionSaveCartForLater(Action):
    """Save cart for later (placeholder for future feature)"""
    
    def name(self) -> Text:
        return "action_save_cart_for_later"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        user_id = tracker.get_slot("user_id")
        
        if not user_id:
            dispatcher.utter_message(text="Please log in to save your cart.")
            return [FollowupAction("action_prompt_login")]
        
        # For now, just acknowledge
        dispatcher.utter_message(
            text="💾 **Cart saved!**\n\n"
                 "Your items are saved and will be here when you return.\n\n"
                 "Note: This is a temporary save for this session.",
            buttons=[
                {"title": "🛍️ Continue Shopping", "payload": "/show_categories"},
                {"title": "📍 Find Stores", "payload": "find stores"}
            ]
        )
        
        return []


class ActionDetectStoreContext(Action):
    """
    Detect if this is a store-specific bot or marketplace bot
    Runs at conversation start
    """
    
    def name(self) -> Text:
        return "action_detect_store_context"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        print("[STORE DETECTION] Starting store context detection...")

        store_id = None
        store_name = None
        catalog_id = None
        is_dedicated_bot = False

        # Get existing slots (for comparison)
        existing_store_id = tracker.get_slot("store_id")
        existing_catalog_id = tracker.get_slot("catalog_id")
        print(f"🔍 DEBUG: Existing slot store_id = '{existing_store_id}'")
        print(f"🔍 DEBUG: Existing slot catalog_id = '{existing_catalog_id}'")

        # Method 1: Check metadata FIRST (fresh data from connector/widget)
        metadata = tracker.latest_message.get("metadata", {})
        print(f"🔍 DEBUG: Full metadata from tracker = {metadata}")

        # Check if connector already set store info in metadata
        if metadata.get("store_id"):
            store_id = str(metadata.get("store_id"))
            store_name = metadata.get("store_name")
            catalog_id = metadata.get("catalog_id")
            is_dedicated_bot = metadata.get("is_dedicated_bot", True)
            print(f"✅ [STORE DETECTION] Store from metadata: {store_name} (ID: {store_id}, catalog: {catalog_id})")

            # Check if different from cached
            if existing_store_id and existing_store_id != store_id:
                print(f"⚠️ [STORE DETECTION] Store changed! {existing_store_id} → {store_id}")

        # Method 2: If not in metadata, try WhatsApp phone detection
        if not store_id:
            input_channel = tracker.get_latest_input_channel()
            sender_id = tracker.sender_id

            print(f"🔍 DEBUG: input_channel = '{input_channel}'")
            print(f"🔍 DEBUG: sender_id = '{sender_id}'")

            if input_channel in ["twilio_whatsapp", "whatsapp_business"] and sender_id:
                print(f"[STORE DETECTION] WhatsApp channel detected, sender: {sender_id}")

                bot_phone = metadata.get("bot_phone_number")
                print(f"🔍 DEBUG: bot_phone from metadata = '{bot_phone}'")

                if bot_phone:
                    print(f"🔍 DEBUG: Calling get_store_from_phone('{bot_phone}')")
                    store_info = get_store_from_phone(bot_phone)
                    print(f"🔍 DEBUG: get_store_from_phone returned: {store_info}")

                    if store_info:
                        store_id = store_info.get("store_id")
                        store_name = store_info.get("store_name")
                        catalog_id = store_info.get("catalog_id")
                        is_dedicated_bot = True
                        print(f"✅ [STORE DETECTION] WhatsApp store bot: {store_name} (ID: {store_id}, catalog: {catalog_id})")
                    else:
                        print("⚠️ [STORE DETECTION] WhatsApp marketplace bot (no store mapping)")
                else:
                    print("⚠️ [STORE DETECTION] No bot_phone_number in metadata!")

        # Method 3: If still not found, use cached slots if available
        if not store_id and existing_store_id:
            store_id = existing_store_id
            store_name = tracker.get_slot("store_name")
            catalog_id = existing_catalog_id
            is_dedicated_bot = tracker.get_slot("is_dedicated_bot")
            print(f"✅ [STORE DETECTION] Using cached slots: {store_name} (ID: {store_id}, catalog: {catalog_id})")
            return []  # No need to update slots

        # Method 4: Marketplace bot (default)
        if not store_id:
            print("[STORE DETECTION] Marketplace bot (no store context)")
            is_dedicated_bot = False

        # Set/update slots
        events = [
            SlotSet("store_id", store_id),
            SlotSet("store_name", store_name),
            SlotSet("catalog_id", catalog_id),
            SlotSet("is_dedicated_bot", is_dedicated_bot)
        ]

        print(f"[STORE DETECTION] Final: store_id={store_id}, catalog_id={catalog_id}, is_dedicated={is_dedicated_bot}")

        return events

class ActionShowStoreProducts(Action):
    """Show products for a specific store (dedicated store bots)"""
    
    def name(self) -> Text:
        return "action_show_store_products"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[EventType]:
        try:
            print("[STORE PRODUCTS] ========== ACTION STARTED ==========")
            # Get store context
            store_id = tracker.get_slot("store_id")
            store_name = tracker.get_slot("store_name")
            catalog_id = tracker.get_slot("catalog_id")
            is_dedicated_bot = tracker.get_slot("is_dedicated_bot")
            input_channel = tracker.get_latest_input_channel()

            print(f"[STORE PRODUCTS] 🔍 Slots:")
            print(f"[STORE PRODUCTS]   - store_id: {store_id}")
            print(f"[STORE PRODUCTS]   - store_name: {store_name}")
            print(f"[STORE PRODUCTS]   - catalog_id: {catalog_id}")
            print(f"[STORE PRODUCTS]   - is_dedicated: {is_dedicated_bot}")
            print(f"[STORE PRODUCTS]   - channel: {input_channel}")
            
            if not is_dedicated_bot or not store_id:
                print(f"[STORE PRODUCTS] ❌ ERROR: No store context! is_dedicated={is_dedicated_bot}, store_id={store_id}")
                dispatcher.utter_message(text="Please select a store first.")
                return []
            
            # Fetch products for this store
            search_endpoint = f"{API_BASE}/getMasterProducts"
            payload = {
                "wh_account_id": str(store_id),
                "upc": "",
                "ai_category_id": "",
                "ai_product_id": "",
                "product_id": "",
                "search_string": "",
                "zipcode": "",
                "user_id": "",
                "page": "1",
                "items": "20"
            }
            
            print(f"[STORE PRODUCTS] 🔍 API REQUEST:")
            print(f"[STORE PRODUCTS] URL: {search_endpoint}")
            print(f"[STORE PRODUCTS] Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(search_endpoint, json=payload, timeout=10)
            
            print(f"[STORE PRODUCTS] 📡 API RESPONSE:")
            print(f"[STORE PRODUCTS] Status Code: {response.status_code}")
            print(f"[STORE PRODUCTS] Raw Response: {response.text[:500]}")  # ✅ CRITICAL: See raw response
            
            response.raise_for_status()
            data = response.json()
            
            print(f"[STORE PRODUCTS] Parsed JSON: {json.dumps(data, indent=2)[:1000]}")  # ✅ CRITICAL
            
            # Parse products
            products = []
            if isinstance(data, dict):
                api_data = data.get("data", {})
                print(f"[STORE PRODUCTS] data type: {type(api_data)}")
                
                if isinstance(api_data, dict):
                    products = api_data.get("getMasterProducts", [])
                    print(f"[STORE PRODUCTS] Found in getMasterProducts: {len(products)}")
                elif isinstance(api_data, list):
                    products = api_data
                    print(f"[STORE PRODUCTS] data is list: {len(products)}")
            elif isinstance(data, list):
                products = data
                print(f"[STORE PRODUCTS] Top-level list: {len(products)}")
            
            print(f"[STORE PRODUCTS] ✅ FINAL: {len(products)} products found")
            
            if len(products) > 0:
                print(f"[STORE PRODUCTS] Sample product: {json.dumps(products[0], indent=2)}")
            
            if not products:
                dispatcher.utter_message(
                    text=f"Sorry, no products are currently available at {store_name}. Please check back later!",
                    buttons=[
                        {"title": "🔄 Refresh", "payload": "/browse_store_products"},  # ✅ Use intent
                        {"title": "🛒 View Cart", "payload": "/view_cart"}
                    ]
                )
                # ✅ ADD THIS LINE TO CLEAR THE SLOT
                return [SlotSet("recent_products", None)]

            # Detect if WhatsApp to use List Message
            input_channel = tracker.get_latest_input_channel()
            is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

            if is_whatsapp:
                # ⭐ NEW: Build Native WhatsApp Product List
                # This requires IDs to match your Catalog exactly!
                
                product_items = []
                for p in products[:30]:  # WhatsApp allows max 30 items
                    # Get ID (Must match what you sent in sync_catalog.py)
                    raw_id = p.get("product_id") or p.get("ai_product_id")
                    if raw_id:
                        product_items.append({
                            "product_retailer_id": str(raw_id).strip()
                        })

                if product_items and catalog_id:
                    print(f"[STORE PRODUCTS] ✅ Sending native WhatsApp product list with {len(product_items)} items")
                    print(f"[STORE PRODUCTS] Catalog ID: {catalog_id}")
                    print(f"[STORE PRODUCTS] Sample product IDs: {[item['product_retailer_id'] for item in product_items[:3]]}")

                    # Send the native catalog message
                    # Note: Don't show item count as API count may differ from actual WhatsApp catalog count
                    dispatcher.utter_message(
                        json_message={
                            "type": "product_list",  # Matches connector logic
                            "catalog_id": catalog_id,  # ⭐ DYNAMIC CATALOG ID FROM SLOT
                            "header": f"{store_name} Menu",
                            "body": "Browse our products below and add to cart!",
                            "sections": [
                                {
                                    "title": "Available Products",
                                    "product_items": product_items
                                }
                            ]
                        }
                    )
                    print(f"[STORE PRODUCTS] ✅ Product list message sent successfully")
                elif product_items and not catalog_id:
                    # No catalog linked - show text list instead
                    print(f"[STORE PRODUCTS] ⚠️ No catalog_id for store, using text fallback")
                    product_lines = []
                    for idx, p in enumerate(products[:10], start=1):
                        title = p.get("title") or p.get("product_name", "Unnamed Product")
                        try:
                            price = float(p.get("discounted_price", 0) or p.get("product_price", 0))
                            price_str = f"${price:.2f}"
                        except (ValueError, TypeError):
                            price_str = "-"
                        product_lines.append(f"{idx}. {title} ({price_str})")

                    message = f"🛍️ **Products at {store_name}:**\n\n" + "\n".join(product_lines)
                    dispatcher.utter_message(text=message)
                else:
                    print(f"[STORE PRODUCTS] ⚠️ No product items to send (products found but no valid IDs)")
                    dispatcher.utter_message(text="Found products, but they don't seem linked to our WhatsApp catalog yet.")
            else:
                # Web widget - show simple list
                product_lines = []
                for idx, p in enumerate(products[:10], start=1):
                    title = p.get("title") or p.get("product_name", "Unnamed Product")
                    try:
                        price = float(p.get("discounted_price", 0) or p.get("product_price", 0))
                        price_str = f"${price:.2f}"
                    except (ValueError, TypeError):
                        price_str = "-"

                    discount = p.get("discount")
                    try:
                        qty = float(p.get("quantity", 0))
                        ordered = float(p.get("ordered_qty", 0))
                        available = int(qty - ordered)
                    except (ValueError, TypeError):
                        available = None

                    extras = []
                    if discount and float(discount) > 0:
                        extras.append(f"{discount}% off")
                    if available is not None:
                        extras.append(f"{available} available")

                    extra_info = f" [{' | '.join(extras)}]" if extras else ""
                    product_lines.append(f"{idx}. {title} ({price_str}){extra_info}")

                message = f"🛍️ **Products at {store_name}:**\n\n" + "\n".join(product_lines)
                message += "\n\n➡️ Reply with the product number to see details."

                dispatcher.utter_message(text=message)
            
            return [
                SlotSet("recent_products", json.dumps(products[:10])),
                SlotSet("store_context", False) # ✅ ADD THIS LINE
            ]
            
        except Exception as e:
            print(f"[STORE PRODUCTS] ❌❌❌ EXCEPTION in ActionShowStoreProducts ❌❌❌")
            print(f"[STORE PRODUCTS] Error type: {type(e).__name__}")
            print(f"[STORE PRODUCTS] Error message: {e}")
            import traceback
            print(f"[STORE PRODUCTS] Full traceback:")
            traceback.print_exc()
            dispatcher.utter_message(text=f"Sorry, I couldn't fetch products right now. Error: {str(e)[:100]}")
            return []
            
class ActionRestart(Action):
    """Reset all slots and restart conversation"""
    
    def name(self) -> Text:
        return "action_restart"
    
    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:
        
        # Detect channel
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]
        
        # ✅ Show appropriate restart message based on channel
        if is_whatsapp:
            # Use ONLY json_message for WhatsApp to avoid duplicate messages
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "🔄 Restarting...\n\n👋 Hi! I'm your shopping assistant. How can I help?",
                    "buttons": [
                        {"id": "browse_products", "title": "🛍️ Browse Products"},
                        {"id": "find_stores", "title": "📍 Find Stores"},
                        {"id": "login", "title": "🔐 Login"}
                    ]
                }
            )
        else:
            dispatcher.utter_message(
                text="🔄 Restarting conversation...\n\n"
                     "👋 Hi! I'm your AnythingInstantly Shop Bot. How can I assist you today?",
                buttons=[
                    {"title": "Browse Categories", "payload": "Show Categories"},
                    {"title": "Find Stores", "payload": "Find Stores Near Me"},
                    {"title": "Login", "payload": "login"}
                ]
            )
        
        # Clear ALL slots - DON'T trigger followup action
        return [
            SlotSet("user_id", None),
            SlotSet("recent_products", None),
            SlotSet("selected_product", None),
            SlotSet("zipcode", None),
            SlotSet("selected_store", None),
            SlotSet("stores_list", None),
            SlotSet("login_step", None),
            SlotSet("login_phone", None),
            SlotSet("login_password", None),
            SlotSet("has_been_greeted", True),  # ✅ Mark as greeted to avoid double greeting
            SlotSet("store_context", False),
            SlotSet("search_page", None),
            SlotSet("last_search_string", None),
            SlotSet("stripe_session_id", None),
            SlotSet("payment_amount", None),
            SlotSet("pending_action", None),
            SlotSet("pending_query", None),
            SlotSet("last_zipcode", None)
            # ✅ NO FollowupAction - we already sent the greeting above
        ]


# =============================================================================
# ⭐ WHATSAPP NATIVE CART CHECKOUT FLOW (Optimal 3-4 Step Flow)
# =============================================================================

def _parse_whatsapp_address(address_text: str) -> Dict[str, str]:
    """
    Parse WhatsApp location address string to extract components.

    WhatsApp address format examples:
    - "11A, 2nd Cross Rd, Bengaluru, 560037, KA, IN"
    - "123 Main St, New York, 10001, NY, US"
    - "Some Location Name" (simple format)

    Returns dict with: address, city, state, zip_code, country
    """
    result = {
        "address": address_text,
        "city": "",
        "state": "NA",  # Default to NA if not found (API requires non-empty)
        "zip_code": "",
        "country": "United States"
    }

    if not address_text:
        return result

    # Split by comma and clean up
    parts = [p.strip() for p in address_text.split(",")]

    if len(parts) >= 4:
        # Full address format: "Street, City, ZIP, State, Country"
        # or "Street, City, State ZIP, Country"

        # Check last part for country code
        last_part = parts[-1].upper()
        country_map = {
            "IN": "India",
            "US": "United States",
            "USA": "United States",
            "UK": "United Kingdom",
            "GB": "United Kingdom",
            "CA": "Canada",
            "AU": "Australia"
        }

        if last_part in country_map:
            result["country"] = country_map[last_part]
            parts = parts[:-1]  # Remove country from parts

        # Check second-to-last for state code (2 letters)
        if len(parts) >= 2:
            potential_state = parts[-1].upper().strip()
            if len(potential_state) == 2 and potential_state.isalpha():
                result["state"] = potential_state
                parts = parts[:-1]

        # Check for ZIP code (digits only or digit-letter mix)
        for i, part in enumerate(reversed(parts)):
            clean_part = part.replace(" ", "").replace("-", "")
            if clean_part.isdigit() and 4 <= len(clean_part) <= 10:
                result["zip_code"] = part.strip()
                parts = parts[:-(i+1)] if i > 0 else parts[:-1]
                break
            elif len(clean_part) >= 5 and any(c.isdigit() for c in clean_part):
                # Could be alphanumeric ZIP like "SW1A 1AA" (UK) or "560037"
                if i < len(parts) - 1:  # Not the first part
                    result["zip_code"] = part.strip()
                    parts = parts[:-(i+1)] if i > 0 else parts[:-1]
                    break

        # City is typically the second-to-last meaningful part
        if len(parts) >= 2:
            result["city"] = parts[-1].strip()
            result["address"] = ", ".join(parts[:-1])
        elif len(parts) == 1:
            result["address"] = parts[0].strip()

    elif len(parts) == 3:
        # Short format: "Street, City, State" or "Location, City, State"
        result["address"] = parts[0].strip()
        result["city"] = parts[1].strip()
        potential_state = parts[2].strip().upper()
        if len(potential_state) <= 3:
            result["state"] = potential_state
        else:
            result["city"] = parts[2].strip()

    elif len(parts) == 2:
        result["address"] = parts[0].strip()
        result["city"] = parts[1].strip()

    # Ensure state is never empty (API requires it)
    if not result["state"]:
        result["state"] = "NA"

    print(f"[ADDRESS PARSE] Input: '{address_text}'")
    print(f"[ADDRESS PARSE] Result: {result}")

    return result


class ActionHandleWhatsAppNativeOrder(Action):
    """
    Handle native WhatsApp cart checkout when user clicks "Place order".

    Flow:
    1. Receive order items from WhatsApp native cart
    2. Check if user exists by phone number
    3a. If EXISTS → Show saved address → Confirm → Pay (3 steps)
    3b. If NEW → Auto-register → Ask for address → Confirm → Pay (4 steps)
    """

    def name(self) -> Text:
        return "action_handle_whatsapp_native_order"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[NATIVE ORDER] ========== WHATSAPP NATIVE ORDER RECEIVED ==========")

        events = []

        # Get sender phone number (WhatsApp ID)
        sender_id = tracker.sender_id
        phone = sender_id

        # Clean phone number
        if phone:
            phone = re.sub(r'[^0-9+]', '', phone)
            # Remove leading + for API compatibility if needed
            phone_for_api = phone.lstrip('+')
        else:
            dispatcher.utter_message(text="Sorry, I couldn't identify your phone number. Please try again.")
            return []

        print(f"[NATIVE ORDER] Customer phone: {phone}")

        # Get order items from metadata
        metadata = tracker.latest_message.get("metadata", {})
        order_items = metadata.get("order_items", [])
        total_items = metadata.get("order_total_items", 0)
        total_amount = metadata.get("order_total_amount", 0)
        catalog_id = metadata.get("catalog_id", "")

        # Get store_id from metadata or slot (no hardcoded fallback)
        store_id = metadata.get("store_id") or tracker.get_slot("store_id")
        store_name = metadata.get("store_name") or tracker.get_slot("store_name") or "Store"
        events.append(SlotSet("store_id", store_id))
        events.append(SlotSet("store_name", store_name))

        print(f"[NATIVE ORDER] Store: {store_name} (ID: {store_id})")
        print(f"[NATIVE ORDER] Items: {total_items}, Total: ${total_amount:.2f}")
        print(f"[NATIVE ORDER] Order items: {json.dumps(order_items, indent=2)}")

        if not order_items:
            dispatcher.utter_message(text="Sorry, I couldn't read your cart items. Please try again.")
            return []

        # Store order items in slot for later use
        events.append(SlotSet("whatsapp_order_items", json.dumps(order_items)))
        events.append(SlotSet("whatsapp_order_total", total_amount))

        # ===== STEP 1: CHECK IF USER EXISTS BY PHONE =====
        try:
            print(f"[NATIVE ORDER] Checking user by phone: {phone_for_api}")

            # Use enhanced phone lookup that tries multiple formats
            user_data = self._lookup_user_by_phone(phone_for_api)

            print(f"[NATIVE ORDER] User lookup response status: {user_data.get('status')}, has_data: {bool(user_data.get('data'))}")
            print(f"[NATIVE ORDER] Full response: {user_data}")

            if user_data.get("status") == 1 and user_data.get("data"):
                print(f"[NATIVE ORDER] ✅ User lookup SUCCESS - going to fast checkout")
                # ===== USER EXISTS - FAST CHECKOUT =====
                user_info = user_data.get("data", {})
                user_id = str(user_info.get("user_id"))
                user_name = user_info.get("name", "there")
                default_address = user_info.get("default_address")

                print(f"[NATIVE ORDER] ✅ User found: {user_name} (ID: {user_id})")

                # Set user as logged in
                events.append(SlotSet("user_id", user_id))
                events.append(SlotSet("checkout_step", "confirm_address"))

                # Sync WhatsApp cart to backend
                sync_result = self._sync_cart_to_backend(user_id, order_items, tracker)
                if not sync_result["success"]:
                    print(f"[NATIVE ORDER] ⚠️ Cart sync warning: {sync_result['message']}")

                # ⭐ Use backend cart totals for accurate pricing
                cart_totals = sync_result.get("cart_totals", {})
                sub_total = cart_totals.get("sub_total_amount", 0)
                discount_amount = cart_totals.get("discount_amount", 0)
                discounted_price = cart_totals.get("discounted_price", 0)
                coupon_discount = cart_totals.get("coupon_discount", 0)
                tax = cart_totals.get("tax", 0)
                delivery_fee = cart_totals.get("delivery_fee", 0)
                platform_fee = cart_totals.get("platform_fee", 0)
                backend_total = cart_totals.get("total", 0)

                # Build order summary with product details (for display)
                order_summary = self._build_order_summary(order_items, total_amount, tracker, return_total=False)

                # Build pricing breakdown - show full details
                display_subtotal = discounted_price if discounted_price > 0 else total_amount
                print(f"[NATIVE ORDER] Original: ${sub_total:.2f}, Discounts: -${discount_amount:.2f}, "
                      f"After discount: ${discounted_price:.2f}, Tax: ${tax:.2f}, Total: ${backend_total:.2f}")

                # Build detailed pricing text
                pricing_lines = []
                pricing_lines.append(f"💰 Subtotal: ${display_subtotal:.2f}")
                if discount_amount > 0:
                    pricing_lines.append(f"🏷️ _You save ${discount_amount:.2f}!_")
                if coupon_discount > 0:
                    pricing_lines.append(f"🎟️ Coupon: -${coupon_discount:.2f}")
                if tax > 0:
                    pricing_lines.append(f"📋 Tax: ${tax:.2f}")
                if delivery_fee > 0:
                    pricing_lines.append(f"🚚 Delivery: ${delivery_fee:.2f}")
                if platform_fee > 0:
                    pricing_lines.append(f"🏪 Platform Fee: ${platform_fee:.2f}")
                if backend_total > 0:
                    pricing_lines.append(f"\n*💵 Total: ${backend_total:.2f}*")
                else:
                    pricing_lines.append(f"\n_(Final total with tax at checkout)_")

                pricing_text = "\n".join(pricing_lines)

                if default_address:
                    # User has a saved address - show it
                    addr = default_address
                    address_text = (
                        f"📍 *{addr.get('address_name', 'Saved Address')}*\n"
                        f"{addr.get('full_address', addr.get('address', ''))}"
                    )

                    msg_text = f"👋 Hi {user_name}!\n\n📦 Your Order:\n{order_summary}\n\n{pricing_text}\n\n🚚 Deliver to:\n{address_text}"

                    # Use ONLY json_message for WhatsApp to avoid duplicate messages
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": msg_text,
                            "buttons": [
                                {"id": "confirm_order_pay", "title": "✅ Confirm & Pay"},
                                {"id": "apply_promo_code", "title": "🎟️ Apply Promo Code"},
                                {"id": "change_address", "title": "📍 Different Address"}
                            ]
                        }
                    )

                    events.append(SlotSet("delivery_address_id", str(addr.get("address_id"))))
                    events.append(SlotSet("delivery_address", json.dumps(addr)))

                else:
                    # User exists but no saved address
                    msg_text = f"👋 Hi {user_name}!\n\n📦 Your Order:\n{order_summary}\n\n{pricing_text}\n\n📍 Please share your delivery address:"

                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": msg_text,
                            "buttons": [
                                {"id": "share_location", "title": "📍 Share Location"},
                                {"id": "type_address", "title": "✏️ Type Address"}
                            ]
                        }
                    )
                    events.append(SlotSet("checkout_step", "awaiting_address"))

            else:
                # ===== NEW USER - AUTO-REGISTER =====
                print(f"[NATIVE ORDER] 🆕 New user, auto-registering...")

                # Detect country code from phone number and extract phone without country code
                country_code = "+1"  # Default USA
                phone_without_country = phone_for_api  # Default: use full number

                if phone_for_api.startswith("91") and len(phone_for_api) >= 12:
                    country_code = "+91"  # India
                    phone_without_country = phone_for_api[2:]  # Remove "91" prefix
                elif phone_for_api.startswith("44") and len(phone_for_api) >= 11:
                    country_code = "+44"  # UK
                    phone_without_country = phone_for_api[2:]  # Remove "44" prefix
                elif phone_for_api.startswith("1") and len(phone_for_api) == 11:
                    country_code = "+1"  # USA/Canada
                    phone_without_country = phone_for_api[1:]  # Remove "1" prefix

                print(f"[NATIVE ORDER] Detected country code: {country_code}, phone without country: {phone_without_country}")

                # Auto-register guest user - send phone WITHOUT country code
                register_payload = {
                    "phone": phone_without_country,
                    "name": "WhatsApp Customer",
                    "country_code": country_code
                }
                print(f"[NATIVE ORDER] Guest register request: {register_payload}")

                register_response = requests.post(
                    f"{API_BASE}/guest-register",
                    json=register_payload,
                    timeout=10
                )
                register_data = register_response.json()

                print(f"[NATIVE ORDER] Guest register response: {register_data}")

                if register_data.get("status") == 1:
                    new_user = register_data.get("data", {})
                    user_id = str(new_user.get("user_id"))
                    is_new = new_user.get("is_new", True)

                    print(f"[NATIVE ORDER] ✅ User created/found: ID {user_id}, is_new: {is_new}")

                    events.append(SlotSet("user_id", user_id))
                    events.append(SlotSet("checkout_step", "awaiting_name"))
                    events.append(SlotSet("is_guest_user", True))

                    # Sync cart to backend
                    sync_result = self._sync_cart_to_backend(user_id, order_items, tracker)

                    # ⭐ Use backend cart totals for accurate pricing
                    cart_totals = sync_result.get("cart_totals", {})
                    discount_amount = cart_totals.get("discount_amount", 0)
                    discounted_price = cart_totals.get("discounted_price", 0)
                    tax = cart_totals.get("tax", 0)
                    delivery_fee = cart_totals.get("delivery_fee", 0)
                    platform_fee = cart_totals.get("platform_fee", 0)
                    backend_total = cart_totals.get("total", 0)

                    # Build order summary with product details (for display)
                    order_summary = self._build_order_summary(order_items, total_amount, tracker, return_total=False)

                    # Use discounted_price (after product discounts) as subtotal display
                    display_subtotal = discounted_price if discounted_price > 0 else total_amount
                    print(f"[NATIVE ORDER] Discounted price: ${discounted_price:.2f}, Discount: -${discount_amount:.2f}, Total: ${backend_total:.2f}")

                    # Build detailed pricing text
                    pricing_lines = []
                    pricing_lines.append(f"💰 Subtotal: ${display_subtotal:.2f}")
                    if discount_amount > 0:
                        pricing_lines.append(f"🏷️ _You save ${discount_amount:.2f}!_")
                    if tax > 0:
                        pricing_lines.append(f"📋 Tax: ${tax:.2f}")
                    if delivery_fee > 0:
                        pricing_lines.append(f"🚚 Delivery: ${delivery_fee:.2f}")
                    if platform_fee > 0:
                        pricing_lines.append(f"🏪 Platform Fee: ${platform_fee:.2f}")
                    if backend_total > 0:
                        pricing_lines.append(f"\n*💵 Total: ${backend_total:.2f}*")
                    else:
                        pricing_lines.append(f"\n_(Delivery fee added after address)_")

                    pricing_text = "\n".join(pricing_lines)

                    msg_text = f"📦 Your Order:\n{order_summary}\n\n{pricing_text}\n\nTo deliver your order, please share:\n\n📍 Your delivery location:"

                    # Use ONLY json_message for WhatsApp to avoid duplicate messages
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": msg_text,
                            "buttons": [
                                {"id": "share_location", "title": "📍 Share Location"},
                                {"id": "type_address", "title": "✏️ Type Address"}
                            ]
                        }
                    )
                    events.append(SlotSet("checkout_step", "awaiting_address"))

                else:
                    # Guest registration failed - log details
                    print(f"[NATIVE ORDER] ❌ Guest registration FAILED!")
                    print(f"[NATIVE ORDER] ❌ Response: {register_data}")
                    error_msg = register_data.get("message", "Registration failed")
                    print(f"[NATIVE ORDER] ❌ Error message: {error_msg}")

                    dispatcher.utter_message(
                        text="Sorry, I couldn't process your order right now. Please try again or contact support."
                    )
                    return []

        except Exception as e:
            print(f"[NATIVE ORDER] ❌ Exception Error: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(
                text="Sorry, something went wrong. Please try again or type 'help' for assistance."
            )
            return []

        return events

    def _build_order_summary(self, order_items: List[Dict], total_amount: float, tracker: Tracker = None, return_total: bool = False):
        """Build a text summary of order items with product names and proper pricing

        Shows: ~~$original~~ discount% → $discounted_price

        Args:
            return_total: If True, returns tuple (summary_text, calculated_total)
        """
        lines = []
        calculated_total = 0.0

        # Get store_id for product lookup
        store_id = None
        if tracker:
            store_id = tracker.get_slot("store_id")
        print(f"[ORDER SUMMARY] Using store_id: {store_id}")

        # Fetch all products once to avoid multiple API calls
        product_cache = self._fetch_store_products(store_id)

        for i, item in enumerate(order_items, 1):
            product_id = str(item.get("product_retailer_id", "Unknown"))
            quantity = item.get("quantity", 1)

            # Get product info from cache (now contains full pricing)
            product_info = product_cache.get(product_id)

            if product_info and isinstance(product_info, dict):
                product_name = product_info.get("name", f"Item #{product_id}")
                original_price = product_info.get("original_price", 0)
                discount_percent = product_info.get("discount_percent", 0)
                discounted_price = product_info.get("discounted_price", original_price)

                # Calculate line total using discounted price
                line_total = discounted_price * quantity
                calculated_total += line_total

                # Format price display
                if discount_percent > 0 and original_price > discounted_price:
                    # Show: ~~$999~~ 99% OFF → $9.99
                    price_display = f"~${original_price:.2f}~ {discount_percent:.0f}% OFF → *${discounted_price:.2f}*"
                else:
                    price_display = f"${discounted_price:.2f}"

                lines.append(f"  {i}. {product_name} x{quantity} - {price_display}")
            else:
                # Fallback if product not in cache (use WhatsApp price)
                whatsapp_price = float(item.get("item_price", 0))
                product_name = product_info if isinstance(product_info, str) else f"Item #{product_id}"
                lines.append(f"  {i}. {product_name} x{quantity} - ${whatsapp_price * quantity:.2f}")
                calculated_total += whatsapp_price * quantity

        summary_text = "\n".join(lines) if lines else "Items from your cart"

        if return_total:
            return summary_text, calculated_total
        return summary_text

    def _fetch_store_products(self, store_id: str) -> Dict[str, Dict]:
        """Fetch all products from a store and return as id -> product info mapping

        Returns dict with product_id -> {name, original_price, discount_percent, discounted_price}
        """
        product_cache = {}
        try:
            print(f"[PRODUCT CACHE] ========== FETCHING PRODUCTS ==========")
            print(f"[PRODUCT CACHE] Store ID: {store_id}")

            # Use the correct API parameters (wh_account_id, not store_id)
            payload = {
                "wh_account_id": str(store_id),
                "upc": "",
                "ai_category_id": "",
                "ai_product_id": "",
                "product_id": "",
                "search_string": "",
                "zipcode": "",
                "user_id": "",
                "page": "1",
                "items": "50"
            }

            response = requests.post(
                f"{API_BASE}/getMasterProducts",
                json=payload,
                timeout=10
            )

            print(f"[PRODUCT CACHE] HTTP Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"[PRODUCT CACHE] API status: {data.get('status')}")

                # Products are in data.data.getMasterProducts
                products = []
                api_data = data.get("data", {})

                if isinstance(api_data, dict):
                    products = api_data.get("getMasterProducts", [])
                    if not products:
                        products = api_data.get("products", [])
                elif isinstance(api_data, list):
                    products = api_data

                print(f"[PRODUCT CACHE] Found {len(products)} products")

                if products:
                    print(f"[PRODUCT CACHE] First product sample: {products[0]}")

                for product in products:
                    # Try multiple ID fields - use SAME order as WhatsApp catalog builder:
                    pid = str(product.get("product_id") or product.get("ai_product_id") or product.get("id") or "")
                    # Try multiple name fields
                    name = product.get("title") or product.get("name") or product.get("product_name") or f"Item #{pid}"

                    # Get pricing info
                    original_price = float(product.get("product_price", 0) or 0)
                    discount_percent = float(product.get("discount", 0) or 0)
                    discounted_price = float(product.get("discounted_price", 0) or 0)

                    # If no discounted_price but has discount, calculate it
                    if original_price > 0 and discount_percent > 0 and discounted_price == 0:
                        discounted_price = original_price * (1 - discount_percent / 100)

                    if pid:
                        product_info = {
                            "name": name,
                            "original_price": original_price,
                            "discount_percent": discount_percent,
                            "discounted_price": discounted_price if discounted_price > 0 else original_price
                        }
                        product_cache[pid] = product_info
                        # Also cache by ai_product_id if different (for fallback)
                        ai_pid = str(product.get("ai_product_id") or "")
                        if ai_pid and ai_pid != pid:
                            product_cache[ai_pid] = product_info

                print(f"[PRODUCT CACHE] Cached products: {list(product_cache.keys())}")
            else:
                print(f"[PRODUCT CACHE] HTTP Error: {response.text[:200]}")

        except Exception as e:
            print(f"[PRODUCT CACHE] ❌ Error: {e}")
            import traceback
            traceback.print_exc()

        print(f"[PRODUCT CACHE] Total cached: {len(product_cache)} products")
        return product_cache

    def _get_product_name(self, product_id: str, store_id: str = None) -> str:
        """Fetch product name from API by product ID"""
        try:
            print(f"[PRODUCT LOOKUP] Looking up product {product_id} in store {store_id}")
            response = requests.post(
                f"{API_BASE}/getMasterProducts",
                json={"store_id": store_id},
                timeout=5
            )

            if response.status_code == 200:
                data = response.json()
                products = data.get("data", {}).get("products", [])
                print(f"[PRODUCT LOOKUP] Found {len(products)} products in response")

                # Search for matching product
                for product in products:
                    if str(product.get("id")) == str(product_id):
                        name = product.get("title") or product.get("name") or f"Product #{product_id}"
                        print(f"[PRODUCT LOOKUP] ✅ Found: {name}")
                        return name

            print(f"[PRODUCT LOOKUP] ⚠️ Product {product_id} not found")
            return f"Item #{product_id}"

        except Exception as e:
            print(f"[PRODUCT LOOKUP] Error fetching product {product_id}: {e}")
            return f"Item #{product_id}"

    def _lookup_user_by_phone(self, phone: str) -> Dict:
        """
        Try to find user by phone number with multiple format attempts.
        WhatsApp sends phone with country code, but DB might store differently.
        IMPORTANT: Try SHORTER formats first to find real accounts before guest accounts!
        """
        print(f"[USER LOOKUP] ========== LOOKING UP USER ==========")
        print(f"[USER LOOKUP] Raw phone input: '{phone}'")

        # Clean the phone number
        clean_phone = re.sub(r'[^0-9]', '', phone)
        print(f"[USER LOOKUP] Cleaned phone: '{clean_phone}' (length: {len(clean_phone)})")

        # Try different phone formats - SHORTER FIRST to find real accounts before guest accounts!
        # Guest accounts are created with full WhatsApp number (918826516009)
        # Real accounts often have shorter numbers (8826516009)
        phone_formats = [
            clean_phone[-10:] if len(clean_phone) >= 10 else None,  # Last 10 digits FIRST (8826516009)
            clean_phone[-9:] if len(clean_phone) >= 9 else None,    # Last 9 digits
            clean_phone[2:] if len(clean_phone) >= 12 else None,    # Remove country code (8826516009)
            clean_phone[1:] if len(clean_phone) >= 11 else None,    # Remove first digit
            clean_phone,                                             # Full number LAST (918826516009)
        ]

        # Remove None and duplicates while preserving order
        phone_formats = [p for p in phone_formats if p and len(p) >= 6]
        phone_formats = list(dict.fromkeys(phone_formats))

        print(f"[USER LOOKUP] Will try these formats (shorter first): {phone_formats}")

        for phone_attempt in phone_formats:
            try:
                print(f"[USER LOOKUP] Trying: '{phone_attempt}'")
                response = requests.post(
                    f"{API_BASE}/user-by-phone",
                    json={"phone": phone_attempt},
                    timeout=10
                )

                print(f"[USER LOOKUP] HTTP status: {response.status_code}")
                data = response.json()
                print(f"[USER LOOKUP] API response: status={data.get('status')}, message={data.get('message')}")

                if data.get("status") == 1 and data.get("data"):
                    user_info = data.get("data", {})
                    print(f"[USER LOOKUP] ✅ SUCCESS! Found user:")
                    print(f"[USER LOOKUP]    Name: {user_info.get('name')}")
                    print(f"[USER LOOKUP]    ID: {user_info.get('user_id')}")
                    print(f"[USER LOOKUP]    Phone in DB: {user_info.get('phone')}")
                    print(f"[USER LOOKUP]    Has address: {bool(user_info.get('default_address'))}")
                    return data

            except Exception as e:
                print(f"[USER LOOKUP] ❌ Error with {phone_attempt}: {e}")
                continue

        print(f"[USER LOOKUP] ❌ USER NOT FOUND with any format!")
        print(f"[USER LOOKUP] Make sure database has a user with phone matching one of: {phone_formats}")
        return {"status": 0, "message": "User not found", "data": None}

    def _send_whatsapp_message(self, dispatcher: CollectingDispatcher, tracker: Tracker,
                                text: str, buttons: List[Dict] = None, header: str = None):
        """
        Send message appropriately for WhatsApp vs Web channels.
        Avoids duplicate messages by using only json_message for WhatsApp with buttons.
        """
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        if is_whatsapp and buttons:
            # WhatsApp with buttons - ONLY send json_message to avoid duplicates
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": text,
                    "buttons": buttons,
                    "header": header
                }
            )
        elif buttons:
            # Web channel with buttons
            dispatcher.utter_message(text=text, buttons=buttons)
        else:
            # Plain text message
            dispatcher.utter_message(text=text)

    def _sync_cart_to_backend(self, user_id: str, order_items: List[Dict], tracker: Tracker) -> Dict:
        """Sync WhatsApp native cart items to backend cart and return cart totals"""
        try:
            print(f"[CART SYNC] Syncing {len(order_items)} items to backend for user {user_id}")

            # Get store_id from tracker - API uses shipper_id
            store_id = tracker.get_slot("store_id")

            # ⭐ IMPORTANT: Clear existing cart first to avoid mixing items from different stores
            # This ensures only the current WhatsApp order items are in the cart
            try:
                print(f"[CART SYNC] Clearing existing cart for user {user_id}...")
                clear_response = requests.post(
                    f"{API_BASE}/destroy-cart",
                    json={"user_id": user_id},
                    timeout=10
                )
                clear_result = clear_response.json()
                print(f"[CART SYNC] Cart cleared: {clear_result.get('status')} - {clear_result.get('message', '')}")
            except Exception as clear_err:
                print(f"[CART SYNC] Warning - couldn't clear cart: {clear_err}")
                # Continue anyway - add items will work

            success_count = 0
            for item in order_items:
                product_retailer_id = item.get("product_retailer_id", "")
                quantity = int(item.get("quantity", 1))

                # The product_retailer_id from WhatsApp is the ai_product_id
                add_payload = {
                    "user_id": user_id,
                    "product_id": product_retailer_id,
                    "quantity": quantity,
                    "shipper_id": store_id  # API requires shipper_id, not store_id!
                }

                print(f"[CART SYNC] Adding: {add_payload}")

                response = requests.post(
                    f"{API_BASE}/add-product-to-cart",
                    json=add_payload,
                    timeout=10
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get("status") == 1:
                        success_count += 1
                        print(f"[CART SYNC] ✅ Added {product_retailer_id}")
                    else:
                        print(f"[CART SYNC] ⚠️ Failed to add {product_retailer_id}: {result}")
                else:
                    print(f"[CART SYNC] ⚠️ HTTP error adding {product_retailer_id}: {response.status_code}")

            # ⭐ After syncing, fetch cart totals from backend for accurate pricing
            # API fields explained:
            # - sub_total_amount: Original prices total (before any discounts)
            # - discount_amount: Total product discounts
            # - discounted_price: After product discounts (sub_total - discount_amount)
            # - coupon_discount: Additional coupon discount
            # - discounted_price_after_coupon: After all discounts
            # - delivery_fee, Platform_Fee, tax: Additional charges
            # - total: Final amount to pay
            cart_totals = {
                "sub_total_amount": 0,
                "discount_amount": 0,
                "discounted_price": 0,
                "coupon_discount": 0,
                "discounted_price_after_coupon": 0,
                "delivery_fee": 0,
                "platform_fee": 0,
                "tax": 0,
                "total": 0
            }
            try:
                print(f"[CART SYNC] Fetching cart totals from backend...")
                cart_response = requests.post(
                    f"{API_BASE}/cart-list",
                    json={"user_id": user_id},
                    timeout=10
                )
                if cart_response.status_code == 200:
                    cart_data = cart_response.json()
                    if cart_data.get("status") == 1:
                        order_meta = cart_data.get("data", {}).get("orderMetaData", {})
                        cart_totals = {
                            "sub_total_amount": float(order_meta.get("sub_total_amount", 0) or 0),
                            "discount_amount": float(order_meta.get("discount_amount", 0) or 0),
                            "discounted_price": float(order_meta.get("discounted_price", 0) or 0),
                            "coupon_discount": float(order_meta.get("coupon_discount", 0) or 0),
                            "discounted_price_after_coupon": float(order_meta.get("discounted_price_after_coupon", 0) or 0),
                            "delivery_fee": float(order_meta.get("delivery_fee", 0) or order_meta.get("total_delivery_charge", 0) or 0),
                            "platform_fee": float(order_meta.get("Platform_Fee", 0) or order_meta.get("platform_fee", 0) or 0),
                            "tax": float(order_meta.get("tax", 0) or 0),
                            "total": float(order_meta.get("total", 0) or 0)
                        }
                        print(f"[CART SYNC] ✅ Backend totals: original=${cart_totals['sub_total_amount']:.2f}, "
                              f"discounts=-${cart_totals['discount_amount']:.2f}, "
                              f"after_discount=${cart_totals['discounted_price']:.2f}, "
                              f"total=${cart_totals['total']:.2f}")
            except Exception as cart_err:
                print(f"[CART SYNC] Warning - couldn't fetch cart totals: {cart_err}")

            return {
                "success": success_count > 0,
                "message": f"Synced {success_count}/{len(order_items)} items",
                "synced_count": success_count,
                "cart_totals": cart_totals
            }

        except Exception as e:
            print(f"[CART SYNC] ❌ Error: {e}")
            return {"success": False, "message": str(e), "synced_count": 0, "cart_totals": {}}


class ActionHandleDeliveryLocation(Action):
    """
    Handle location shared by user for delivery.
    Can be WhatsApp location share or typed address.
    """

    def name(self) -> Text:
        return "action_handle_delivery_location"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[DELIVERY LOCATION] ========== LOCATION RECEIVED ==========")

        events = []
        user_id = tracker.get_slot("user_id")

        if not user_id:
            dispatcher.utter_message(text="Please start your order first by browsing products.")
            return []

        # Check metadata for location data
        metadata = tracker.latest_message.get("metadata", {})
        latitude = metadata.get("latitude")
        longitude = metadata.get("longitude")
        location_name = metadata.get("location_name", "")
        location_address = metadata.get("location_address", "")

        print(f"[DELIVERY LOCATION] Lat: {latitude}, Lng: {longitude}")
        print(f"[DELIVERY LOCATION] Name: {location_name}, Address: {location_address}")

        if latitude and longitude:
            # ===== LOCATION SHARED VIA WHATSAPP =====
            # Use reverse geocoding or the address from WhatsApp

            address_text = location_address or location_name or f"Location: {latitude}, {longitude}"

            # Store location
            events.append(SlotSet("delivery_latitude", str(latitude)))
            events.append(SlotSet("delivery_longitude", str(longitude)))
            events.append(SlotSet("delivery_address_text", address_text))
            events.append(SlotSet("checkout_step", "confirm_location"))

            # Get order total from slot
            order_total = tracker.get_slot("whatsapp_order_total") or 0

            # Save address to user account
            sender_id = tracker.sender_id
            phone = re.sub(r'[^0-9]', '', sender_id) if sender_id else ""

            # Parse the address to extract city, state, zip
            parsed_addr = _parse_whatsapp_address(address_text)

            try:
                add_address_response = requests.post(
                    f"{API_BASE}/addAddress",
                    json={
                        "user_id": user_id,
                        "address_name": "WhatsApp Location",
                        "name": "WhatsApp Customer",
                        "email": f"wa_{phone}@whatsapp.guest",
                        "phone": phone,
                        "address": parsed_addr["address"],
                        "address2": f"Lat: {latitude}, Lng: {longitude}",
                        "city": parsed_addr["city"] or "Unknown",
                        "state": parsed_addr["state"],  # Required field - defaults to "NA"
                        "country": parsed_addr["country"],
                        "zip_code": parsed_addr["zip_code"] or "00000"
                    },
                    timeout=10
                )
                print(f"[DELIVERY LOCATION] Address saved: {add_address_response.json()}")
            except Exception as e:
                print(f"[DELIVERY LOCATION] Warning - couldn't save address: {e}")

            msg_text = f"📍 Delivery Location:\n{address_text}\n\n💰 Total: ${order_total:.2f}\n\nIs this correct?"

            # Use ONLY json_message for WhatsApp to avoid duplicate messages
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": msg_text,
                    "buttons": [
                        {"id": "confirm_order_pay", "title": "✅ Confirm & Pay"},
                        {"id": "change_address", "title": "📍 Change Location"}
                    ]
                }
            )

        else:
            # No location in metadata - prompt user
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "Please share your delivery location:",
                    "buttons": [
                        {"id": "share_location", "title": "📍 Share Location"},
                        {"id": "type_address", "title": "✏️ Type Address"}
                    ]
                }
            )
            events.append(SlotSet("checkout_step", "awaiting_address"))

        return events


class ActionConfirmOrderAndPay(Action):
    """
    Confirm order and create Stripe payment link.
    Final step before payment.
    """

    def name(self) -> Text:
        return "action_confirm_order_and_pay"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[CONFIRM & PAY] ========== CREATING PAYMENT ==========")

        user_id = tracker.get_slot("user_id")

        if not user_id:
            dispatcher.utter_message(text="Session expired. Please start over by browsing products.")
            return [FollowupAction("action_restart")]

        # Get delivery address
        delivery_address = tracker.get_slot("delivery_address")
        delivery_address_text = tracker.get_slot("delivery_address_text")
        delivery_latitude = tracker.get_slot("delivery_latitude")
        delivery_longitude = tracker.get_slot("delivery_longitude")

        # If we have location but no saved address, save it first
        if delivery_latitude and not delivery_address:
            # Save address to user account
            try:
                sender_id = tracker.sender_id
                phone = re.sub(r'[^0-9]', '', sender_id) if sender_id else ""

                # Parse the address to extract city, state, zip
                addr_text = delivery_address_text or f"Lat: {delivery_latitude}, Lng: {delivery_longitude}"
                parsed_addr = _parse_whatsapp_address(addr_text)

                add_address_response = requests.post(
                    f"{API_BASE}/addAddress",
                    json={
                        "user_id": user_id,
                        "address_name": "WhatsApp Delivery",
                        "name": "WhatsApp Customer",
                        "email": f"wa_{phone}@whatsapp.guest",
                        "phone": phone,
                        "address": parsed_addr["address"],
                        "address2": f"Lat: {delivery_latitude}, Lng: {delivery_longitude}",
                        "city": parsed_addr["city"] or "Unknown",
                        "state": parsed_addr["state"],  # Required field - defaults to "NA"
                        "country": parsed_addr["country"],
                        "zip_code": parsed_addr["zip_code"] or "00000"
                    },
                    timeout=10
                )

                addr_result = add_address_response.json()
                print(f"[CONFIRM & PAY] Address saved: {addr_result}")

            except Exception as e:
                print(f"[CONFIRM & PAY] Warning - couldn't save address: {e}")

        # Get applied coupon if any
        applied_coupon_id = tracker.get_slot("applied_coupon_id") or ""
        applied_coupon_code = tracker.get_slot("applied_coupon_code") or ""
        store_id = tracker.get_slot("store_id")  # Get store filter
        coupon_discount = 0.0
        print(f"[CONFIRM & PAY] Applied coupon: {applied_coupon_code} (ID: {applied_coupon_id}), store_id: {store_id}")

        # Get cart total from backend (more accurate than WhatsApp total)
        try:
            cart_payload = {"user_id": user_id, "coupon_id": applied_coupon_id}
            if store_id:
                cart_payload["shipper_id"] = str(store_id)

            cart_response = requests.post(
                f"{API_BASE}/cart-list",
                json=cart_payload,
                timeout=10
            )
            cart_data = cart_response.json()
            print(f"[CONFIRM & PAY] Cart response: {cart_data}")

            if cart_data.get("status") == 1:
                order_meta = cart_data.get("data", {}).get("orderMetaData", {})
                total_amount = float(order_meta.get("total", 0))
                coupon_discount = float(order_meta.get("coupon_discount", 0))
                print(f"[CONFIRM & PAY] Total: ${total_amount:.2f}, Coupon discount: ${coupon_discount:.2f}")
            else:
                # Fallback to WhatsApp total
                total_amount = float(tracker.get_slot("whatsapp_order_total") or 0)

        except Exception as e:
            print(f"[CONFIRM & PAY] Cart fetch error: {e}")
            total_amount = float(tracker.get_slot("whatsapp_order_total") or 0)

        if total_amount <= 0:
            dispatcher.utter_message(text="Your cart appears to be empty. Please add items first.")
            return []

        if total_amount < 0.50:
            dispatcher.utter_message(text=f"Order total (${total_amount:.2f}) is below minimum $0.50.")
            return []

        # Create Stripe session
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

        try:
            sender_id = tracker.sender_id
            whatsapp_number = re.sub(r'[^0-9+]', '', sender_id) if sender_id else None

            amount_in_cents = int(total_amount * 100)

            # Get delivery address ID
            delivery_address_id = tracker.get_slot("delivery_address_id") or ""

            metadata = {
                "user_id": user_id,
                "channel": "whatsapp_native_cart",
                "checkout_type": "optimal_flow",
                "delivery_address_id": delivery_address_id,
                "store_id": tracker.get_slot("store_id") or "",  # ⭐ For backend to know which WhatsApp to notify
                "wh_account_id": tracker.get_slot("store_id") or "",  # ⭐ Same as store_id for clarity
                "store_name": tracker.get_slot("store_name") or ""
            }

            # Add coupon info to metadata if applied
            if applied_coupon_id:
                metadata["coupon_id"] = applied_coupon_id
                metadata["coupon_code"] = applied_coupon_code
                metadata["coupon_discount"] = str(coupon_discount)

            if whatsapp_number:
                metadata["whatsapp_number"] = whatsapp_number

            # Build description
            description = f"Order via WhatsApp for User #{user_id}"
            if applied_coupon_code:
                description += f" (Coupon: {applied_coupon_code})"

            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "WhatsApp Order",
                            "description": description
                        },
                        "unit_amount": amount_in_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                locale="en",  # Force English locale
                currency="usd",  # Force USD currency display
                metadata=metadata,
                success_url="https://stageshipperapi.thedelivio.com/api/bot-payment-status?session_id={CHECKOUT_SESSION_ID}&status=success",
                cancel_url="https://stageshipperapi.thedelivio.com/api/bot-payment-status?session_id={CHECKOUT_SESSION_ID}&status=cancel",
            )

            payment_url = session.url

            print(f"[CONFIRM & PAY] ✅ Stripe session created: {session.id}")
            print(f"[CONFIRM & PAY] Payment URL: {payment_url}")

            # Build payment text with coupon info
            if coupon_discount > 0 and applied_coupon_code:
                payment_text = (
                    f"🎟️ Coupon: {applied_coupon_code}\n"
                    f"💵 Discount: -${coupon_discount:.2f}\n"
                    f"💰 Total: ${total_amount:.2f}\n\n"
                    f"Tap the button below to complete your secure payment."
                )
            else:
                payment_text = f"💰 Total: ${total_amount:.2f}\n\nTap the button below to complete your secure payment."

            # Send CTA URL button for beautiful payment link
            dispatcher.utter_message(
                json_message={
                    "type": "cta_url",
                    "header": "✅ Order Confirmed!",
                    "text": payment_text,
                    "button_text": "💳 Pay Now",
                    "url": payment_url,
                    "footer": "Secure payment by Stripe"
                }
            )
            # Send follow-up message with confirmation button
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "After payment, tap below to confirm:",
                    "buttons": [
                        {"id": "check_payment", "title": "✅ I've Paid"}
                    ]
                }
            )

            return [
                SlotSet("stripe_session_id", session.id),
                SlotSet("payment_amount", total_amount),
                SlotSet("checkout_step", "awaiting_payment")
            ]

        except Exception as e:
            print(f"[CONFIRM & PAY] ❌ Stripe error: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Sorry, couldn't create payment link. Please try again.")
            return []


class ActionPromptShareLocation(Action):
    """Prompt user to share their location via WhatsApp"""

    def name(self) -> Text:
        return "action_prompt_share_location"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        # Use ONLY json_message for WhatsApp to avoid duplicate messages
        dispatcher.utter_message(
            json_message={
                "type": "buttons",
                "text": "📍 To share your location:\n\n1️⃣ Tap the 📎 attachment button\n2️⃣ Select Location\n3️⃣ Choose Send Your Current Location\n\nOr tap below to type your address:",
                "buttons": [
                    {"id": "type_address", "title": "✏️ Type Address"}
                ]
            }
        )

        return [SlotSet("checkout_step", "awaiting_location")]


class ActionPromptTypeAddress(Action):
    """Prompt user to type their address manually"""

    def name(self) -> Text:
        return "action_prompt_type_address"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        dispatcher.utter_message(
            text="Please type your delivery address in this format:\n\n"
                 "*Street Address, City, State, ZIP*\n\n"
                 "Example: 123 Main St, New York, NY 10001"
        )

        return [SlotSet("checkout_step", "awaiting_typed_address")]


class ActionProcessTypedAddress(Action):
    """Process address typed by user"""

    def name(self) -> Text:
        return "action_process_typed_address"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[TYPED ADDRESS] Processing typed address...")

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Session expired. Please start over.")
            return []

        # Get the typed address from user's message
        address_text = tracker.latest_message.get("text", "").strip()

        if not address_text or len(address_text) < 10:
            dispatcher.utter_message(
                text="That doesn't look like a valid address. Please include street, city, state, and ZIP.\n\n"
                     "Example: 123 Main St, New York, NY 10001"
            )
            return []

        # Parse address (simple split by comma)
        parts = [p.strip() for p in address_text.split(",")]

        if len(parts) >= 3:
            street = parts[0]
            city = parts[1] if len(parts) > 1 else ""
            # Try to extract state and ZIP from last part
            state_zip = parts[2] if len(parts) > 2 else ""
            state_zip_parts = state_zip.split()
            state = state_zip_parts[0] if state_zip_parts else ""
            zip_code = state_zip_parts[-1] if len(state_zip_parts) > 1 else ""
        else:
            street = address_text
            city = ""
            state = ""
            zip_code = ""

        # Save address
        try:
            sender_id = tracker.sender_id
            phone = re.sub(r'[^0-9]', '', sender_id) if sender_id else ""

            add_response = requests.post(
                f"{API_BASE}/addAddress",
                json={
                    "user_id": user_id,
                    "address_name": "Home",
                    "name": "WhatsApp Customer",
                    "email": f"wa_{phone}@whatsapp.guest",
                    "phone": phone,
                    "address": street,
                    "address2": "",
                    "city": city,
                    "state": state,
                    "country": "United States",
                    "zip_code": zip_code
                },
                timeout=10
            )

            result = add_response.json()
            print(f"[TYPED ADDRESS] Address save result: {result}")

            if result.get("status") == 1:
                # Address saved - proceed to payment confirmation
                order_total = tracker.get_slot("whatsapp_order_total") or 0

                msg_text = f"📍 Delivery Address:\n{address_text}\n\n💰 Total: ${order_total:.2f}\n\nReady to complete your order?"

                # Use ONLY json_message for WhatsApp to avoid duplicate messages
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": msg_text,
                        "buttons": [
                            {"id": "confirm_order_pay", "title": "✅ Confirm & Pay"},
                            {"id": "type_address", "title": "✏️ Edit Address"}
                        ]
                    }
                )

                return [
                    SlotSet("delivery_address_text", address_text),
                    SlotSet("checkout_step", "confirm_address")
                ]
            else:
                dispatcher.utter_message(text="Couldn't save address. Please try again.")
                return []

        except Exception as e:
            print(f"[TYPED ADDRESS] Error: {e}")
            dispatcher.utter_message(text="Error saving address. Please try again.")
            return []


class ActionShowUserAddresses(Action):
    """Show user's saved addresses for selection"""

    def name(self) -> Text:
        return "action_show_user_addresses"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Please login first to see your addresses.")
            return [FollowupAction("action_prompt_login")]

        try:
            response = requests.post(
                f"{API_BASE}/getAddress",
                json={"user_id": user_id, "shipper_id": "", "address_id": ""},
                timeout=10
            )

            data = response.json()

            if data.get("status") == 1 and data.get("data", {}).get("addressList"):
                addresses = data["data"]["addressList"]

                # Build list of addresses
                sections = [{
                    "title": "Your Addresses",
                    "rows": []
                }]

                for addr in addresses[:8]:  # Max 8 for WhatsApp list (leave room for options)
                    addr_id = addr.get("address_id")
                    addr_name = addr.get("address_name", "Address")
                    full_addr = f"{addr.get('address', '')}, {addr.get('city', '')}"

                    sections[0]["rows"].append({
                        "id": f"select_address_{addr_id}",
                        "title": addr_name[:24],
                        "description": full_addr[:72]
                    })

                # Add option for new address
                sections[0]["rows"].append({
                    "id": "share_location",
                    "title": "📍 Share New Location",
                    "description": "Add a new delivery address"
                })
                sections[0]["rows"].append({
                    "id": "type_address",
                    "title": "✏️ Type New Address",
                    "description": "Enter address manually"
                })

                # Use ONLY json_message for WhatsApp to avoid duplicate messages
                dispatcher.utter_message(
                    json_message={
                        "type": "list",
                        "text": "Select a delivery address or add a new one:",
                        "button_text": "📍 Choose Address",
                        "sections": sections
                    }
                )

            else:
                # Use ONLY json_message for WhatsApp to avoid duplicate messages
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "You don't have any saved addresses. Please share your location:",
                        "buttons": [
                            {"id": "share_location", "title": "📍 Share Location"},
                            {"id": "type_address", "title": "✏️ Type Address"}
                        ]
                    }
                )

        except Exception as e:
            print(f"[SHOW ADDRESSES] Error: {e}")
            dispatcher.utter_message(text="Couldn't load addresses. Please try again.")

        return []


class ActionSelectDeliveryAddress(Action):
    """Handle when user selects a delivery address from the list"""

    def name(self) -> Text:
        return "action_select_delivery_address"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[SELECT ADDRESS] ========== USER SELECTED ADDRESS ==========")

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Session expired. Please start over.")
            return []

        # Get selected address ID from metadata
        metadata = tracker.latest_message.get("metadata", {})
        selected_address_id = metadata.get("selected_address_id")

        # Also try to extract from message text (format: /select_delivery_address{123})
        if not selected_address_id:
            message_text = tracker.latest_message.get("text", "")
            import re
            match = re.search(r'\{(\d+)\}', message_text)
            if match:
                selected_address_id = match.group(1)

        print(f"[SELECT ADDRESS] Selected address ID: {selected_address_id}")

        if not selected_address_id:
            dispatcher.utter_message(text="Please select an address from the list.")
            return [FollowupAction("action_show_user_addresses")]

        # Fetch the selected address details
        try:
            response = requests.post(
                f"{API_BASE}/getAddress",
                json={"user_id": user_id, "shipper_id": "", "address_id": selected_address_id},
                timeout=10
            )

            data = response.json()
            print(f"[SELECT ADDRESS] Address API response: {data}")

            if data.get("status") == 1:
                addresses = data.get("data", {}).get("addressList", [])
                if addresses:
                    addr = addresses[0]  # Should be just the one we requested
                    addr_name = addr.get("address_name", "Selected Address")
                    street = addr.get("address", "")
                    city = addr.get("city", "")
                    state = addr.get("state", "")
                    zip_code = addr.get("zip_code", "")

                    full_address = f"{street}, {city}"
                    if state:
                        full_address += f", {state}"
                    if zip_code:
                        full_address += f" {zip_code}"

                    # Get order total
                    order_total = tracker.get_slot("whatsapp_order_total") or 0

                    msg_text = f"📍 Delivery Address:\n{addr_name}\n{full_address}\n\n💰 Total: ${order_total:.2f}\n\nReady to complete your order?"

                    # Use ONLY json_message for WhatsApp to avoid duplicate messages
                    dispatcher.utter_message(
                        json_message={
                            "type": "buttons",
                            "text": msg_text,
                            "buttons": [
                                {"id": "confirm_order_pay", "title": "✅ Confirm & Pay"},
                                {"id": "change_address", "title": "📍 Different Address"}
                            ]
                        }
                    )

                    return [
                        SlotSet("delivery_address_id", selected_address_id),
                        SlotSet("delivery_address_text", full_address),
                        SlotSet("checkout_step", "confirm_address")
                    ]
                else:
                    dispatcher.utter_message(text="Couldn't find that address. Please select another.")
                    return [FollowupAction("action_show_user_addresses")]
            else:
                dispatcher.utter_message(text="Couldn't load address details. Please try again.")
                return [FollowupAction("action_show_user_addresses")]

        except Exception as e:
            print(f"[SELECT ADDRESS] Error: {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Error loading address. Please try again.")
            return [FollowupAction("action_show_user_addresses")]


class ActionPaymentConfirmed(Action):
    """
    Handle payment confirmation from Stripe webhook.
    This action is called when Stripe confirms payment success.
    It sends a confirmation message to the user.
    """

    def name(self) -> Text:
        return "action_payment_confirmed"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[PAYMENT CONFIRMED] Processing webhook payment confirmation...")

        # Get payment details from slot or latest message entities
        order_id = tracker.get_slot("order_id")
        amount = tracker.get_slot("whatsapp_order_total") or 0

        # Get user info
        user_id = tracker.get_slot("user_id")

        # Check input channel for WhatsApp formatting
        input_channel = tracker.get_latest_input_channel()
        is_whatsapp = input_channel in ["twilio_whatsapp", "whatsapp_business"]

        confirmation_message = (
            f"✅ **Payment Successful!**\n\n"
            f"🎉 Thank you for your payment!\n\n"
            f"💰 Amount Paid: ${amount:.2f}\n"
        )

        if order_id:
            confirmation_message += f"📦 Order ID: #{order_id}\n\n"
        else:
            confirmation_message += "\n"

        confirmation_message += (
            "Your order is now being processed.\n"
            "You'll receive updates on your delivery status.\n\n"
            "Thank you for shopping with us! 🙏"
        )

        if is_whatsapp:
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": confirmation_message,
                    "buttons": [
                        {"id": "track_order", "title": "📦 Track Order"},
                        {"id": "continue_shopping", "title": "🛍️ Shop More"}
                    ]
                }
            )
        else:
            dispatcher.utter_message(text=confirmation_message)

        # Reset checkout state
        return [
            SlotSet("checkout_step", None),
            SlotSet("payment_pending", False)
        ]


# ============================================================================
# WISHLIST / FAVORITES ACTIONS
# ============================================================================

class ActionAddToWishlist(Action):
    """Add a product to user's wishlist/favorites"""

    def name(self) -> Text:
        return "action_add_to_wishlist"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(
                text="Please login first to save favorites! Type 'login' to get started."
            )
            return []

        # Get product info from slot or recent selection
        product_id = tracker.get_slot("selected_product_id")
        shipper_id = tracker.get_slot("store_id") or tracker.get_slot("shipper_id")

        # Try to get from recent_products if not in slot
        if not product_id:
            recent_products = tracker.get_slot("recent_products")
            if recent_products:
                try:
                    products = json.loads(recent_products) if isinstance(recent_products, str) else recent_products
                    if products and len(products) > 0:
                        # Get the first/selected product
                        product = products[0]
                        product_id = product.get("product_id") or product.get("id")
                        shipper_id = shipper_id or product.get("shipper_id")
                except:
                    pass

        if not product_id:
            dispatcher.utter_message(
                text="Please select a product first before adding to favorites.\n\nYou can browse products by saying 'show menu' or search for something specific."
            )
            return []

        # Call API to add to wishlist
        try:
            endpoint = f"{API_BASE}/addProductToWishlist"
            payload = {
                "user_id": str(user_id),
                "product_id": str(product_id),
                "shipper_id": str(shipper_id) if shipper_id else "",
                "flag": "1"
            }

            print(f"[WISHLIST] Adding product {product_id} to wishlist for user {user_id}")
            response = requests.post(endpoint, json=payload, timeout=10)
            data = response.json()

            if data.get("status") == 1 or data.get("code") == 200:
                total = data.get("data", {}).get("total_Wishlist", 1)

                # Get product name if available
                product_name = tracker.get_slot("selected_product_name") or "Product"

                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"❤️ *{product_name}* added to your favorites!\n\nYou now have {total} item(s) in your favorites.",
                        "buttons": [
                            {"id": "view_wishlist", "title": "❤️ View Favorites"},
                            {"id": "continue_shopping", "title": "🛍️ Continue Shopping"}
                        ]
                    }
                )
            else:
                message = data.get("message", "Couldn't add to favorites. Please try again.")
                dispatcher.utter_message(text=f"⚠️ {message}")

        except Exception as e:
            print(f"[WISHLIST ERROR] {e}")
            dispatcher.utter_message(text="Sorry, couldn't add to favorites right now. Please try again later.")

        return []


class ActionViewWishlist(Action):
    """View user's wishlist/favorites"""

    def name(self) -> Text:
        return "action_view_wishlist"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(
                text="Please login first to view your favorites! Type 'login' to get started."
            )
            return []

        try:
            endpoint = f"{API_BASE}/WishlistList"
            payload = {
                "user_id": str(user_id),
                "search_string": ""
            }

            print(f"[WISHLIST] Fetching wishlist for user {user_id}")
            response = requests.post(endpoint, json=payload, timeout=10)
            data = response.json()

            wishlist = data.get("data", {}).get("wishlist", [])

            if not wishlist:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "❤️ *Your Favorites*\n\nYou haven't saved any favorites yet!\n\nBrowse our products and tap the ❤️ button to save items for quick reordering.",
                        "buttons": [
                            {"id": "show_menu", "title": "🍽️ Browse Menu"},
                            {"id": "search_products", "title": "🔍 Search Products"}
                        ]
                    }
                )
                return []

            # Build WhatsApp list message with wishlist items
            sections = []
            items = []

            for item in wishlist[:10]:  # Limit to 10 items for WhatsApp list
                product_id = item.get("product_id")
                wishlist_id = item.get("wishlist_id") or item.get("wishlist_detail_id")
                title = item.get("title", "Unknown Product")
                price = item.get("discounted_price") or item.get("product_price", 0)
                store_name = item.get("store_name", "")

                # Truncate title for WhatsApp (max 24 chars)
                display_title = title[:24] if len(title) > 24 else title

                items.append({
                    "id": f"wishlist_item_{product_id}_{wishlist_id}",
                    "title": display_title,
                    "description": f"₹{price} - {store_name}" if store_name else f"₹{price}"
                })

            sections.append({
                "title": "Your Favorites",
                "rows": items
            })

            # Add action options
            sections.append({
                "title": "Options",
                "rows": [
                    {"id": "add_all_to_cart", "title": "🛒 Add All to Cart", "description": "Add all favorites to cart"},
                    {"id": "clear_wishlist", "title": "🗑️ Clear Favorites", "description": "Remove all favorites"}
                ]
            })

            dispatcher.utter_message(
                json_message={
                    "type": "list",
                    "text": f"❤️ *Your Favorites* ({len(wishlist)} items)\n\nTap to view details or add to cart:",
                    "button_text": "View Favorites",
                    "sections": sections
                }
            )

            # Store wishlist for reference
            return [SlotSet("current_wishlist", json.dumps(wishlist))]

        except Exception as e:
            print(f"[WISHLIST ERROR] {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Sorry, couldn't load your favorites right now. Please try again later.")
            return []


class ActionRemoveFromWishlist(Action):
    """Remove a product from user's wishlist/favorites"""

    def name(self) -> Text:
        return "action_remove_from_wishlist"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Please login first!")
            return []

        # Get product to remove - could be from button click or slot
        latest_message = tracker.latest_message.get("text", "")

        product_id = None
        wishlist_id = None

        # Check if it's a button click with format: wishlist_item_{product_id}_{wishlist_id}
        if "wishlist_item_" in latest_message:
            parts = latest_message.replace("wishlist_item_", "").split("_")
            if len(parts) >= 2:
                product_id = parts[0]
                wishlist_id = parts[1]

        # Or get from slot
        if not product_id:
            product_id = tracker.get_slot("selected_product_id")

        # Try to get wishlist_id from stored wishlist
        if product_id and not wishlist_id:
            current_wishlist = tracker.get_slot("current_wishlist")
            if current_wishlist:
                try:
                    wishlist = json.loads(current_wishlist) if isinstance(current_wishlist, str) else current_wishlist
                    for item in wishlist:
                        if str(item.get("product_id")) == str(product_id):
                            wishlist_id = item.get("wishlist_id") or item.get("wishlist_detail_id")
                            break
                except:
                    pass

        if not product_id:
            dispatcher.utter_message(text="Please select a product to remove from favorites.")
            return [FollowupAction("action_view_wishlist")]

        try:
            endpoint = f"{API_BASE}/removeProductFromWishlistBot"
            payload = {
                "user_id": str(user_id),
                "product_id": str(product_id),
                "id": str(wishlist_id) if wishlist_id else ""
            }

            print(f"[WISHLIST] Removing product {product_id} from wishlist for user {user_id}")
            response = requests.post(endpoint, json=payload, timeout=10)
            data = response.json()

            if data.get("data", {}).get("status") == True:
                remaining = data.get("data", {}).get("total_Wishlist", 0)

                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"✅ Removed from favorites!\n\nYou have {remaining} item(s) remaining in favorites.",
                        "buttons": [
                            {"id": "view_wishlist", "title": "❤️ View Favorites"},
                            {"id": "continue_shopping", "title": "🛍️ Continue Shopping"}
                        ]
                    }
                )
            else:
                message = data.get("data", {}).get("message", "Couldn't remove from favorites.")
                dispatcher.utter_message(text=f"⚠️ {message}")

        except Exception as e:
            print(f"[WISHLIST ERROR] {e}")
            dispatcher.utter_message(text="Sorry, couldn't remove from favorites right now. Please try again.")

        return []


class ActionAddWishlistToCart(Action):
    """Add wishlist item(s) to cart - supports single item or ALL items"""

    def name(self) -> Text:
        return "action_add_wishlist_to_cart"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Please login first!")
            return []

        # Get product from button click or slot
        latest_message = tracker.latest_message.get("text", "").lower().strip()
        store_id = tracker.get_slot("store_id")

        # ============================================================
        # CHECK IF "ADD ALL TO CART" - add all wishlist items
        # ============================================================
        add_all_patterns = ["add_all_to_cart", "add all to cart", "add all favorites", "🛒 add all"]
        is_add_all = any(pattern in latest_message for pattern in add_all_patterns)

        if is_add_all:
            print(f"[WISHLIST->CART] ADD ALL requested")

            # Get wishlist - first try slot, then fetch from API
            current_wishlist = tracker.get_slot("current_wishlist")
            wishlist = []

            if current_wishlist:
                try:
                    wishlist = json.loads(current_wishlist) if isinstance(current_wishlist, str) else current_wishlist
                except Exception as e:
                    print(f"[WISHLIST->CART] Error parsing slot: {e}")

            # If slot empty or failed, fetch from API
            if not wishlist:
                try:
                    endpoint = f"{API_BASE}/WishlistList"
                    payload = {"user_id": str(user_id), "search_string": ""}
                    response = requests.post(endpoint, json=payload, timeout=10)
                    data = response.json()
                    wishlist = data.get("data", {}).get("wishlist", [])
                    print(f"[WISHLIST->CART] Fetched {len(wishlist)} items from API")
                except Exception as e:
                    print(f"[WISHLIST->CART] API fetch error: {e}")
                    wishlist = []

            if not wishlist:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "❤️ Your favorites list is empty! Browse our menu to add items.",
                        "buttons": [
                            {"id": "browse_products", "title": "🛍️ Browse Menu"}
                        ]
                    }
                )
                return []

            # Add all items to cart
            added_count = 0
            failed_items = []

            for item in wishlist:
                try:
                    product_id = item.get("product_id")
                    shipper_id = item.get("shipper_id") or store_id
                    title = item.get("title", "Product")

                    if not product_id:
                        continue

                    cart_endpoint = f"{API_BASE}/addtocart"
                    cart_payload = {
                        "product_id": str(product_id),
                        "user_id": str(user_id),
                        "product_qty": "1",
                        "shipper_id": str(shipper_id) if shipper_id else ""
                    }

                    print(f"[WISHLIST->CART] Adding {title} (ID: {product_id})")
                    response = requests.post(cart_endpoint, json=cart_payload, timeout=5)
                    data = response.json()

                    if data.get("status") == 1 or data.get("code") == 200:
                        added_count += 1
                    else:
                        failed_items.append(title[:20])
                except Exception as e:
                    print(f"[WISHLIST->CART] Error adding item: {e}")

            # Show result
            if added_count > 0:
                msg = f"🛒 Added {added_count} item(s) from favorites to cart!"
                if failed_items:
                    msg += f"\n\n⚠️ Some items couldn't be added: {', '.join(failed_items)}"

                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": msg + "\n\nWhat would you like to do next?",
                        "buttons": [
                            {"id": "view_cart", "title": "🛒 View Cart"},
                            {"id": "checkout", "title": "💳 Checkout"}
                        ]
                    }
                )
            else:
                dispatcher.utter_message(text="⚠️ Couldn't add items to cart. Please try again.")

            return []

        # ============================================================
        # SINGLE ITEM - original behavior
        # ============================================================
        product_id = None
        shipper_id = None

        # Parse from wishlist_item button click
        if "wishlist_item_" in latest_message:
            parts = latest_message.replace("wishlist_item_", "").split("_")
            if len(parts) >= 1:
                product_id = parts[0]

        # Get from stored wishlist
        current_wishlist = tracker.get_slot("current_wishlist")
        if product_id and current_wishlist:
            try:
                wishlist = json.loads(current_wishlist) if isinstance(current_wishlist, str) else current_wishlist
                for item in wishlist:
                    if str(item.get("product_id")) == str(product_id):
                        shipper_id = item.get("shipper_id")
                        product_name = item.get("title", "Product")
                        break
            except:
                pass

        if not product_id:
            dispatcher.utter_message(text="Please select an item from your favorites to add to cart.")
            return [FollowupAction("action_view_wishlist")]

        # Add to cart using existing cart API
        try:
            shipper_id = shipper_id or store_id

            cart_endpoint = f"{API_BASE}/addtocart"
            cart_payload = {
                "product_id": str(product_id),
                "user_id": str(user_id),
                "product_qty": "1",
                "shipper_id": str(shipper_id) if shipper_id else ""
            }

            print(f"[WISHLIST->CART] Adding product {product_id} to cart")
            response = requests.post(cart_endpoint, json=cart_payload, timeout=10)
            data = response.json()

            if data.get("status") == 1 or data.get("code") == 200:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"🛒 Added to cart from favorites!\n\nWhat would you like to do next?",
                        "buttons": [
                            {"id": "view_cart", "title": "🛒 View Cart"},
                            {"id": "view_wishlist", "title": "❤️ More Favorites"},
                            {"id": "checkout", "title": "💳 Checkout"}
                        ]
                    }
                )
            else:
                message = data.get("message", "Couldn't add to cart.")
                dispatcher.utter_message(text=f"⚠️ {message}")

        except Exception as e:
            print(f"[WISHLIST->CART ERROR] {e}")
            dispatcher.utter_message(text="Sorry, couldn't add to cart right now. Please try again.")

        return []


class ActionGetWishlistCount(Action):
    """Get the total count of wishlist items (for badge display)"""

    def name(self) -> Text:
        return "action_get_wishlist_count"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            return [SlotSet("wishlist_count", 0)]

        try:
            endpoint = f"{API_BASE}/getTotalWishlistItem"
            payload = {"user_id": str(user_id)}

            response = requests.post(endpoint, json=payload, timeout=5)
            data = response.json()

            count = data.get("data", {}).get("total_Wishlist", 0)
            return [SlotSet("wishlist_count", count)]

        except Exception as e:
            print(f"[WISHLIST COUNT ERROR] {e}")
            return [SlotSet("wishlist_count", 0)]


class ActionClearWishlist(Action):
    """Clear all items from user's wishlist/favorites"""

    def name(self) -> Text:
        return "action_clear_wishlist"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Please login first!")
            return []

        print(f"[CLEAR WISHLIST] Starting for user {user_id}")

        # ALWAYS fetch fresh wishlist from API (slot may be stale)
        wishlist = []
        try:
            endpoint = f"{API_BASE}/WishlistList"
            payload = {"user_id": str(user_id), "search_string": ""}
            print(f"[CLEAR WISHLIST] Fetching wishlist from API: {endpoint}")
            response = requests.post(endpoint, json=payload, timeout=10)
            data = response.json()
            print(f"[CLEAR WISHLIST] API response: {data}")
            wishlist = data.get("data", {}).get("wishlist", [])
            print(f"[CLEAR WISHLIST] Found {len(wishlist)} items in wishlist")
        except Exception as e:
            print(f"[CLEAR WISHLIST] API fetch error: {e}")
            # Try slot as fallback
            current_wishlist = tracker.get_slot("current_wishlist")
            if current_wishlist:
                try:
                    wishlist = json.loads(current_wishlist) if isinstance(current_wishlist, str) else current_wishlist
                    print(f"[CLEAR WISHLIST] Using slot fallback: {len(wishlist)} items")
                except Exception as e2:
                    print(f"[CLEAR WISHLIST] Slot parse error: {e2}")
                    wishlist = []

        if not wishlist:
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "❤️ Your favorites list is already empty!",
                    "buttons": [
                        {"id": "browse_products", "title": "🛍️ Browse Menu"}
                    ]
                }
            )
            return []

        # Remove all items
        removed_count = 0
        total_items = len(wishlist)

        for item in wishlist:
            try:
                product_id = item.get("product_id")
                wishlist_id = item.get("wishlist_id") or item.get("wishlist_detail_id") or item.get("id")
                title = item.get("title", "Unknown")

                if not product_id:
                    print(f"[CLEAR WISHLIST] Skipping item - no product_id: {item}")
                    continue

                endpoint = f"{API_BASE}/removeProductFromWishlistBot"
                payload = {
                    "user_id": str(user_id),
                    "product_id": str(product_id),
                    "id": str(wishlist_id) if wishlist_id else ""
                }
                print(f"[CLEAR WISHLIST] Removing: {title} (product_id={product_id}, wishlist_id={wishlist_id})")
                response = requests.post(endpoint, json=payload, timeout=5)
                result = response.json()
                print(f"[CLEAR WISHLIST] Remove result: {result}")

                # Check various success indicators
                is_success = (
                    result.get("status") == 1 or
                    result.get("status") == "1" or
                    result.get("code") == 200 or
                    result.get("data", {}).get("status") or
                    result.get("message", "").lower().find("success") >= 0 or
                    result.get("message", "").lower().find("removed") >= 0
                )

                if is_success:
                    removed_count += 1
                    print(f"[CLEAR WISHLIST] ✓ Removed {title}")
                else:
                    print(f"[CLEAR WISHLIST] ✗ Failed to remove {title}: {result}")

            except Exception as e:
                print(f"[CLEAR WISHLIST] Error removing item: {e}")

        print(f"[CLEAR WISHLIST] Removed {removed_count}/{total_items} items")

        if removed_count > 0:
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": f"✅ Cleared {removed_count} item(s) from your favorites!",
                    "buttons": [
                        {"id": "browse_products", "title": "🛍️ Browse Menu"},
                        {"id": "continue_shopping", "title": "🛍️ Continue Shopping"}
                    ]
                }
            )
        else:
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": f"⚠️ Couldn't clear favorites. Please try again or contact support.",
                    "buttons": [
                        {"id": "view_wishlist", "title": "❤️ View Favorites"},
                        {"id": "browse_products", "title": "🛍️ Browse Menu"}
                    ]
                }
            )

        return [
            SlotSet("current_wishlist", None),
            SlotSet("wishlist_count", 0)
        ]


class ActionHandleWishlistItemSelection(Action):
    """Handle when user selects an item from wishlist - show options"""

    def name(self) -> Text:
        return "action_handle_wishlist_item_selection"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Please login first!")
            return []

        latest_message = tracker.latest_message.get("text", "")
        metadata = tracker.latest_message.get("metadata", {})
        list_item_id = metadata.get("list_item_id", "")

        # Get product info from wishlist
        current_wishlist = tracker.get_slot("current_wishlist")
        if not current_wishlist:
            return [FollowupAction("action_view_wishlist")]

        try:
            wishlist = json.loads(current_wishlist) if isinstance(current_wishlist, str) else current_wishlist
        except:
            return [FollowupAction("action_view_wishlist")]

        selected_item = None
        product_id = None
        wishlist_id = None

        # Parse from list item ID: "wishlist_item_{product_id}_{wishlist_id}"
        if list_item_id and "wishlist_item_" in list_item_id:
            parts = list_item_id.replace("wishlist_item_", "").split("_")
            if len(parts) >= 1:
                product_id = parts[0]
                if len(parts) >= 2:
                    wishlist_id = parts[1]

            for item in wishlist:
                if str(item.get("product_id")) == product_id:
                    selected_item = item
                    break

        # Fallback: match by text (title)
        if not selected_item:
            clean_text = latest_message.split('\n')[0].strip().lower()
            for item in wishlist:
                title = (item.get("title") or "").lower()
                if clean_text in title or title in clean_text:
                    selected_item = item
                    break

        if not selected_item:
            dispatcher.utter_message(text="Couldn't find that item. Please try again.")
            return [FollowupAction("action_view_wishlist")]

        # Show options for selected item
        product_name = selected_item.get("title", "Product")
        product_id = selected_item.get("product_id")
        wishlist_id = selected_item.get("wishlist_id") or selected_item.get("wishlist_detail_id")
        price = selected_item.get("discounted_price") or selected_item.get("product_price", 0)

        dispatcher.utter_message(
            json_message={
                "type": "buttons",
                "text": f"❤️ *{product_name}*\n💰 ₹{price}\n\nWhat would you like to do?",
                "buttons": [
                    {"id": f"add_wishlist_to_cart_{product_id}", "title": "🛒 Add to Cart"},
                    {"id": f"remove_wishlist_{product_id}_{wishlist_id}", "title": "🗑️ Remove"}
                ]
            }
        )

        return [
            SlotSet("selected_product_id", str(product_id)),
            SlotSet("selected_product_name", product_name)
        ]


# ============================================================================
# PROMO CODES / COUPONS ACTIONS
# ============================================================================

class ActionViewCoupons(Action):
    """Show available coupons/promo codes for the user"""

    def name(self) -> Text:
        return "action_view_coupons"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        user_id = tracker.get_slot("user_id")
        if not user_id:
            dispatcher.utter_message(text="Please login first to view available coupons!")
            return []

        # Get store context for filtering
        store_id = tracker.get_slot("store_id")
        is_dedicated_bot = tracker.get_slot("is_dedicated_bot")

        # Determine shipper_id for filtering
        # Empty string = all general coupons
        # Specific ID = store-specific coupons
        shipper_id = str(store_id) if (is_dedicated_bot and store_id) else ""

        try:
            endpoint = f"{API_BASE}/getCouponList"
            payload = {
                "user_id": str(user_id),
                "shipper_id": shipper_id
            }

            print(f"[COUPONS] Fetching coupons: {payload}")
            response = requests.post(endpoint, json=payload, timeout=10)
            data = response.json()

            coupons = data.get("data", [])
            print(f"[COUPONS] Found {len(coupons)} coupons")

            if not coupons:
                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": "🎟️ *No Coupons Available*\n\nThere are no active promo codes right now.\n\nCheck back later for deals!",
                        "buttons": [
                            {"id": "view_cart", "title": "🛒 View Cart"},
                            {"id": "browse_products", "title": "🛍️ Browse Menu"}
                        ]
                    }
                )
                return []

            # Build WhatsApp list message with coupons
            sections = []
            items = []

            for coupon in coupons[:10]:  # Limit to 10
                coupon_id = coupon.get("coupon_id")
                code = coupon.get("code", "")
                name = coupon.get("name", code)
                discount = coupon.get("discount", 0)
                coupon_type = coupon.get("type", "O")  # O=Order, U=User specific
                min_amount = coupon.get("min_amount", 0)
                date_end = coupon.get("date_end", "")

                # Format discount display
                try:
                    discount_val = float(discount)
                    if coupon_type == "P":  # Percentage
                        discount_str = f"{discount_val:.0f}% off"
                    else:  # Fixed amount
                        discount_str = f"${discount_val:.2f} off"
                except:
                    discount_str = f"${discount} off"

                # Truncate name for WhatsApp (max 24 chars)
                display_name = code[:24] if len(code) > 24 else code

                # Description with details
                desc = discount_str
                if min_amount and float(min_amount) > 0:
                    desc += f" (Min ${float(min_amount):.0f})"

                items.append({
                    "id": f"apply_coupon_{code}",
                    "title": display_name,
                    "description": desc[:72]
                })

            sections.append({
                "title": "Available Coupons",
                "rows": items
            })

            # Add option to type custom code
            sections.append({
                "title": "Other Options",
                "rows": [
                    {"id": "type_coupon_code", "title": "✏️ Enter Code", "description": "Type your own promo code"}
                ]
            })

            dispatcher.utter_message(
                json_message={
                    "type": "list",
                    "text": f"🎟️ *Available Coupons* ({len(coupons)})\n\nTap a coupon to apply it to your cart:",
                    "button_text": "View Coupons",
                    "sections": sections
                }
            )

            return [SlotSet("available_coupons", json.dumps(coupons))]

        except Exception as e:
            print(f"[COUPONS ERROR] {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Sorry, couldn't load coupons right now. Please try again.")
            return []


class ActionApplyCoupon(Action):
    """Apply a coupon/promo code to the cart"""

    def name(self) -> Text:
        return "action_apply_coupon"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        print("[COUPON APPLY] ========== ACTION STARTED ==========")

        # Debug: Print all relevant slots
        user_id = tracker.get_slot("user_id")
        store_id = tracker.get_slot("store_id")
        recent_cart = tracker.get_slot("recent_cart_items")
        wa_order = tracker.get_slot("whatsapp_order_items")
        wa_total = tracker.get_slot("whatsapp_order_total")
        checkout_step = tracker.get_slot("checkout_step")

        print(f"[COUPON APPLY] 🔍 Slot Values:")
        print(f"[COUPON APPLY]   - user_id: {user_id}")
        print(f"[COUPON APPLY]   - store_id: {store_id}")
        print(f"[COUPON APPLY]   - recent_cart_items: {bool(recent_cart)} ({len(recent_cart) if recent_cart else 0} chars)")
        print(f"[COUPON APPLY]   - whatsapp_order_items: {bool(wa_order)} ({len(wa_order) if wa_order else 0} chars)")
        print(f"[COUPON APPLY]   - whatsapp_order_total: {wa_total}")
        print(f"[COUPON APPLY]   - checkout_step: {checkout_step}")

        if not user_id:
            dispatcher.utter_message(text="Please login first to apply coupons!")
            return []

        # Get coupon code from entity or message
        coupon_code = next(tracker.get_latest_entity_values("coupon_code"), None)
        latest_message = tracker.latest_message.get("text", "")

        # Try to extract from button click: apply_coupon_CODENAME
        if not coupon_code and "apply_coupon_" in latest_message:
            coupon_code = latest_message.replace("apply_coupon_", "").strip()

        # Try to extract from message if not found
        if not coupon_code:
            # Try common patterns
            patterns = [
                r"apply\s+(?:code\s+)?([A-Z0-9\-]+)",
                r"use\s+(?:code\s+|promo\s+|coupon\s+)?([A-Z0-9\-]+)",
                r"code\s+([A-Z0-9\-]+)",
                r"([A-Z0-9\-]{4,})",  # Any 4+ char alphanumeric
            ]
            for pattern in patterns:
                match = re.search(pattern, latest_message, re.IGNORECASE)
                if match:
                    coupon_code = match.group(1).upper()
                    break

        if not coupon_code:
            dispatcher.utter_message(
                text="🎟️ Please enter a promo code.\n\nExample: *Apply code SAVE10*"
            )
            return []

        print(f"[COUPON APPLY] Attempting to apply: {coupon_code}")

        # Get cart info - check both regular cart and WhatsApp native cart
        recent_cart_json = tracker.get_slot("recent_cart_items")
        whatsapp_order_json = tracker.get_slot("whatsapp_order_items")
        whatsapp_order_total = tracker.get_slot("whatsapp_order_total")
        store_id = tracker.get_slot("store_id")  # No hardcoded fallback
        cart_id = None
        cart_total = 0

        print(f"[COUPON APPLY] Slots: recent_cart={bool(recent_cart_json)}, wa_order={bool(whatsapp_order_json)}, wa_total={whatsapp_order_total}, store_id={store_id}")

        # First try regular cart items from slot
        if recent_cart_json:
            try:
                cart_items = json.loads(recent_cart_json)
                if cart_items:
                    # Get cart_id from first item (cart_id field, not id)
                    cart_id = cart_items[0].get("cart_id") or cart_items[0].get("id")
                    for item in cart_items:
                        price = float(item.get("discounted_price", 0) or item.get("price", 0))
                        qty = int(item.get("quantity", 1))
                        cart_total += price * qty
                    print(f"[COUPON APPLY] Got cart from recent_cart_items slot: cart_id={cart_id}, total={cart_total}")
            except Exception as e:
                print(f"[COUPON APPLY] Error parsing recent_cart_items: {e}")

        # If no cart from slot, ALWAYS try to fetch from backend API
        # This handles WhatsApp native cart flow where cart is synced to backend
        if not cart_id:
            print(f"[COUPON APPLY] No cart in slot, fetching from backend API...")
            try:
                # Use /api/cart-list to get cart (NOT getCart)
                cart_payload = {"user_id": str(user_id), "coupon_id": ""}
                if store_id:
                    cart_payload["shipper_id"] = str(store_id)

                cart_response = requests.post(
                    f"{API_BASE}/cart-list",
                    json=cart_payload,
                    timeout=10
                )
                cart_data = cart_response.json()
                print(f"[COUPON APPLY] cart-list API response: {json.dumps(cart_data)[:500]}")

                if cart_data.get("status") == 1:
                    # Cart items are in data.cartlist[]
                    cart_items_data = cart_data.get("data", {}).get("cartlist", [])
                    print(f"[COUPON APPLY] Found {len(cart_items_data)} items in backend cart")

                    if cart_items_data:
                        # Get cart_id from first item (cartlist[].cart_id)
                        first_item = cart_items_data[0]
                        cart_id = first_item.get("cart_id")

                        # Calculate total from cart items
                        for item in cart_items_data:
                            price = float(item.get("discounted_price", 0) or item.get("price", 0) or 0)
                            qty = int(item.get("quantity", 1))
                            cart_total += price * qty

                        print(f"[COUPON APPLY] Backend cart: cart_id={cart_id}, total=${cart_total:.2f}")

                    # Also can get total from orderMetaData if available
                    order_meta = cart_data.get("data", {}).get("orderMetaData", {})
                    if order_meta and cart_total == 0:
                        meta_total = float(order_meta.get("sub_total_amount", 0) or 0)
                        if meta_total > 0:
                            cart_total = meta_total
                            print(f"[COUPON APPLY] Using orderMetaData total: ${cart_total:.2f}")

            except Exception as e:
                print(f"[COUPON APPLY] Error fetching cart from backend: {e}")
                import traceback
                traceback.print_exc()

        if not cart_id or cart_total <= 0:
            print(f"[COUPON APPLY] ❌ No cart found! cart_id={cart_id}, cart_total={cart_total}")
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "🛒 Your cart is empty!\n\nAdd items to your cart first, then apply a coupon.",
                    "buttons": [
                        {"id": "browse_products", "title": "🛍️ Browse Menu"}
                    ]
                }
            )
            return []

        # Call API to check/apply coupon
        try:
            endpoint = f"{API_BASE}/check-coupon"

            payload = {
                "coupon_code": coupon_code,
                "user_id": str(user_id),
                "cart_id": str(cart_id),
                "amount": str(cart_total)
            }

            print(f"[COUPON APPLY] API Request: {payload}")
            response = requests.post(endpoint, json=payload, timeout=10)
            data = response.json()
            print(f"[COUPON APPLY] API Response: {data}")

            api_status = data.get("status")
            message = data.get("message", "")
            coupon_data = data.get("data", {})

            if api_status == 1:
                # Success - coupon applied
                # Use values from API response instead of calculating manually
                coupon_id = coupon_data.get("coupon_id")
                coupon_type = coupon_data.get("type", "O")
                coupon_value = float(coupon_data.get("discount", 0))

                # Get actual discount from API
                actual_discount = float(coupon_data.get("total_discount", 0))
                order_meta = coupon_data.get("getOrderMetaData", {})
                if not actual_discount and order_meta:
                    actual_discount = float(order_meta.get("coupon_discount", 0))

                # ✅ FETCH FROM CART-LIST API with coupon to get correct total with tax
                try:
                    cart_payload = {"user_id": str(user_id), "coupon_id": str(coupon_id)}
                    if store_id:
                        cart_payload["shipper_id"] = str(store_id)

                    cart_response = requests.post(
                        f"{API_BASE}/cart-list",
                        json=cart_payload,
                        timeout=10
                    )
                    cart_data = cart_response.json()
                    print(f"[COUPON APPLY] Cart-list response: {cart_data.get('status')}")

                    if cart_data.get("status") == 1:
                        cart_order_meta = cart_data.get("data", {}).get("orderMetaData", {})
                        # Get total WITH tax from cart-list API
                        new_total = float(cart_order_meta.get("total", 0))
                        actual_discount = float(cart_order_meta.get("coupon_discount", 0))
                        print(f"[COUPON APPLY] Cart total with tax: ${new_total:.2f}, coupon_discount: ${actual_discount:.2f}")
                    else:
                        # Fallback to check-coupon response
                        new_total = float(coupon_data.get("discounted_total", 0))
                except Exception as cart_err:
                    print(f"[COUPON APPLY] Cart fetch error: {cart_err}")
                    new_total = float(coupon_data.get("discounted_total", 0))

                # Build discount display string
                if coupon_type == "P":  # Percentage
                    discount_str = f"{coupon_value:.0f}%"
                else:  # Fixed/Other
                    discount_str = f"${coupon_value:.2f}"

                # Use API message if available
                api_message = message or f"You saved ${actual_discount:.2f}!"

                print(f"[COUPON APPLY] ✅ Applied: discount={actual_discount}, new_total={new_total}")

                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"✅ *Coupon Applied!*\n\n🎟️ Code: *{coupon_code}*\n💰 Discount: {discount_str}\n💵 {api_message}\n\n🛒 Total: ${new_total:.2f} _(incl. tax)_",
                        "buttons": [
                            {"id": "view_cart", "title": "🛒 View Cart"},
                            {"id": "checkout", "title": "💳 Checkout"},
                            {"id": "remove_coupon", "title": "❌ Remove Coupon"}
                        ]
                    }
                )

                return [
                    SlotSet("applied_coupon_code", coupon_code),
                    SlotSet("applied_coupon_id", str(coupon_id)),
                    SlotSet("coupon_discount_amount", actual_discount)
                ]

            else:
                # Failed - show error message
                error_msg = message or "Invalid coupon code"

                dispatcher.utter_message(
                    json_message={
                        "type": "buttons",
                        "text": f"❌ *Coupon Not Applied*\n\n{error_msg}\n\nTry a different code or browse available coupons.",
                        "buttons": [
                            {"id": "view_coupons", "title": "🎟️ View Coupons"},
                            {"id": "view_cart", "title": "🛒 View Cart"}
                        ]
                    }
                )
                return []

        except Exception as e:
            print(f"[COUPON APPLY ERROR] {e}")
            import traceback
            traceback.print_exc()
            dispatcher.utter_message(text="Sorry, couldn't apply coupon right now. Please try again.")
            return []


class ActionRemoveCoupon(Action):
    """Remove applied coupon from cart"""

    def name(self) -> Text:
        return "action_remove_coupon"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[EventType]:

        applied_coupon = tracker.get_slot("applied_coupon_code")

        if not applied_coupon:
            dispatcher.utter_message(
                json_message={
                    "type": "buttons",
                    "text": "🎟️ No coupon is currently applied to your cart.",
                    "buttons": [
                        {"id": "view_coupons", "title": "🎟️ View Coupons"},
                        {"id": "view_cart", "title": "🛒 View Cart"}
                    ]
                }
            )
            return []

        dispatcher.utter_message(
            json_message={
                "type": "buttons",
                "text": f"✅ Coupon *{applied_coupon}* has been removed from your cart.",
                "buttons": [
                    {"id": "view_coupons", "title": "🎟️ New Coupon"},
                    {"id": "view_cart", "title": "🛒 View Cart"},
                    {"id": "checkout", "title": "💳 Checkout"}
                ]
            }
        )

        return [
            SlotSet("applied_coupon_code", None),
            SlotSet("applied_coupon_id", None),
            SlotSet("coupon_discount_amount", 0)
        ]
