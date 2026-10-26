'use client';

import React, { useState, useEffect } from 'react';
import { X, Smartphone, Sparkles, ShieldCheck, Link2 } from 'lucide-react';

export type BotPlatform = 'telegram' | 'discord' | 'whatsapp' | 'google-chat';

interface BotConnectModalProps {
  platform: BotPlatform | null;
  sessionId?: string | null;
  onClose: () => void;
}

export default function BotConnectModal({ platform, sessionId, onClose }: BotConnectModalProps) {
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'CareerCopilotBot';
  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER || '15551234567';

  const startParam = sessionId ? sessionId : 'START';

  const details = platform
    ? {
        telegram: {
          title: '✈️ Telegram Bot Connection',
          color: '#38bdf8',
          webhook: '/api/webhooks/telegram',
          appScheme: `tg://resolve?domain=${telegramBotUsername}&start=${startParam}`,
          launchUrl: `https://t.me/${telegramBotUsername}?start=${startParam}`,
          command: sessionId ? `/start ${sessionId}` : '/start',
          instruction: 'Tap below to open Telegram app directly with your active Career Intelligence session attached.',
          buttonText: '🚀 Open Telegram & Start',
        },
        discord: {
          title: '💬 Discord Bot Connection',
          color: '#818cf8',
          webhook: '/api/webhooks/discord',
          appScheme: 'discord://',
          launchUrl: process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.com/app',
          command: sessionId ? `/start ${sessionId}` : '/start',
          instruction: 'Join the Career Copilot Discord Bot server to receive automated alerts and analysis summaries.',
          buttonText: '🚀 Open Discord & Start',
        },
        whatsapp: {
          title: '🟢 WhatsApp Bot Connection',
          color: '#34d399',
          webhook: '/api/webhooks/whatsapp',
          appScheme: `whatsapp://send?phone=${whatsappPhone}&text=START%20${startParam}`,
          launchUrl: `https://wa.me/${whatsappPhone}?text=START%20${startParam}`,
          command: sessionId ? `START ${sessionId}` : 'START',
          instruction: 'Open WhatsApp directly to start your Career Copilot conversation with pre-filled session payload.',
          buttonText: '🚀 Open WhatsApp & Start',
        },
        'google-chat': {
          title: '🔷 Google Chat App Connection',
          color: '#f472b6',
          webhook: '/api/webhooks/google-chat',
          appScheme: 'googlechat://',
          launchUrl: process.env.NEXT_PUBLIC_GOOGLE_CHAT_SPACE_URL || 'https://chat.google.com/',
          command: sessionId ? `/start ${sessionId}` : 'START',
          instruction: 'Open Google Chat to interact with Career Copilot inside your team workspace space.',
          buttonText: '🚀 Open Google Chat & Start',
        },
      }[platform]
    : null;

  useEffect(() => {
    if (!platform || !details) return;
    let isMounted = true;
    const webhook = details.webhook;
    const command = details.command;

    const runTest = async () => {
      setIsTesting(true);
      try {
        const res = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              text: command,
              from: { id: 'web_session_user', first_name: 'Candidate' },
            },
          }),
        });
        const json = await res.json();
        if (isMounted) {
          if (json.text) setTestOutput(json.text);
          else setTestOutput('Bot response output generated successfully.');
        }
      } catch {
        if (isMounted) setTestOutput('Error fetching bot response.');
      } finally {
        if (isMounted) setIsTesting(false);
      }
    };

    runTest();

    return () => {
      isMounted = false;
    };
  }, [platform, sessionId, details]);

  if (!platform || !details) return null;

  const handleLaunchApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = details.appScheme;
      setTimeout(() => {
        window.open(details.launchUrl, '_blank');
      }, 1200);
    } else {
      window.open(details.launchUrl, '_blank');
    }
  };

  const handleCopyOutput = () => {
    if (!testOutput) return;
    navigator.clipboard.writeText(testOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="console-card"
        style={{
          maxWidth: '560px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: `2px solid ${details.color}`,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: details.color, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {details.title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X style={{ width: 20 }} />
          </button>
        </div>

        {sessionId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
            <Link2 style={{ width: 16, color: '#38bdf8' }} />
            <span>Active Session Linked: <code style={{ color: '#38bdf8', fontWeight: 700 }}>{sessionId}</code></span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
            <ShieldCheck style={{ width: 16, color: '#eab308' }} />
            <span>No session linked yet — Launch will start standard bot setup flow.</span>
          </div>
        )}

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          {details.instruction}
        </p>

        {/* Live Bot Response Window */}
        <div style={{ marginBottom: '16px', background: 'var(--surface-elevated)', borderRadius: '8px', border: '1px solid var(--border)', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: 14 }} /> Real Bot Response Payload:
            </span>
            {testOutput && (
              <button
                onClick={handleCopyOutput}
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700 }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Text'}
              </button>
            )}
          </div>

          {isTesting ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
              ⏳ Communicating with Career Copilot service...
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '220px', overflowY: 'auto', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
              {testOutput}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>Webhook: <code style={{ color: 'var(--accent-primary)' }}>{details.webhook}</code></div>
          <div>Trigger Command: <strong style={{ color: 'var(--text-primary)' }}>&quot;{details.command}&quot;</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            onClick={handleLaunchApp}
            className="btn btn-hero"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Smartphone style={{ width: 16 }} />
            {details.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
