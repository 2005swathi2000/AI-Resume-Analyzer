'use client';

import React from 'react';
import { Lock, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
      <div className="console-card" style={{ maxWidth: '480px', width: '90%', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock style={{ width: 18, color: 'var(--accent-primary)' }} /> Session Privacy Guarantee
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X style={{ width: 18 }} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
          Your uploaded Job Description and Resumes are processed strictly in-memory for the duration of this active session. Documents are never permanently stored on disk.
        </p>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          <strong>Mode Distinction:</strong> When running in <em>Local Engine Mode</em> (default, no Gemini key), 100% of the analysis runs locally with zero external network calls. If an optional <em>Google Gemini API key</em> is configured, relevant resume skills and role requirements are transmitted via HTTPS to Google for conversational coaching and bullet rewrites.
        </p>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--surface-elevated)', padding: '10px 12px', borderRadius: '8px', marginBottom: '20px' }}>
          🔒 In-memory parsing only • Zero persistent document storage
        </div>

        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-hero" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
