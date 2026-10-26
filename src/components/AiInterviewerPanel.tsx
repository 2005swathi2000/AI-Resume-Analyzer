'use client';

import React, { useState } from 'react';
import {
  InterviewQuestionItem,
  MockAnswerEvaluation,
  InterviewerMode,
  InterviewDifficulty,
} from '../types/analyzer';
import { evaluateMockAnswer } from '../lib/engine/mock-interviewer';
import { Sparkles } from 'lucide-react';

interface AiInterviewerPanelProps {
  questions: InterviewQuestionItem[];
  resumeText?: string;
}

export default function AiInterviewerPanel({ questions, resumeText }: AiInterviewerPanelProps) {
  const [interviewerMode, setInterviewerMode] = useState<InterviewerMode>('Technical Interview');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Intermediate');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<MockAnswerEvaluation | null>(null);

  const filteredQuestions = questions.filter((q) => {
    if (interviewerMode === 'Technical Interview') return q.category === 'Technical' || q.category === 'Coding';
    if (interviewerMode === 'Project Interview') return q.category === 'Project' || q.category === 'Scenario';
    if (interviewerMode === 'Behavioral Interview') return q.category === 'Behavioral' || q.category === 'HR';
    if (interviewerMode === 'System Design') return q.category === 'System Design' || q.category === 'Technical';
    return true;
  });

  const activeQuestions = filteredQuestions.length > 0 ? filteredQuestions : questions;
  const currentQ = activeQuestions[currentQuestionIdx % activeQuestions.length];

  const handleEvaluate = () => {
    if (!candidateAnswer.trim() || !currentQ) return;
    const res = evaluateMockAnswer(currentQ, candidateAnswer, resumeText);
    setEvaluation(res);
  };

  const handleNext = () => {
    setCandidateAnswer('');
    setEvaluation(null);
    setCurrentQuestionIdx((prev) => (prev + 1) % activeQuestions.length);
  };

  return (
    <div className="console-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎤 STRICT AI INTERVIEWER & MOCK PRACTICE
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time answer relevance gating, rubrics, depth analysis, resume consistency checks, and follow-up prompts.
          </p>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={interviewerMode}
            onChange={(e) => setInterviewerMode(e.target.value as InterviewerMode)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <option value="Technical Interview">Technical Interview</option>
            <option value="Project Interview">Project Interview</option>
            <option value="Resume Deep Dive">Resume Deep Dive</option>
            <option value="System Design">System Design</option>
            <option value="Behavioral Interview">Behavioral Interview</option>
            <option value="HR Interview">HR Interview</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as InterviewDifficulty)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {currentQ ? (
        <div style={{ background: 'var(--surface-elevated)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
              QUESTION {currentQuestionIdx + 1} OF {activeQuestions.length} • [{currentQ.category}] • {difficulty}
            </span>
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            &ldquo;{currentQ.question}&rdquo;
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Focus: {currentQ.suggestedFocus}
          </p>

          <textarea
            rows={4}
            placeholder="Type your answer here... Address specific frameworks, implementation choices, and project examples."
            value={candidateAnswer}
            onChange={(e) => setCandidateAnswer(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              marginBottom: '16px',
            }}
          />

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button className="btn btn-hero" onClick={handleEvaluate} disabled={!candidateAnswer.trim()}>
              <Sparkles style={{ width: 16 }} /> Evaluate Answer with Strict Rubric
            </button>
            <button className="btn btn-secondary" onClick={handleNext}>
              Next Question →
            </button>
          </div>

          {/* EVALUATION RESULTS PANEL */}
          {evaluation && (
            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                borderLeft: `4px solid ${evaluation.isRelevant ? (evaluation.overallScorePct >= 75 ? 'var(--success)' : 'var(--warning)') : 'var(--danger)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span className="priority-tag" style={{ background: evaluation.isRelevant ? 'var(--success-bg)' : 'var(--danger-bg)', color: evaluation.isRelevant ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
                    {evaluation.answerQualityTier} (Overall Score: {evaluation.overallScorePct}%)
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Relevance: <strong>{evaluation.questionRelevancePct}%</strong>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: evaluation.isRelevant ? 'var(--text-primary)' : 'var(--danger)' }}>
                {evaluation.relevanceStatus}
              </div>

              {/* Unsupported Resume Claim Warning */}
              {evaluation.resumeClaimWarning && (
                <div style={{ fontSize: '0.82rem', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                  {evaluation.resumeClaimWarning}
                </div>
              )}

              {/* Multi-Dimensional Scoring Rubric Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px', background: 'var(--surface-card)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Relevance (20%)</div>
                  <strong style={{ fontSize: '1rem' }}>{evaluation.questionRelevancePct}%</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tech Accuracy (25%)</div>
                  <strong style={{ fontSize: '1rem' }}>{evaluation.technicalAccuracyPct}%</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Concept Coverage (20%)</div>
                  <strong style={{ fontSize: '1rem' }}>{evaluation.conceptCoveragePct}%</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Depth (15%)</div>
                  <strong style={{ fontSize: '1rem' }}>{evaluation.depthPct}%</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clarity (10%)</div>
                  <strong style={{ fontSize: '1rem' }}>{evaluation.clarityPct}%</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Practical Evidence (10%)</div>
                  <strong style={{ fontSize: '1rem' }}>{evaluation.practicalEvidencePct}%</strong>
                </div>
              </div>

              {/* Concept Checklists */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'block', marginBottom: '4px' }}>✓ Demonstrated Concepts</strong>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '16px' }}>
                    {evaluation.demonstratedConcepts.length > 0 ? (
                      evaluation.demonstratedConcepts.map((c, i) => <li key={i}>{c}</li>)
                    ) : (
                      <li style={{ color: 'var(--text-muted)' }}>None explicitly verified</li>
                    )}
                  </ul>
                </div>

                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--danger)', display: 'block', marginBottom: '4px' }}>✕ Missing Concepts</strong>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '16px' }}>
                    {evaluation.missingConcepts.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                💡 <strong>Improvement Tip:</strong> {evaluation.suggestedImprovement}
              </p>

              {/* Follow-up Question */}
              {evaluation.followUpQuestion && (
                <div style={{ fontSize: '0.85rem', background: 'var(--accent-glow)', color: 'var(--accent-primary)', padding: '10px 14px', borderRadius: '8px', fontWeight: 600 }}>
                  💬 <strong>Interviewer Follow-Up:</strong> &ldquo;{evaluation.followUpQuestion}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          No interview questions available for this category.
        </div>
      )}
    </div>
  );
}
