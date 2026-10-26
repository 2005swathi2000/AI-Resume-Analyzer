import { processCommonChatService, IncomingBotMessage, BotResponse } from '../common-chat-service';

interface WhatsAppMessage {
  from?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string } };
}

interface WhatsAppContact {
  profile?: { name?: string };
}

interface WhatsAppValue {
  messages?: WhatsAppMessage[];
  contacts?: WhatsAppContact[];
}

interface WhatsAppPayload extends WhatsAppValue {
  entry?: Array<{
    changes?: Array<{
      value?: WhatsAppValue;
    }>;
  }>;
  message?: WhatsAppMessage;
  from?: string;
  name?: string;
  text?: string;
}

export async function handleWhatsAppWebhook(body: Record<string, unknown> | null | undefined): Promise<BotResponse | null> {
  if (!body) return null;
  const payload = body as WhatsAppPayload;

  const value = payload.entry?.[0]?.changes?.[0]?.value || payload;
  const message = value.messages?.[0] || payload.message;
  if (!message && !payload.text) return null;

  const senderId = String(message?.from || payload.from || 'unknown_wa_user');
  const senderName = value.contacts?.[0]?.profile?.name || payload.name || 'WhatsApp User';
  const text = message?.text?.body || message?.button?.text || message?.interactive?.button_reply?.title || payload.text || 'START';

  const incomingMessage: IncomingBotMessage = {
    platform: 'whatsapp',
    senderId,
    senderName,
    text,
  };

  const response = await processCommonChatService(incomingMessage);

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (accessToken && phoneNumberId && senderId && response) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: senderId,
          type: 'text',
          text: { body: response.replyText },
        }),
      });
    } catch (err) {
      console.error('Error sending WhatsApp Cloud API message:', err);
    }
  }

  return response;
}
