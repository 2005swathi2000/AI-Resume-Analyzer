import { processCommonChatService, IncomingBotMessage, BotResponse } from '../common-chat-service';

interface DiscordPayload {
  member?: { user?: { id?: string | number; username?: string } };
  author?: { id?: string | number; username?: string };
  user?: { id?: string | number; username?: string };
  data?: { options?: Array<{ value?: string }>; name?: string };
  content?: string;
}

export async function handleDiscordWebhook(body: Record<string, unknown> | null | undefined): Promise<BotResponse | null> {
  if (!body) return null;
  const payload = body as DiscordPayload;

  // Handle Discord Interaction / Slash Command / Message
  const senderId = String(payload.member?.user?.id || payload.author?.id || payload.user?.id || 'unknown_discord_user');
  const senderName = payload.member?.user?.username || payload.author?.username || payload.user?.username || 'Discord User';
  const text = payload.data?.options?.[0]?.value || payload.data?.name || payload.content || '/analyze';

  const incomingMessage: IncomingBotMessage = {
    platform: 'discord',
    senderId,
    senderName,
    text,
  };

  return processCommonChatService(incomingMessage);
}
