"""
Multi-Tenant WhatsApp Business API Connector for Rasa
Supports multiple sellers with their own WhatsApp Business accounts

Each seller has their own:
- Phone Number ID
- Access Token
- WABA ID
- Catalog ID
"""
import json
import logging
import os
from typing import Text, List, Dict, Any, Optional
import requests
from sanic import response
from sanic.request import Request
from sanic.blueprints import Blueprint
from rasa.core.channels.channel import InputChannel, UserMessage, OutputChannel
from dotenv import load_dotenv

# Import multi-tenant store configuration
from actions.store_config import get_store_from_phone, get_seller_by_phone_number_id

load_dotenv()

logger = logging.getLogger(__name__)

# Default WhatsApp Business API Configuration (fallback)
DEFAULT_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
DEFAULT_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "mytoken_for_aibot_8826037096")
API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")


class WhatsAppBusinessOutput(OutputChannel):
    """
    Output channel for WhatsApp Business API
    Now supports dynamic credentials per seller
    """

    @classmethod
    def name(cls) -> Text:
        return "whatsapp_business"

    def __init__(
        self,
        phone_number_id: Text = None,
        access_token: Text = None,
        seller_config: Dict[str, Any] = None
    ) -> None:
        """
        Initialize output channel with seller-specific credentials

        Args:
            phone_number_id: WhatsApp phone number ID
            access_token: WhatsApp API access token
            seller_config: Full seller configuration from database
        """
        self.seller_config = seller_config or {}
        self.phone_number_id = phone_number_id or self.seller_config.get("phone_number_id") or DEFAULT_PHONE_NUMBER_ID
        self.catalog_id = self.seller_config.get("catalog_id")
        self.store_id = self.seller_config.get("store_id")
        self.store_name = self.seller_config.get("store_name")

        # Determine access token with clear source tracking
        token_source = "unknown"
        if access_token:
            self.access_token = access_token
            token_source = "passed_param"
        elif self.seller_config.get("access_token"):
            self.access_token = self.seller_config.get("access_token")
            token_source = "seller_config"
        elif DEFAULT_ACCESS_TOKEN:
            self.access_token = DEFAULT_ACCESS_TOKEN
            token_source = "env_default"
        else:
            self.access_token = None
            token_source = "NONE_AVAILABLE"

        self.api_base = f"https://graph.facebook.com/{API_VERSION}/{self.phone_number_id}"
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        # Log token availability (not the actual token for security)
        token_status = "SET" if self.access_token else "MISSING"
        logger.info(f"WhatsAppBusinessOutput initialized for store: {self.store_name} (ID: {self.store_id}), token_source: {token_source}, token: {token_status}")

    def _send_request(self, endpoint: Text, payload: Dict[Text, Any]) -> Dict[Text, Any]:
        """Send request to WhatsApp Business API"""
        try:
            url = f"{self.api_base}/{endpoint}"
            logger.info(f"Sending WhatsApp request to {url}")
            logger.debug(f"Payload: {json.dumps(payload, indent=2)}")

            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            response.raise_for_status()

            result = response.json()
            logger.info(f"WhatsApp API Success: {result.get('messages', [{}])[0].get('id', 'unknown')}")
            return result
        except requests.exceptions.HTTPError as e:
            logger.error(f"WhatsApp API HTTP Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {e}")
            raise

    async def send_text_message(self, recipient_id: Text, text: Text, **kwargs: Any) -> None:
        """Send a text message"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_id,
                "type": "text",
                "text": {"preview_url": False, "body": text}
            }
            self._send_request("messages", payload)
        except Exception as e:
            logger.error(f"Error sending text message: {e}")

    async def send_buttons(
        self, recipient_id: Text, text: Text, buttons: List[Dict[Text, Text]], **kwargs: Any
    ) -> None:
        """Send interactive buttons (max 3)"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            buttons = buttons[:3]
            formatted_buttons = [
                {
                    "type": "reply",
                    "reply": {
                        "id": btn.get("id", btn.get("payload", "")),
                        "title": btn.get("title", "")[:20]
                    }
                }
                for btn in buttons
            ]

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_id,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": text},
                    "action": {"buttons": formatted_buttons}
                }
            }

            if kwargs.get("header"):
                payload["interactive"]["header"] = {"type": "text", "text": kwargs["header"]}
            if kwargs.get("footer"):
                payload["interactive"]["footer"] = {"text": kwargs["footer"]}

            self._send_request("messages", payload)
        except Exception as e:
            logger.error(f"Error sending buttons: {e}")

    async def send_list_message(
        self, recipient_id: Text, text: Text, button_text: Text,
        sections: List[Dict[Text, Any]], **kwargs: Any
    ) -> None:
        """Send a list message"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            formatted_sections = []
            for section in sections:
                rows = [
                    {
                        "id": row.get("id", ""),
                        "title": row.get("title", "")[:24],
                        "description": row.get("description", "")[:72]
                    }
                    for row in section.get("rows", [])[:10]
                ]
                formatted_sections.append({
                    "title": section.get("title", "")[:24],
                    "rows": rows
                })

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_id,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "body": {"text": text},
                    "action": {
                        "button": button_text[:20],
                        "sections": formatted_sections
                    }
                }
            }

            if kwargs.get("header"):
                payload["interactive"]["header"] = {"type": "text", "text": kwargs["header"]}
            if kwargs.get("footer"):
                payload["interactive"]["footer"] = {"text": kwargs["footer"]}

            self._send_request("messages", payload)
        except Exception as e:
            logger.error(f"Error sending list message: {e}")

    async def send_product_list(
        self, recipient_id: Text, catalog_id: Text, sections: List[Dict[Text, Any]],
        body_text: Text, header_text: Text, **kwargs: Any
    ) -> None:
        """Send native WhatsApp product list (Multi-Product Message)"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            # Use seller's catalog_id if not provided
            catalog_id = catalog_id or self.catalog_id

            if not catalog_id:
                logger.error("No catalog_id available for product list")
                await self.send_text_message(recipient_id, body_text)
                return

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_id,
                "type": "interactive",
                "interactive": {
                    "type": "product_list",
                    "header": {"type": "text", "text": header_text},
                    "body": {"text": body_text},
                    "action": {
                        "catalog_id": catalog_id,
                        "sections": sections
                    }
                }
            }

            self._send_request("messages", payload)
            logger.info(f"Product list sent with catalog: {catalog_id}")
        except Exception as e:
            logger.error(f"Error sending product list: {e}")

    async def send_cta_url_button(
        self, recipient_id: Text, text: Text, button_text: Text, url: Text, **kwargs: Any
    ) -> None:
        """Send CTA URL button"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_id,
                "type": "interactive",
                "interactive": {
                    "type": "cta_url",
                    "body": {"text": text},
                    "action": {
                        "name": "cta_url",
                        "parameters": {
                            "display_text": button_text[:20],
                            "url": url
                        }
                    }
                }
            }

            if kwargs.get("header"):
                payload["interactive"]["header"] = {"type": "text", "text": kwargs["header"]}
            if kwargs.get("footer"):
                payload["interactive"]["footer"] = {"text": kwargs["footer"]}

            self._send_request("messages", payload)
        except Exception as e:
            logger.error(f"Error sending CTA URL button: {e}")

    async def send_image_url(self, recipient_id: Text, image: Text, **kwargs: Any) -> None:
        """Send an image"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_id,
                "type": "image",
                "image": {"link": image}
            }

            if kwargs.get("caption"):
                payload["image"]["caption"] = kwargs["caption"]

            self._send_request("messages", payload)
        except Exception as e:
            logger.error(f"Error sending image: {e}")

    async def send_product_card(
        self, recipient_id: Text, header: Text, body: Text,
        image_url: Text, buttons: List[Dict[Text, Text]], **kwargs: Any
    ) -> None:
        """Send product card (image + buttons)"""
        try:
            await self.send_image_url(recipient_id, image_url, caption=f"*{header}*\n\n{body}")
            if buttons:
                await self.send_buttons(recipient_id, "What would you like to do?", buttons)
        except Exception as e:
            logger.error(f"Error sending product card: {e}")

    async def send_custom_json(self, recipient_id: Text, json_message: Dict[Text, Any], **kwargs: Any) -> None:
        """Handle custom JSON messages from Rasa actions"""
        try:
            if recipient_id.startswith("whatsapp:"):
                recipient_id = recipient_id.replace("whatsapp:", "")

            message_type = json_message.get("type", "text")

            if message_type == "buttons":
                await self.send_buttons(
                    recipient_id, json_message.get("text", ""),
                    json_message.get("buttons", []),
                    header=json_message.get("header"),
                    footer=json_message.get("footer")
                )
            elif message_type == "list":
                await self.send_list_message(
                    recipient_id, json_message.get("text", ""),
                    json_message.get("button_text", "View Options"),
                    json_message.get("sections", []),
                    header=json_message.get("header"),
                    footer=json_message.get("footer")
                )
            elif message_type == "product_list":
                await self.send_product_list(
                    recipient_id,
                    json_message.get("catalog_id"),
                    json_message.get("sections"),
                    json_message.get("body"),
                    json_message.get("header")
                )
            elif message_type == "product_card":
                await self.send_product_card(
                    recipient_id, json_message.get("header", ""),
                    json_message.get("body", ""),
                    json_message.get("image", ""),
                    json_message.get("buttons", [])
                )
            elif message_type == "cta_url":
                await self.send_cta_url_button(
                    recipient_id, json_message.get("text", ""),
                    json_message.get("button_text", "Open Link"),
                    json_message.get("url", ""),
                    header=json_message.get("header"),
                    footer=json_message.get("footer")
                )
            elif message_type == "image":
                await self.send_image_url(
                    recipient_id, json_message.get("image", ""),
                    caption=json_message.get("caption", "")
                )
            else:
                await self.send_text_message(recipient_id, json_message.get("text", ""))
        except Exception as e:
            logger.error(f"Error sending custom JSON message: {e}")


class WhatsAppBusinessInput(InputChannel):
    """
    Multi-Tenant WhatsApp Business API input channel
    Handles webhooks for multiple sellers
    """

    @classmethod
    def name(cls) -> Text:
        return "whatsapp_business"

    @classmethod
    def from_credentials(cls, credentials: Optional[Dict[Text, Any]]) -> InputChannel:
        if not credentials:
            cls.raise_missing_credentials_exception()

        return cls(
            credentials.get("phone_number_id"),
            credentials.get("access_token"),
            credentials.get("verify_token"),
        )

    def __init__(
        self,
        phone_number_id: Text = None,
        access_token: Text = None,
        verify_token: Text = None
    ) -> None:
        self.phone_number_id = phone_number_id or DEFAULT_PHONE_NUMBER_ID
        self.access_token = access_token or DEFAULT_ACCESS_TOKEN
        self.verify_token = verify_token or VERIFY_TOKEN

    def blueprint(self, on_new_message: callable) -> Blueprint:
        """Create blueprint for WhatsApp webhook"""
        whatsapp_webhook = Blueprint("whatsapp_business_webhook")

        @whatsapp_webhook.route("/webhook", methods=["GET"])
        async def verify_webhook(request: Request) -> response.HTTPResponse:
            """Verify webhook with Meta"""
            try:
                mode = request.args.get("hub.mode")
                token = request.args.get("hub.verify_token")
                challenge = request.args.get("hub.challenge")

                logger.info(f"Webhook verification: mode={mode}")

                if mode == "subscribe" and token == self.verify_token:
                    logger.info("Webhook verified successfully!")
                    return response.text(challenge)
                else:
                    logger.warning("Webhook verification failed!")
                    return response.text("Forbidden", status=403)
            except Exception as e:
                logger.error(f"Error in webhook verification: {e}")
                return response.text("Error", status=500)

        @whatsapp_webhook.route("/webhook", methods=["POST"])
        async def receive_message(request: Request) -> response.HTTPResponse:
            """Handle incoming WhatsApp messages - MULTI-TENANT"""
            try:
                body = request.json
                logger.info(f"Received webhook: {json.dumps(body, indent=2)}")

                # Extract data
                entry = body.get("entry", [])
                if not entry:
                    return response.json({"status": "ok"})

                changes = entry[0].get("changes", [])
                if not changes:
                    return response.json({"status": "ok"})

                value = changes[0].get("value", {})
                messages = value.get("messages", [])

                if not messages:
                    return response.json({"status": "ok"})

                message = messages[0]
                sender = message.get("from")
                message_type = message.get("type")

                # ============================================
                # MULTI-TENANT: Get seller by phone_number_id
                # ============================================
                webhook_metadata = value.get("metadata", {})
                incoming_phone_number_id = webhook_metadata.get("phone_number_id", "")
                display_phone_number = webhook_metadata.get("display_phone_number", "")

                logger.info(f"Incoming phone_number_id: {incoming_phone_number_id}")
                logger.info(f"Display phone number: {display_phone_number}")

                # ============================================
                # MULTI-TENANT: Try multiple lookup methods
                # ============================================
                store_info = None

                # Method 1: Try lookup by phone_number_id first (Meta's ID)
                if incoming_phone_number_id:
                    store_info = get_seller_by_phone_number_id(incoming_phone_number_id)
                    if store_info:
                        logger.info(f"MULTI-TENANT: Found by phone_number_id: '{store_info.get('store_name')}' (ID: {store_info.get('store_id')}), has_token: {bool(store_info.get('access_token'))}")

                # Method 2: Try display phone number lookup if:
                # - Method 1 failed completely, OR
                # - Method 1 returned store_info but without access_token (fallback/incomplete data)
                if display_phone_number and (not store_info or not store_info.get('access_token')):
                    store_info_by_phone = get_store_from_phone(display_phone_number)
                    if store_info_by_phone:
                        logger.info(f"MULTI-TENANT: Found by display_phone: '{store_info_by_phone.get('store_name')}' (ID: {store_info_by_phone.get('store_id')}), has_token: {bool(store_info_by_phone.get('access_token'))}")
                        # Use this if it has token OR if method 1 returned nothing
                        if store_info_by_phone.get('access_token') or not store_info:
                            store_info = store_info_by_phone

                if not store_info:
                    logger.warning("MARKETPLACE MODE: No seller mapping found")

                # Extract message content
                message_text = ""
                metadata = {}

                if message_type == "text":
                    message_text = message.get("text", {}).get("body", "")

                elif message_type == "interactive":
                    interactive = message.get("interactive", {})
                    interactive_type = interactive.get("type")

                    if interactive_type == "button_reply":
                        button_reply = interactive.get("button_reply", {})
                        button_id = button_reply.get("id", "")
                        button_title = button_reply.get("title", "")

                        # Map button IDs to intents
                        button_mapping = {
                            "browse_products": "/browse_store_products",
                            "login": "/login",
                            "register": "/register",
                            "view_cart": "/view_cart",
                            "my_orders": "/track_my_orders",
                            "add_to_cart": "add to cart",
                            "find_stores": "find stores near me",
                            "checkout": "/get_address",
                            "clear_cart": "/clear_cart",
                            "no_thanks": "no thanks",
                            "pay_now": "Pay Now",
                            "check_payment": "/check_payment_status",
                            "view_coupons": "/view_coupons",
                            "apply_coupon": "/view_coupons",
                            "confirm_order_pay": "/confirm_order_and_pay",
                            "change_address": "/show_user_addresses",
                            "share_location": "/prompt_share_location",
                            "type_address": "/prompt_type_address",
                            "confirm_yes": "/affirm",
                            "confirm_no": "/deny",
                            "track_order": "/track_order",
                            "continue_shopping": "/greet",
                        }

                        if button_id.startswith("select_address_"):
                            address_id = button_id.replace("select_address_", "")
                            message_text = f"/select_delivery_address{{{address_id}}}"
                            metadata["selected_address_id"] = address_id
                        elif button_id.startswith("/"):
                            # Button payload is already an intent - use directly
                            message_text = button_id
                            logger.info(f"Using button payload directly as intent: {button_id}")
                        else:
                            message_text = button_mapping.get(button_id, button_title)

                        metadata["button_payload"] = button_id
                        metadata["interaction_type"] = "button"

                    elif interactive_type == "list_reply":
                        list_reply = interactive.get("list_reply", {})
                        list_item_id = list_reply.get("id", "")
                        list_item_title = list_reply.get("title", "")

                        list_mapping = {
                            "browse_products": "/browse_store_products",
                            "clear_cart": "/clear_cart",
                            "view_cart": "/view_cart",
                            "my_orders": "/track_my_orders",
                            "view_wishlist": "/view_wishlist",
                            "search_products": "/search_products",
                            "checkout": "/get_address",
                            "share_location": "/prompt_share_location",
                            "type_address": "/prompt_type_address",
                        }

                        if list_item_id.startswith("product_"):
                            message_text = "/select_product"
                            metadata["original_title"] = list_item_title
                        elif list_item_id.startswith("select_address_"):
                            address_id = list_item_id.replace("select_address_", "")
                            message_text = "/select_delivery_address"
                            metadata["selected_address_id"] = address_id
                        elif list_item_id.startswith("apply_coupon_"):
                            coupon_code = list_item_id.replace("apply_coupon_", "")
                            message_text = f'/apply_coupon{{"coupon_code": "{coupon_code}"}}'
                            metadata["coupon_code"] = coupon_code
                        elif list_item_id.startswith("/"):
                            # List item ID is already an intent - use directly
                            message_text = list_item_id
                            logger.info(f"Using list item ID directly as intent: {list_item_id}")
                        else:
                            message_text = list_mapping.get(list_item_id, list_item_title)

                        metadata["list_item_id"] = list_item_id
                        metadata["interaction_type"] = "list"

                elif message_type == "order":
                    # Native WhatsApp cart order
                    order_data = message.get("order", {})
                    product_items = order_data.get("product_items", [])

                    metadata["order_type"] = "native_whatsapp_cart"
                    metadata["catalog_id"] = order_data.get("catalog_id", "")
                    metadata["order_items"] = product_items
                    metadata["interaction_type"] = "order"
                    metadata["order_total_items"] = sum(item.get("quantity", 1) for item in product_items)
                    metadata["order_total_amount"] = sum(
                        float(item.get("item_price", 0)) * int(item.get("quantity", 1))
                        for item in product_items
                    )

                    message_text = "/whatsapp_native_order"
                    logger.info(f"Native order: {metadata['order_total_items']} items")

                elif message_type == "location":
                    location_data = message.get("location", {})

                    metadata["location_type"] = "shared"
                    metadata["latitude"] = location_data.get("latitude")
                    metadata["longitude"] = location_data.get("longitude")
                    metadata["location_name"] = location_data.get("name", "")
                    metadata["location_address"] = location_data.get("address", "")
                    metadata["interaction_type"] = "location"

                    message_text = "/provide_delivery_location"

                else:
                    logger.warning(f"Unsupported message type: {message_type}")
                    return response.json({"status": "ok"})

                if not sender or not message_text:
                    return response.json({"status": "ok"})

                logger.info(f"Processing: {sender} -> {message_text}")

                # ============================================
                # MULTI-TENANT: Create output with seller's credentials
                # ============================================
                if store_info and store_info.get("phone_number_id"):
                    # Use store's credentials - pass full seller_config for metadata
                    # WhatsAppBusinessOutput will fallback to DEFAULT_ACCESS_TOKEN if token is None
                    out_channel = WhatsAppBusinessOutput(
                        phone_number_id=store_info.get("phone_number_id"),
                        access_token=store_info.get("access_token"),  # Can be None, will fallback
                        seller_config=store_info  # Pass full config for store_name, store_id, catalog_id
                    )
                    metadata["store_id"] = store_info.get("store_id")
                    metadata["store_name"] = store_info.get("store_name")
                    metadata["catalog_id"] = store_info.get("catalog_id")
                    metadata["is_dedicated_bot"] = True
                    logger.info(f"Using credentials for {store_info.get('store_name')} (ID: {store_info.get('store_id')})")
                else:
                    # Fallback to default credentials (marketplace mode)
                    out_channel = WhatsAppBusinessOutput(
                        phone_number_id=incoming_phone_number_id or self.phone_number_id,
                        access_token=self.access_token
                    )
                    metadata["is_dedicated_bot"] = False
                    logger.info("Using static credentials (marketplace mode)")

                metadata["bot_phone_number"] = display_phone_number
                metadata["phone_number_id"] = incoming_phone_number_id

                # Create user message
                user_msg = UserMessage(
                    text=message_text,
                    output_channel=out_channel,
                    sender_id=sender,
                    input_channel=self.name(),
                    metadata=metadata
                )

                # Send to Rasa
                await on_new_message(user_msg)

                return response.json({"status": "ok"})

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
                return response.json({"status": "error", "message": str(e)})

        return whatsapp_webhook


# Helper functions (unchanged)
def send_whatsapp_buttons(phone: str, text: str, buttons: List[Dict[str, str]], **kwargs):
    """Helper to send buttons from Rasa actions"""
    output = WhatsAppBusinessOutput()
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(output.send_buttons(phone, text, buttons, **kwargs))


def send_whatsapp_list(phone: str, text: str, button_text: str, sections: List[Dict], **kwargs):
    """Helper to send list messages from Rasa actions"""
    output = WhatsAppBusinessOutput()
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(output.send_list_message(phone, text, button_text, sections, **kwargs))


def send_whatsapp_product_card(phone: str, header: str, body: str, image_url: str, buttons: List[Dict]):
    """Helper to send product cards from Rasa actions"""
    output = WhatsAppBusinessOutput()
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(output.send_product_card(phone, header, body, image_url, buttons))
