import { processCommonChatService, IncomingBotMessage, BotResponse } from '../common-chat-service';

interface GoogleChatPayload {
  user?: { name?: string; email?: string; displayName?: string };
  message?: {
    sender?: { name?: string; email?: string; displayName?: string };
    text?: string;
  };
  action?: { actionMethodName?: string };
}

export async function handleGoogleChatWebhook(body: Record<string, unknown> | null | undefined): Promise<BotResponse | null> {
  if (!body) return null;
  const payload = body as GoogleChatPayload;

  // Google Chat Event Structure (MESSAGE, CARD_CLICKED, ADDED_TO_SPACE)
  const user = payload.user || payload.message?.sender;
  const senderId = String(user?.name || user?.email || 'unknown_gchat_user');
  const senderName = user?.displayName || 'Google Chat User';
  const text = payload.message?.text || payload.action?.actionMethodName || 'analyze';

  const incomingMessage: IncomingBotMessage = {
    platform: 'google-chat',
    senderId,
    senderName,
    text,
  };

  return processCommonChatService(incomingMessage);
}
