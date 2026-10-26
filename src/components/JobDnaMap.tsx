'use client';

import React, { useState } from 'react';
import { JobDna, EvidenceItem, JobDnaMapNode, DnaClusterCategory } from '../types/analyzer';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface JobDnaMapProps {
  jobDna: JobDna;
  rawEvidence: EvidenceItem[];
  jobTitle: string;
}

interface PositionedNode extends JobDnaMapNode {
  x: number;
  y: number;
  ring: number;
  angleDeg: number;
  labelAnchor: 'start' | 'middle' | 'end';
  labelDx: number;
  labelDy: number;
}

export default function JobDnaMap({ jobDna, rawEvidence, jobTitle }: JobDnaMapProps) {
  const [selectedNode, setSelectedNode] = useState<JobDnaMapNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activeClusterFilter, setActiveClusterFilter] = useState<string>('ALL');

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Convert JobDna items into structured map nodes
  const mapNodes: JobDnaMapNode[] = jobDna.dnaItems.map((item, idx) => {
    const ev = rawEvidence.find(
      (e) => e.requirement.toLowerCase() === item.name.toLowerCase() || e.requirement.toLowerCase().includes(item.name.toLowerCase())
    );

    let matchStatus: JobDnaMapNode['matchStatus'] = 'NOT DETECTED';
    let confidence = 0;
    let scoreContribution = -item.weightPct * 0.1;
    let resumeEvidence = 'Not detected in resume';

    if (ev) {
      confidence = ev.confidence;
      scoreContribution = ev.scoreContribution;
      resumeEvidence = ev.foundEvidence;
      if (ev.status === 'MATCHED') {
        matchStatus = ev.matchType === 'EXACT' ? 'EXACT MATCH' : 'SEMANTIC MATCH';
      } else if (ev.status === 'PARTIALLY_MATCHED') {
        matchStatus = 'PARTIAL EVIDENCE';
      }
    }

    const cluster = getCategoryCluster(item.category, item.name);

    return {
      id: `node-${idx}-${item.name}`,
      name: item.name,
      cluster,
      importance: item.priority,
      matchStatus,
      confidence,
      scoreContribution: Math.round(scoreContribution * 10) / 10,
      resumeEvidence,
      recommendedAction:
        matchStatus === 'NOT DETECTED'
          ? `Gain genuine ${item.name} hands-on experience and document it through a project.`
          : matchStatus === 'PARTIAL EVIDENCE'
          ? `Quantify your experience with ${item.name} with specific metrics.`
          : undefined,
    };
  });

  const clusters: DnaClusterCategory[] = ['TECH STACK', 'EXPERIENCE', 'RESPONSIBILITIES', 'EDUCATION', 'TOOLS', 'SOFT SKILLS', 'DOMAIN', 'CERTIFICATIONS'];

  // Filter nodes
  const visibleNodes = activeClusterFilter === 'ALL'
    ? mapNodes
    : mapNodes.filter((n) => n.cluster === activeClusterFilter);

  // SVG Canvas Dimensions
  const width = 960;
  const height = 620;
  const centerX = width / 2;
  const centerY = height / 2;

  // Multi-Ring Layout Constants
  const radiusInner = 175;
  const radiusOuter = 275;

  // Calculate clean, non-overlapping deterministic positions
  const N = visibleNodes.length;

  // Sort nodes deterministically so related categories sit near each other
  const sortedNodes = [...visibleNodes].sort((a, b) => {
    if (a.cluster !== b.cluster) return a.cluster.localeCompare(b.cluster);
    return a.importance.localeCompare(b.importance);
  });

  const positionedNodes: PositionedNode[] = sortedNodes.map((node, index) => {
    // Distribute angles evenly around 360 degrees
    const baseAngleRad = (index / Math.max(1, N)) * 2 * Math.PI - Math.PI / 2;
    // Alternate between Inner and Outer Orbit to maximize separation
    const ring = N > 6 ? (index % 2 === 0 ? radiusInner : radiusOuter) : radiusInner;

    const x = Math.round(centerX + ring * Math.cos(baseAngleRad));
    const y = Math.round(centerY + ring * Math.sin(baseAngleRad));

    // Calculate angle in degrees [0, 360)
    let angleDeg = (baseAngleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    // Smart Label Position based on quadrant angle from center
    let labelAnchor: 'start' | 'middle' | 'end' = 'middle';
    let labelDx = 0;
    let labelDy = 0;

    if (angleDeg >= 315 || angleDeg < 45) {
      // Right side
      labelAnchor = 'start';
      labelDx = 22;
      labelDy = 4;
    } else if (angleDeg >= 45 && angleDeg < 135) {
      // Bottom
      labelAnchor = 'middle';
      labelDx = 0;
      labelDy = 26;
    } else if (angleDeg >= 135 && angleDeg < 225) {
      // Left side
      labelAnchor = 'end';
      labelDx = -22;
      labelDy = 4;
    } else {
      // Top
      labelAnchor = 'middle';
      labelDx = 0;
      labelDy = -18;
    }

    return {
      ...node,
      x,
      y,
      ring,
      angleDeg,
      labelAnchor,
      labelDx,
      labelDy,
    };
  });

  // Zoom & Pan Handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(2.0, prev + 0.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, prev - 0.2));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getStatusColor = (status: JobDnaMapNode['matchStatus']) => {
    switch (status) {
      case 'EXACT MATCH':
        return '#10b981'; // Green
      case 'SEMANTIC MATCH':
        return '#3b82f6'; // Blue
      case 'PARTIAL EVIDENCE':
        return '#f59e0b'; // Amber
      case 'NOT DETECTED':
      default:
        return '#ef4444'; // Red
    }
  };

  const getPriorityBadgeClass = (priority: JobDnaMapNode['importance']) => {
    switch (priority) {
      case 'CRITICAL': return 'priority-critical';
      case 'IMPORTANT': return 'priority-important';
      case 'USEFUL': return 'priority-useful';
      case 'BONUS': default: return 'priority-bonus';
    }
  };

  return (
    <div className="console-card">
      {/* Header & Cluster Filter Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧬 JOB DNA MAP — Constellation View
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Balanced 360° constellation map mapped from target Job Description. Click any node to inspect evidence.
          </p>
        </div>

        {/* Cluster Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`prompt-chip ${activeClusterFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => { setActiveClusterFilter('ALL'); handleResetView(); }}
            style={{ fontWeight: activeClusterFilter === 'ALL' ? 700 : 500 }}
          >
            All Clusters ({mapNodes.length})
          </button>
          {clusters.map((c) => {
            const count = mapNodes.filter((n) => n.cluster === c).length;
            if (count === 0) return null;
            return (
              <button
                key={c}
                className="prompt-chip"
                onClick={() => { setActiveClusterFilter(c); handleResetView(); }}
                style={{ fontWeight: activeClusterFilter === c ? 700 : 500, borderColor: activeClusterFilter === c ? 'var(--accent-primary)' : undefined }}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main SVG Graph Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoom Controls Overlay */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '6px', zIndex: 10 }}>
          <button
            onClick={handleZoomIn}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Zoom In"
          >
            <ZoomIn style={{ width: 14, height: 14 }} />
          </button>
          <button
            onClick={handleZoomOut}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Zoom Out"
          >
            <ZoomOut style={{ width: 14, height: 14 }} />
          </button>
          <button
            onClick={handleResetView}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Reset View"
          >
            <RotateCcw style={{ width: 14, height: 14 }} /> Reset
          </button>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minHeight: '480px', maxHeight: '620px', display: 'block' }}
        >
          <defs>
            <radialGradient id="targetRoleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Transform group for Zoom and Pan */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: 'center' }}>
            {/* Concentric Dashed Orbits */}
            <circle cx={centerX} cy={centerY} r={radiusInner} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
            {N > 6 && (
              <circle cx={centerX} cy={centerY} r={radiusOuter} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.4" />
            )}

            {/* Subtle Curved Connecting Lines */}
            {positionedNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const color = getStatusColor(node.matchStatus);

              return (
                <line
                  key={`line-${node.id}`}
                  x1={centerX}
                  y1={centerY}
                  x2={node.x}
                  y2={node.y}
                  stroke={color}
                  strokeWidth={isSelected || isHovered ? '2.5' : '1.2'}
                  strokeOpacity={isSelected || isHovered ? '0.9' : '0.35'}
                />
              );
            })}

            {/* Central TARGET ROLE Node */}
            <circle cx={centerX} cy={centerY} r="54" fill="url(#targetRoleGlow)" />
            <circle cx={centerX} cy={centerY} r="42" fill="var(--bg-secondary)" stroke="var(--accent-primary)" strokeWidth="3" />
            <text x={centerX} y={centerY - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="800">
              TARGET ROLE
            </text>
            <text x={centerX} y={centerY + 12} textAnchor="middle" fill="var(--accent-primary)" fontSize="9" fontWeight="700">
              {jobTitle.length > 18 ? jobTitle.substring(0, 16) + '...' : jobTitle}
            </text>

            {/* Requirement Nodes & Smart Labels */}
            {positionedNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const color = getStatusColor(node.matchStatus);

              // 2-line label split if long
              const nameParts = splitNodeName(node.name);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer Glow Halo on Hover / Select */}
                  {(isSelected || isHovered) && (
                    <circle r="22" fill={color} fillOpacity="0.25" />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={isSelected || isHovered ? '16' : '13'}
                    fill="var(--bg-secondary)"
                    stroke={color}
                    strokeWidth={isSelected || isHovered ? '3' : '2'}
                  />
                  {/* Inner Status Indicator Dot */}
                  <circle r="4" fill={color} />

                  {/* Smart Directional Label */}
                  <text
                    x={node.labelDx}
                    y={node.labelDy}
                    textAnchor={node.labelAnchor}
                    fill="var(--text-primary)"
                    fontSize={isSelected || isHovered ? '11' : '10'}
                    fontWeight={isSelected || isHovered ? '800' : '600'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {nameParts[0]}
                    {nameParts.length > 1 && (
                      <tspan x={node.labelDx} dy="12" textAnchor={node.labelAnchor}>
                        {nameParts[1]}
                      </tspan>
                    )}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Node Details Inspection Overlay */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              maxWidth: '320px',
              background: 'var(--bg-secondary)',
              border: `2px solid ${getStatusColor(selectedNode.matchStatus)}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-glow)',
              zIndex: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedNode.name}</strong>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span className={`priority-tag ${getPriorityBadgeClass(selectedNode.importance)}`}>
                {selectedNode.importance}
              </span>
              <span className="priority-tag" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                {selectedNode.cluster}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
              <strong>Status:</strong>{' '}
              <span style={{ color: getStatusColor(selectedNode.matchStatus), fontWeight: 700 }}>
                {selectedNode.matchStatus}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
              📄 <strong>Resume Evidence:</strong> &quot;{selectedNode.resumeEvidence}&quot;
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Confidence: {selectedNode.confidence}% • Score Impact:{' '}
              <span style={{ color: selectedNode.scoreContribution >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                {selectedNode.scoreContribution >= 0 ? `+${selectedNode.scoreContribution}` : `${selectedNode.scoreContribution}`} pts
              </span>
            </div>

            {selectedNode.recommendedAction && (
              <div style={{ fontSize: '0.8rem', color: 'var(--warning)', background: 'var(--warning-bg)', padding: '8px', borderRadius: '6px' }}>
                💡 <strong>Action:</strong> {selectedNode.recommendedAction}
              </div>
            )}
          </div>
        )}
      </div>

      {/* JOB DNA MAP LEGEND */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <strong>Legend:</strong>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span> ✓ EXACT MATCH
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }}></span> ◐ SEMANTIC MATCH
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></span> ⚠ PARTIAL EVIDENCE
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></span> ✕ NOT DETECTED
        </span>
      </div>
    </div>
  );
}

function splitNodeName(name: string): string[] {
  if (name.length <= 15) return [name];
  const words = name.split(/\s+/);
  if (words.length === 1) return [name.substring(0, 14) + '..'];

  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  return [line1, line2];
}

function getCategoryCluster(category: string, name: string): DnaClusterCategory {
  const cat = (category + ' ' + name).toLowerCase();
  if (cat.includes('language') || cat.includes('framework') || cat.includes('database') || cat.includes('cloud') || cat.includes('ai') || cat.includes('stack')) {
    return 'TECH STACK';
  }
  if (cat.includes('exp') || cat.includes('year') || cat.includes('senior') || cat.includes('lead')) {
    return 'EXPERIENCE';
  }
  if (cat.includes('degree') || cat.includes('bachelor') || cat.includes('master') || cat.includes('education')) {
    return 'EDUCATION';
  }
  if (cat.includes('tool') || cat.includes('git') || cat.includes('jira') || cat.includes('platform')) {
    return 'TOOLS';
  }
  if (cat.includes('certif') || cat.includes('aws certified') || cat.includes('pmp')) {
    return 'CERTIFICATIONS';
  }
  if (cat.includes('soft') || cat.includes('lead') || cat.includes('communication')) {
    return 'SOFT SKILLS';
  }
  if (cat.includes('resp') || cat.includes('build') || cat.includes('manage') || cat.includes('deploy')) {
    return 'RESPONSIBILITIES';
  }
  return 'DOMAIN';
}
