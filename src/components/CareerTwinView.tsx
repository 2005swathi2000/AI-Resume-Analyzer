'use client';

import React from 'react';
import { CareerTwin, CareerTwinNode } from '../types/analyzer';
import { CheckCircle, AlertTriangle, XCircle, ArrowRightLeft } from 'lucide-react';

interface CareerTwinViewProps {
  careerTwin: CareerTwin;
  candidateName: string;
  jobTitle: string;
}

export default function CareerTwinView({ careerTwin, candidateName, jobTitle }: CareerTwinViewProps) {
  const allNodes: CareerTwinNode[] = [
    ...careerTwin.technicalNodes,
    ...careerTwin.projectNodes,
    ...careerTwin.experienceNodes,
    ...careerTwin.educationNodes,
  ];

  const getStatusBadge = (status: CareerTwinNode['status']) => {
    switch (status) {
      case 'STRONG':
        return (
          <span className="status-badge status-strong">
            <CheckCircle style={{ width: 12, height: 12 }} /> ✓ VERIFIED MATCH
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="status-badge status-partial">
            <AlertTriangle style={{ width: 12, height: 12 }} /> ⚠ PARTIAL EVIDENCE
          </span>
        );
      case 'NOT_DETECTED':
      default:
        return (
          <span className="status-badge status-missing">
            <XCircle style={{ width: 12, height: 12 }} /> ✕ NOT DETECTED
          </span>
        );
    }
  };

  return (
    <div className="console-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            👤 SIGNATURE FEATURE — CAREER TWIN ALIGNMENT
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Comparing target role expectations ({jobTitle}) against {candidateName}&apos;s verified career profile.
          </p>
        </div>

        <div style={{ background: 'var(--accent-glow)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
          Alignment: {careerTwin.alignmentPct}%
        </div>
      </div>

      <div style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '20px' }}>
        💡 {careerTwin.summaryMessage}
      </div>

      {/* Visual Alignment Table/Map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: '12px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <div>TARGET JOB REQUIREMENT</div>
          <div style={{ textAlign: 'center' }}>ENGINE</div>
          <div>YOUR CAREER PROFILE</div>
        </div>

        {allNodes.slice(0, 10).map((node, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 1fr',
              gap: '12px',
              alignItems: 'center',
              background: 'var(--surface-elevated)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Left: Target Requirement */}
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{node.capability}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{node.category}</div>
            </div>

            {/* Center: Match Connector */}
            <div style={{ display: 'flex', justifyContent: 'center', color: node.status === 'STRONG' ? 'var(--success)' : node.status === 'PARTIAL' ? 'var(--warning)' : 'var(--danger)' }}>
              <ArrowRightLeft style={{ width: 16, height: 16 }} />
            </div>

            {/* Right: Candidate Twin Result */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div>
                {getStatusBadge(node.status)}
                {node.evidenceSnippet && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    &quot;{node.evidenceSnippet.substring(0, 50)}...&quot;
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
