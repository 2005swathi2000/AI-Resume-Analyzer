import { processCommonChatService, IncomingBotMessage, BotResponse } from '../common-chat-service';

interface TelegramMessage {
  chat?: { id?: string | number };
  from?: { id?: string | number; first_name?: string };
  text?: string;
  caption?: string;
  document?: { file_id?: string; file_name?: string };
}

interface TelegramPayload {
  message?: TelegramMessage;
  callback_query?: {
    data?: string;
    from?: { id?: string | number; first_name?: string };
    message?: TelegramMessage;
  };
}

export async function handleTelegramWebhook(body: Record<string, unknown> | null | undefined): Promise<BotResponse | null> {
  if (!body) return null;
  const payloadData = body as TelegramPayload;

  // Handle message or inline button callback query
  const msg = payloadData.message || payloadData.callback_query?.message;
  if (!msg) return null;

  const chatId = payloadData.callback_query?.message?.chat?.id || msg.chat?.id || msg.from?.id;
  const senderId = String(payloadData.callback_query?.from?.id || msg.from?.id || chatId || 'unknown_tg_user');
  const senderName = payloadData.callback_query?.from?.first_name || msg.from?.first_name || 'Telegram User';
  const text = payloadData.callback_query?.data || msg.text || msg.caption || '/start';

  let attachmentText: string | undefined = undefined;
  if (msg.document) {
    const fileId = msg.document.file_id;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token && fileId) {
      try {
        const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        if (fileData.ok && fileData.result?.file_path) {
          const contentRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
          const fileContent = await contentRes.text();
          if (fileContent && fileContent.trim().length > 10) {
            attachmentText = fileContent;
          }
        }
      } catch (err) {
        console.error('Error fetching Telegram document content:', err);
      }
    }
    if (!attachmentText) {
      attachmentText = `Resume File: ${msg.document.file_name || 'Uploaded_Resume.pdf'}\n${msg.caption || ''}`;
    }
  }

  const incomingMessage: IncomingBotMessage = {
    platform: 'telegram',
    senderId,
    senderName,
    text,
    attachmentText,
  };

  const response = await processCommonChatService(incomingMessage);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token && chatId && response) {
    try {
      const inlineKeyboard = response.buttons?.map((b) => [
        b.webAppUrl
          ? { text: b.label, web_app: { url: b.webAppUrl } }
          : { text: b.label, callback_data: b.action },
      ]);

      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text: response.replyText,
        parse_mode: 'Markdown',
      };

      if (inlineKeyboard && inlineKeyboard.length > 0) {
        payload.reply_markup = { inline_keyboard: inlineKeyboard };
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!resData.ok) {
        // Fallback without Markdown if Telegram Markdown parsing failed
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: response.replyText.replace(/[*_`]/g, ''),
            reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
          }),
        });
      }
    } catch (err) {
      console.error('Error sending Telegram message:', err);
    }
  }

  return response;
}

