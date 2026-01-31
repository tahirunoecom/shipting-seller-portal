# actions/whatsapp_connector.py
import json
import logging
from typing import Text, List, Dict, Any, Optional
from sanic import response
from sanic.request import Request
from sanic.blueprints import Blueprint
from rasa.core.channels.channel import InputChannel, UserMessage, OutputChannel
from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class TwilioWhatsAppOutput(OutputChannel):
    """Output channel for Twilio WhatsApp"""

    @classmethod
    def name(cls) -> Text:
        return "twilio_whatsapp"

    def __init__(self, account_sid: Text, auth_token: Text, whatsapp_number: Text) -> None:
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.whatsapp_number = whatsapp_number
        self.client = Client(account_sid, auth_token)

    async def send_text_message(
        self, recipient_id: Text, text: Text, **kwargs: Any
    ) -> None:
        """Send a text message to the user."""
        try:
            if not recipient_id.startswith("whatsapp:"):
                recipient_id = f"whatsapp:{recipient_id}"
            
            self.client.messages.create(
                body=text,
                from_=f"whatsapp:{self.whatsapp_number}",
                to=recipient_id
            )
            logger.info(f"Message sent to {recipient_id}")
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def send_image_url(
        self, recipient_id: Text, image: Text, **kwargs: Any
    ) -> None:
        """Send an image to the user."""
        try:
            if not recipient_id.startswith("whatsapp:"):
                recipient_id = f"whatsapp:{recipient_id}"
            
            self.client.messages.create(
                media_url=[image],
                from_=f"whatsapp:{self.whatsapp_number}",
                to=recipient_id
            )
        except Exception as e:
            logger.error(f"Error sending image: {e}")

    async def send_custom_json(
        self, recipient_id: Text, json_message: Dict[Text, Any], **kwargs: Any
    ) -> None:
        """Send buttons as text (WhatsApp doesn't support rich buttons via Twilio)"""
        try:
            if not recipient_id.startswith("whatsapp:"):
                recipient_id = f"whatsapp:{recipient_id}"
            
            if "buttons" in json_message:
                text = json_message.get("text", "")
                buttons = json_message.get("buttons", [])
                
                button_text = "\n\n" + "\n".join([
                    f"{i+1}. {btn.get('title', '')}" 
                    for i, btn in enumerate(buttons)
                ])
                
                message = text + button_text
                
                self.client.messages.create(
                    body=message,
                    from_=f"whatsapp:{self.whatsapp_number}",
                    to=recipient_id
                )
            else:
                await self.send_text_message(recipient_id, json_message.get("text", ""))
                
        except Exception as e:
            logger.error(f"Error sending custom message: {e}")


class TwilioWhatsAppInput(InputChannel):
    """Twilio WhatsApp input channel with store detection support"""

    @classmethod
    def name(cls) -> Text:
        return "twilio_whatsapp"

    @classmethod
    def from_credentials(cls, credentials: Optional[Dict[Text, Any]]) -> InputChannel:
        if not credentials:
            cls.raise_missing_credentials_exception()

        return cls(
            credentials.get("account_sid"),
            credentials.get("auth_token"),
            credentials.get("whatsapp_number"),
        )

    def __init__(self, account_sid: Text, auth_token: Text, whatsapp_number: Text) -> None:
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.whatsapp_number = whatsapp_number

    def blueprint(self, on_new_message: callable) -> Blueprint:
        """Create blueprint for WhatsApp webhook"""
        whatsapp_webhook = Blueprint("whatsapp_webhook")

        @whatsapp_webhook.route("/webhook", methods=["GET"])
        async def verify(request: Request) -> response.HTTPResponse:
            """Handle webhook verification for Meta/Twilio"""
            try:
                # For Meta WhatsApp Business API verification
                mode = request.args.get("hub.mode")
                token = request.args.get("hub.verify_token")
                challenge = request.args.get("hub.challenge")

                # Verify token (you can set this to any string you want)
                VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "rasa_verify_token_123")

                if mode == "subscribe" and token == VERIFY_TOKEN:
                    logger.info("Webhook verified successfully!")
                    return response.text(challenge, status=200)
                else:
                    logger.warning(f"Webhook verification failed. Mode: {mode}, Token: {token}")
                    return response.text("Forbidden", status=403)

            except Exception as e:
                logger.error(f"Error in webhook verification: {e}")
                return response.text("OK", status=200)  # Return OK for simple GET requests

        @whatsapp_webhook.route("/webhook", methods=["POST"])
        async def receive(request: Request) -> response.HTTPResponse:
            """Handle incoming WhatsApp messages from Twilio"""
            try:
                sender = request.form.get("From", "").replace("whatsapp:", "")
                message_text = request.form.get("Body", "")
                
                # ⭐ NEW: Get the bot's phone number that received the message
                to_number = request.form.get("To", "").replace("whatsapp:", "")
                
                if not sender or not message_text:
                    logger.warning("Received empty message or sender")
                    return response.empty(status=200)

                logger.info(f"Received WhatsApp message from {sender} to bot {to_number}: {message_text}")

                out_channel = TwilioWhatsAppOutput(
                    self.account_sid,
                    self.auth_token,
                    self.whatsapp_number
                )

                # ⭐ NEW: Pass bot phone number in metadata for store detection
                metadata = {
                    "bot_phone_number": to_number
                }

                user_msg = UserMessage(
                    text=message_text,
                    output_channel=out_channel,
                    sender_id=sender,
                    input_channel=self.name(),
                    metadata=metadata  # ⭐ Include metadata
                )

                await on_new_message(user_msg)

                return response.empty(status=200)

            except Exception as e:
                logger.error(f"Error processing WhatsApp message: {e}")
                return response.text("ERROR", status=500)

        return whatsapp_webhook