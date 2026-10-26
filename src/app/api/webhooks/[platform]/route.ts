import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhook } from '../../../../lib/bot/adapters/telegram';
import { handleDiscordWebhook } from '../../../../lib/bot/adapters/discord';
import { handleGoogleChatWebhook } from '../../../../lib/bot/adapters/google-chat';
import { handleWhatsAppWebhook } from '../../../../lib/bot/adapters/whatsapp';

// GET Handler for Meta WhatsApp Verification Token Handshake
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ platform: string }> }
) {
  const { platform } = await context.params;

  if (platform === 'whatsapp') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'career_intelligence_secret';

    if (mode === 'subscribe' && token === expectedToken) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }

  return NextResponse.json({ success: true, message: `GET webhook endpoint for ${platform}` });
}

// POST Handler for Incoming Webhook Events
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await context.params;
    const body = await req.json().catch(() => ({}));

    // Discord Ping Verification (Type 1)
    if (platform === 'discord' && body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    let response: {
      replyText?: string;
      targetId?: string;
      buttons?: unknown[];
    } | null = null;

    if (platform === 'telegram') {
      response = await handleTelegramWebhook(body);
    } else if (platform === 'discord') {
      response = await handleDiscordWebhook(body);
    } else if (platform === 'google-chat') {
      response = await handleGoogleChatWebhook(body);
    } else if (platform === 'whatsapp') {
      response = await handleWhatsAppWebhook(body);
    } else {
      return NextResponse.json({ success: true, message: `Webhook for ${platform} received.` });
    }

    if (response) {
      return NextResponse.json({
        success: true,
        text: response.replyText,
        targetId: response.targetId,
        buttons: response.buttons,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
