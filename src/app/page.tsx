'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Upload,
  FileText,
  AlertTriangle,
  XCircle,
  Download,
  Moon,
  Sun,
  Lock,
  Layers,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import {
  FullAnalysisResult,
  MultiResumeAnalysisReport,
} from '../types/analyzer';
import JobDnaMap from '../components/JobDnaMap';
import CareerTwinView from '../components/CareerTwinView';
import AiInterviewerPanel from '../components/AiInterviewerPanel';
import ProductTourModal from '../components/ProductTourModal';
import PrivacyModal from '../components/PrivacyModal';
import BotConnectModal, { BotPlatform } from '../components/BotConnectModal';

export default function CareerIntelligencePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [pastedResumeText, setPastedResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Results & Selection State
  const [singleAnalysis, setSingleAnalysis] = useState<FullAnalysisResult | null>(null);
  const [multiReport, setMultiReport] = useState<MultiResumeAnalysisReport | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Multi-Resume & Drag-and-Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [sortBy, setSortBy] = useState<'readinessScore' | 'atsScore' | 'alignmentScore' | 'skillsMatchPct' | 'projectRelevanceScore'>('readinessScore');
  const [processingProgress, setProcessingProgress] = useState<{
    total: number;
    current: number;
    message: string;
    steps: Array<{ label: string; status: 'completed' | 'active' | 'pending' }>;
  }>({ total: 0, current: 0, message: '', steps: [] });

  // UI Journey & Drawer States
  const [activeJourneyStep, setActiveJourneyStep] = useState<'understand' | 'diagnose' | 'improve' | 'simulate' | 'prepare'>('understand');
  const [showWhyNot100, setShowWhyNot100] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [activeBotModal, setActiveBotModal] = useState<BotPlatform | null>(null);

  // Product Tour Modal State
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // What-If Simulator Selected Skills State
  const [selectedWhatIfSkills, setSelectedWhatIfSkills] = useState<string[]>([]);

  // Career Copilot State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Hello! I am your Career Copilot. Ask me about your readiness score, missing skills, how to reach 90%, or practice an interview question!',
    },
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const registerMessagingSession = async (
    jd: string,
    resumesPayload: Array<Record<string, unknown>>,
    singleRes?: FullAnalysisResult,
    multiRep?: MultiResumeAnalysisReport
  ) => {
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText: jd,
          resumes: resumesPayload,
          singleAnalysis: singleRes,
          multiReport: multiRep,
        }),
      });
      const data = await res.json();
      if (data.success && data.sessionId) {
        setActiveSessionId(data.sessionId);
      }
    } catch (e) {
      console.error('Failed to create messaging session:', e);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Cumulative Resume Addition Handler with Deduplication (name + size + lastModified)
  const handleAddResumeFiles = (incoming: File[]) => {
    setErrorMsg('');
    const allowedExts = ['pdf', 'docx', 'txt'];
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const MAX_RESUMES = 10;

    const valid: File[] = [];
    const rejected: string[] = [];

    for (const f of incoming) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExts.includes(ext)) {
        rejected.push(`File '${f.name}': Unsupported format (.${ext}). Allowed: .pdf, .docx, .txt.`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        rejected.push(`File '${f.name}': Exceeds 10 MB limit (${(f.size / (1024 * 1024)).toFixed(1)} MB).`);
        continue;
      }
      valid.push(f);
    }

    if (rejected.length > 0) {
      setErrorMsg(`⚠️ ${rejected.join(' ')}`);
    }

    setResumeFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const uniqueNew = valid.filter((f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`));
      const combined = [...prev, ...uniqueNew];

      if (combined.length > MAX_RESUMES) {
        setErrorMsg(`⚠️ Maximum ${MAX_RESUMES} resumes allowed per session. Retained first ${MAX_RESUMES} files.`);
        return combined.slice(0, MAX_RESUMES);
      }
      return combined;
    });
  };

  // Drag and Drop Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleAddResumeFiles(files);
    }
  };

  // Guided Product Tour Loader (Sample Analysis Data)
  const handleStartProductTour = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Sample data load failed');

      setMultiReport(json.data);
      if (json.data.individualAnalyses.length > 0) {
        setSingleAnalysis(json.data.individualAnalyses[0]);
        setSelectedCandidateId(json.data.individualAnalyses[0].id);
      }
      setIsTourOpen(true);
      setTourStep(0);
      setActiveJourneyStep('understand');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sample load error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Main Document Analysis
  const handleAnalyze = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSingleAnalysis(null);
    setMultiReport(null);

    const totalCount = resumeFiles.length || 1;
    const initialSteps = [
      { label: 'JD analyzed', status: 'active' as const },
      ...resumeFiles.map((f, i) => ({ label: `Resume ${i + 1} (${f.name})`, status: 'pending' as const })),
    ];
    setProcessingProgress({
      total: totalCount,
      current: 1,
      message: `Analyzing ${totalCount} resume${totalCount > 1 ? 's' : ''}...`,
      steps: initialSteps,
    });

    try {
      if (activeInputTab === 'upload') {
        // If no files/text selected, load sample data automatically for 1-click convenience
        if (!jdFile && !jdText && resumeFiles.length === 0) {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDemo: true }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Sample data load failed');

          setMultiReport(json.data);
          if (json.data.individualAnalyses.length > 0) {
            setSingleAnalysis(json.data.individualAnalyses[0]);
            setSelectedCandidateId(json.data.individualAnalyses[0].id);
          }
          setActiveJourneyStep('understand');
          setProcessingProgress((prev) => ({ ...prev, message: '3 resumes analyzed successfully' }));
          return;
        }

        if (!jdFile && !jdText) throw new Error('Please select or paste a Job Description.');
        if (resumeFiles.length === 0) throw new Error('Please select at least one Candidate Resume file.');
        if (resumeFiles.length > 10) throw new Error('Maximum 10 resumes allowed.');

        // Simulate step progression visually during request
        setProcessingProgress({
          total: resumeFiles.length,
          current: 1,
          message: `Analyzing ${resumeFiles.length} resumes...`,
          steps: [
            { label: 'JD analyzed', status: 'completed' },
            ...resumeFiles.map((f, idx) => ({
              label: `Resume ${idx + 1} (${f.name})`,
              status: idx === 0 ? ('active' as const) : ('pending' as const),
            })),
          ],
        });

        const formData = new FormData();
        if (jdFile) formData.append('jdFile', jdFile);
        else formData.append('jdText', jdText);
        resumeFiles.forEach((file) => formData.append('resumes', file));

        const res = await fetch('/api/analyze', { method: 'POST', body: formData });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Analysis failed');

        if (json.mode === 'single') {
          setSingleAnalysis(json.data);
          registerMessagingSession(
            jdText || jdFile?.name || 'Target Job Description',
            [{ id: 'cand_1', candidateName: json.data.candidateName || 'Candidate 1', fileName: json.data.resumeFilename || 'Resume.pdf', resumeText: '', analysis: json.data }],
            json.data
          );
          setProcessingProgress({
            total: 1,
            current: 1,
            message: '1 resume analyzed successfully',
            steps: [{ label: 'Resume 1 analyzed', status: 'completed' }],
          });
        } else {
          setMultiReport(json.data);
          if (json.data.individualAnalyses.length > 0) {
            setSingleAnalysis(json.data.individualAnalyses[0]);
            setSelectedCandidateId(json.data.individualAnalyses[0].id);
            const resumesPayload = json.data.individualAnalyses.map((a: FullAnalysisResult, i: number) => ({
              id: a.id || `cand_${i + 1}`,
              candidateName: a.candidateName || `Candidate ${i + 1}`,
              fileName: a.resumeFilename || `Resume_${i + 1}.pdf`,
              resumeText: '',
              analysis: a,
            }));
            registerMessagingSession(jdText || jdFile?.name || 'Target Job Description', resumesPayload, json.data.individualAnalyses[0], json.data);
          }
          setProcessingProgress({
            total: json.data.totalResumesAnalyzed,
            current: json.data.totalResumesAnalyzed,
            message: `${json.data.totalResumesAnalyzed} resumes analyzed successfully`,
            steps: json.data.individualAnalyses.map((a: FullAnalysisResult, i: number) => ({
              label: `Resume ${i + 1} (${a.resumeFilename}) analyzed`,
              status: 'completed',
            })),
          });
        }
      } else {
        if (!jdText && !pastedResumeText) {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDemo: true }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Sample data load failed');

          setMultiReport(json.data);
          if (json.data.individualAnalyses.length > 0) {
            setSingleAnalysis(json.data.individualAnalyses[0]);
            setSelectedCandidateId(json.data.individualAnalyses[0].id);
            const resumesPayload = json.data.individualAnalyses.map((a: FullAnalysisResult, i: number) => ({
              id: a.id || `cand_${i + 1}`,
              candidateName: a.candidateName || `Candidate ${i + 1}`,
              fileName: a.resumeFilename || `Resume_${i + 1}.pdf`,
              resumeText: '',
              analysis: a,
            }));
            registerMessagingSession('Sample Senior Fullstack Engineer JD', resumesPayload, json.data.individualAnalyses[0], json.data);
          }
          setActiveJourneyStep('understand');
          return;
        }

        if (!jdText) throw new Error('Please enter Job Description text.');
        if (!pastedResumeText) throw new Error('Please paste candidate resume text.');

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jdText,
            resumes: [{ content: pastedResumeText, filename: 'Pasted_Resume.txt' }],
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Analysis failed');

        setSingleAnalysis(json.data);
        registerMessagingSession(
          jdText,
          [{ id: 'cand_1', candidateName: json.data.candidateName || 'Candidate 1', fileName: 'Pasted_Resume.txt', resumeText: pastedResumeText, analysis: json.data }],
          json.data
        );
      }
      setActiveJourneyStep('understand');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Analysis error');
    } finally {
      setIsLoading(false);
    }
  };

  // What-If Skill Toggle
  const toggleWhatIfSkill = (skill: string) => {
    setSelectedWhatIfSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Career Copilot Submission
  const handleSendCopilotPrompt = async (promptText?: string) => {
    const query = promptText || copilotInput.trim();
    if (!query || isCopilotLoading) return;

    setCopilotMessages((prev) => [...prev, { sender: 'user', text: query }]);
    if (!promptText) setCopilotInput('');
    setIsCopilotLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Copilot error');

      setCopilotMessages((prev) => [...prev, { sender: 'bot', text: json.replyText }]);
    } catch {
      setCopilotMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Export File Download
  const handleExport = async (format: 'pdf' | 'json' | 'markdown') => {
    if (!singleAnalysis) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, analysis: singleAnalysis }),
      });

      if (format === 'pdf') {
        const htmlText = await res.text();
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(htmlText);
          win.document.close();
          win.print();
        }
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Career_Intelligence_${singleAnalysis.candidateName.replace(/\s+/g, '_')}.${format === 'markdown' ? 'md' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      alert('Export failed.');
    }
  };

  // Calculate What-If Projected Score
  const currentReadiness = singleAnalysis?.readinessScore.score || 0;
  const projectedBoost = selectedWhatIfSkills.reduce((sum, skill) => {
    const gap = singleAnalysis?.whatIf.availableGaps.find((g) => g.skill === skill);
    return sum + (gap?.pointsValue || 3);
  }, 0);
  const projectedReadiness = Math.min(100, currentReadiness + projectedBoost);

  return (
    <div className="container">
      {/* Header & Brand Navigation */}
      <header className="header-nav">
        <div>
          <div className="brand-badge">
            <Sparkles style={{ width: 14, height: 14 }} /> AI CAREER INTELLIGENCE
          </div>
          <h1 className="hero-title">Know your match. See your gaps. Build your path.</h1>
          <p className="hero-tagline">
            Turn any job description and resume into an evidence-based career action plan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-demo" onClick={handleStartProductTour} disabled={isLoading}>
            <Zap style={{ width: 16, height: 16 }} /> ✨ Guided Product Tour
          </button>
          <button className="btn btn-secondary" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
          </button>
          <button
            className="privacy-banner"
            onClick={() => setShowPrivacyModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Lock style={{ width: 14, height: 14 }} /> Processed for this session
          </button>
        </div>
      </header>

      {/* 1. HERO / INPUT HUB */}
      <div className="console-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            className={`btn ${activeInputTab === 'upload' ? 'btn-hero' : 'btn-secondary'}`}
            onClick={() => setActiveInputTab('upload')}
          >
            <Upload style={{ width: 16 }} /> File Upload (PDF / DOCX / TXT)
          </button>
          <button
            className={`btn ${activeInputTab === 'paste' ? 'btn-hero' : 'btn-secondary'}`}
            onClick={() => setActiveInputTab('paste')}
          >
            <FileText style={{ width: 16 }} /> Copy / Paste Text
          </button>
        </div>

        {activeInputTab === 'upload' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* 1. Job Description Upload Panel */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                Upload Job Description <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>(Single File Only)</span>
              </label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                📌 Upload exactly 1 target Job Description (.pdf, .docx, .txt)
              </div>
              <input
                type="file"
                disabled={!!jdFile}
                multiple={false}
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 1) {
                    setErrorMsg('⚠️ Only 1 Job Description file is allowed. Selected the first file.');
                  } else {
                    setErrorMsg('');
                  }
                  setJdFile(files[0] || null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  marginBottom: '8px',
                  opacity: jdFile ? 0.5 : 1,
                  cursor: jdFile ? 'not-allowed' : 'pointer',
                }}
              />
              {jdFile && (
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--surface-elevated)', borderRadius: '6px', border: '1px solid var(--accent-primary)' }}>
                  <span>🔒 <strong>Single JD Locked:</strong> {jdFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setJdFile(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'underline', marginLeft: 'auto' }}
                  >
                    Remove / Change JD
                  </button>
                </div>
              )}
              <textarea
                rows={3}
                placeholder="Or paste Job Description text..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* 2. Candidate Resumes Multi-Upload & Drag-and-Drop Zone */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                Upload Resumes <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>(Up to 10 Files)</span>
              </label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Compare up to 10 resumes against the same job description.
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: isDragging ? 'var(--accent-glow)' : 'var(--surface-elevated)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  marginBottom: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const input = document.getElementById('resume-file-input') as HTMLInputElement;
                  if (input) input.click();
                }}
              >
                <Upload style={{ width: 24, height: 24, color: 'var(--accent-primary)', marginBottom: '4px' }} />
                <p style={{ fontSize: '0.88rem', fontWeight: 600, margin: '4px 0', color: 'var(--text-primary)' }}>
                  Drag & drop multiple resumes here
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Supports PDF, DOCX, TXT (Max 10 MB per file, max 10 files)
                </p>
              </div>

              <input
                id="resume-file-input"
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) handleAddResumeFiles(files);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                  onClick={() => {
                    const input = document.getElementById('resume-file-input') as HTMLInputElement;
                    if (input) input.click();
                  }}
                >
                  + Add more resumes
                </button>
              </div>

              {/* Selected Resume File Cards List */}
              {resumeFiles.length > 0 && (
                <div style={{ background: 'var(--surface-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--success)' }}>
                      RESUMES ({resumeFiles.length})
                    </strong>
                    <button
                      type="button"
                      onClick={() => setResumeFiles([])}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', fontWeight: 700 }}
                    >
                      Clear All
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {resumeFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${file.size}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-primary)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.83rem',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '1rem' }}>📄</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', fontWeight: 600 }}>
                            {file.name}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFiles(resumeFiles.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', padding: '0 4px' }}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Job Description</label>
              <textarea
                rows={6}
                placeholder="Paste Job Description..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Candidate Resume Text</label>
              <textarea
                rows={6}
                placeholder="Paste Resume text..."
                value={pastedResumeText}
                onChange={(e) => setPastedResumeText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        )}

        {/* Real Step Progress Indicator during Processing */}
        {isLoading && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface-elevated)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap style={{ width: 18, height: 18 }} /> {processingProgress.message || `Analyzing ${resumeFiles.length || 1} resumes...`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {processingProgress.steps.map((step, idx) => (
                <div key={idx} style={{ fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {step.status === 'completed' ? (
                    <span style={{ color: 'var(--success)', fontWeight: 800 }}>✓</span>
                  ) : step.status === 'active' ? (
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>⏳</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>○</span>
                  )}
                  <span style={{ color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {step.label} {step.status === 'active' ? 'analyzing...' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.9rem' }}>
            <AlertTriangle style={{ width: 16, height: 16, display: 'inline', marginRight: '6px' }} />
            {errorMsg}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🔒 Processed for this session
          </span>
          <button className="btn btn-hero" onClick={handleAnalyze} disabled={isLoading}>
            {isLoading
              ? `Analyzing ${resumeFiles.length || 1} resume(s)...`
              : resumeFiles.length > 1
              ? `Analyze ${resumeFiles.length} Resumes →`
              : 'Analyze Job Readiness →'}
          </button>
        </div>
      </div>

      {/* Connect on Messaging Apps Card */}
      <div className="console-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💬 Connect Career Copilot on Messaging Apps
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Click any platform card below to launch the mobile app directly on your phone or view bot commands:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div
            onClick={() => {
              setActiveBotModal('telegram');
              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                window.location.href = 'tg://msg?text=/start';
              }
            }}
            style={{
              background: 'var(--surface-elevated)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #38bdf8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.1)',
            }}
            className="console-card-interactive"
          >
            <strong style={{ color: '#38bdf8', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>✈️ Telegram Bot ↗</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Webhook: <code>/api/webhooks/telegram</code></p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.78rem', fontWeight: 700, pointerEvents: 'none', color: '#38bdf8', borderColor: '#38bdf8' }}
            >
              🚀 Launch Mobile App & View Output →
            </button>
          </div>

          <div
            onClick={() => {
              setActiveBotModal('discord');
              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                window.location.href = 'discord://';
              }
            }}
            style={{
              background: 'var(--surface-elevated)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #818cf8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(129, 140, 248, 0.1)',
            }}
            className="console-card-interactive"
          >
            <strong style={{ color: '#818cf8', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>💬 Discord Bot ↗</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Webhook: <code>/api/webhooks/discord</code></p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.78rem', fontWeight: 700, pointerEvents: 'none', color: '#818cf8', borderColor: '#818cf8' }}
            >
              🚀 Launch Mobile App & View Output →
            </button>
          </div>

          <div
            onClick={() => {
              setActiveBotModal('whatsapp');
              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                window.location.href = 'whatsapp://send?text=Analyze%20my%20resume';
              }
            }}
            style={{
              background: 'var(--surface-elevated)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #34d399',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(52, 211, 153, 0.1)',
            }}
            className="console-card-interactive"
          >
            <strong style={{ color: '#34d399', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>🟢 WhatsApp Bot ↗</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Webhook: <code>/api/webhooks/whatsapp</code></p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.78rem', fontWeight: 700, pointerEvents: 'none', color: '#34d399', borderColor: '#34d399' }}
            >
              🚀 Launch Mobile App & View Output →
            </button>
          </div>

          <div
            onClick={() => {
              setActiveBotModal('google-chat');
              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                window.location.href = 'googlechat://';
              }
            }}
            style={{
              background: 'var(--surface-elevated)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #f472b6',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(244, 114, 182, 0.1)',
            }}
            className="console-card-interactive"
          >
            <strong style={{ color: '#f472b6', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>🔷 Google Chat App ↗</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Webhook: <code>/api/webhooks/google-chat</code></p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.78rem', fontWeight: 700, pointerEvents: 'none', color: '#f472b6', borderColor: '#f472b6' }}
            >
              🚀 Launch Mobile App & View Output →
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Resume Candidate Comparison Matrix */}
      {multiReport && (
        <div className="console-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ color: 'var(--accent-primary)' }} /> MULTI-RESUME COMPARISON ({multiReport.totalResumesAnalyzed} Candidate Resumes)
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Shared Job Description: <strong>{multiReport.jobTitle}</strong> ({multiReport.company})
              </p>
            </div>

            {/* Sort Options Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Sort Options:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="readinessScore">Job Readiness Score</option>
                <option value="atsScore">ATS Score</option>
                <option value="alignmentScore">Alignment Score</option>
                <option value="skillsMatchPct">Skills Match %</option>
                <option value="projectRelevanceScore">Project Relevance</option>
              </select>
            </div>
          </div>

          {/* Failed Files Alert Notice if any file failed */}
          {multiReport.failedFiles && multiReport.failedFiles.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--danger)' }}>
              <strong>⚠ {multiReport.failedFiles.length} resume(s) could not be parsed:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                {multiReport.failedFiles.map((ff, idx) => (
                  <li key={idx}>
                    📄 <strong>{ff.fileName}</strong>: {ff.reason}
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                Continuing with successfully parsed candidate resumes below.
              </div>
            </div>
          )}

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px 14px', background: 'var(--surface-elevated)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
            💡 {multiReport.whyTopCandidateIsStrongest}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Candidate Resume</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>ATS Score</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Alignment</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Job Readiness</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Skills Match</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Project Relevance</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[...multiReport.comparisonTable]
                  .sort((a, b) => {
                    if (sortBy === 'atsScore') return b.atsScore - a.atsScore;
                    if (sortBy === 'alignmentScore') return b.alignmentScore - a.alignmentScore;
                    if (sortBy === 'skillsMatchPct') return b.skillsMatchPct - a.skillsMatchPct;
                    if (sortBy === 'projectRelevanceScore') return b.projectRelevanceScore - a.projectRelevanceScore;
                    return b.readinessScore - a.readinessScore;
                  })
                  .map((row, idx) => {
                    const isTopMatch = idx === 0;
                    return (
                      <tr
                        key={row.analysisId}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: selectedCandidateId === row.analysisId ? 'var(--accent-glow)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isTopMatch && (
                              <span style={{ background: 'var(--accent-primary)', color: '#000', fontSize: '0.7rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>
                                🏆 Strongest Match
                              </span>
                            )}
                            <span>📄 {row.filename}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {row.candidateName} • ID: {row.candidateId}
                          </div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{row.atsScore} / 100</td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{row.alignmentScore}%</td>
                        <td style={{ padding: '10px', fontWeight: 900, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                          {row.readinessScore}%
                        </td>
                        <td style={{ padding: '10px' }}>{row.skillsMatchPct}% ({row.matchedSkillsCount} matched)</td>
                        <td style={{ padding: '10px' }}>{row.projectRelevanceScore}%</td>
                        <td style={{ padding: '10px' }}>
                          <button
                            className={`btn ${selectedCandidateId === row.analysisId ? 'btn-hero' : 'btn-secondary'}`}
                            style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                            onClick={() => {
                              setSelectedCandidateId(row.analysisId);
                              const found = multiReport.individualAnalyses.find((a) => a.id === row.analysisId);
                              if (found) setSingleAnalysis(found);
                            }}
                          >
                            {selectedCandidateId === row.analysisId ? 'Selected Profile ✓' : 'View Candidate Analysis →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Analysis Dashboard Console */}
      {singleAnalysis && (
        <div>
          {/* CONNECT CAREER COPILOT TO MESSAGING APPS */}
          <div className="console-card" style={{ marginBottom: '24px', border: '1px solid var(--accent-primary)', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
                  📱 Connect Career Copilot to Real Messaging Apps
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Access your live Job Readiness Score, missing skills, and mock interview practice directly on your mobile phone or desktop messaging app.
                </p>
              </div>
              {activeSessionId && (
                <div style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  ✓ Session Linked: {activeSessionId}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {/* Telegram Card */}
              <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                    <span>✈️ Telegram Bot</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Open Telegram with your active Career Intelligence session attached.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', borderColor: '#38bdf8', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700 }}
                  onClick={() => setActiveBotModal('telegram')}
                >
                  🚀 Open Telegram & Start
                </button>
              </div>

              {/* WhatsApp Card */}
              <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                    <span>🟢 WhatsApp Cloud Bot</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Start an instant WhatsApp chat with pre-filled session payload.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', borderColor: '#34d399', color: '#34d399', fontSize: '0.82rem', fontWeight: 700 }}
                  onClick={() => setActiveBotModal('whatsapp')}
                >
                  🚀 Open WhatsApp & Start
                </button>
              </div>

              {/* Discord Card */}
              <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                    <span>💬 Discord Bot App</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Connect Career Copilot to your Discord server or direct messages.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', borderColor: '#818cf8', color: '#818cf8', fontSize: '0.82rem', fontWeight: 700 }}
                  onClick={() => setActiveBotModal('discord')}
                >
                  🚀 Open Discord & Start
                </button>
              </div>

              {/* Google Chat Card */}
              <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#f472b6', marginBottom: '6px' }}>
                    <span>🔷 Google Chat App</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Access Career Copilot directly in your Google Workspace spaces.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', borderColor: '#f472b6', color: '#f472b6', fontSize: '0.82rem', fontWeight: 700 }}
                  onClick={() => setActiveBotModal('google-chat')}
                >
                  🚀 Open Google Chat & Start
                </button>
              </div>
            </div>
          </div>

          {/* Journey Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
            <button
              className={`btn ${activeJourneyStep === 'understand' ? 'btn-hero' : 'btn-secondary'}`}
              onClick={() => setActiveJourneyStep('understand')}
            >
              1. Understand (DNA & Twin)
            </button>
            <button
              className={`btn ${activeJourneyStep === 'diagnose' ? 'btn-hero' : 'btn-secondary'}`}
              onClick={() => setActiveJourneyStep('diagnose')}
            >
              2. Diagnose (Evidence & Gaps)
            </button>
            <button
              className={`btn ${activeJourneyStep === 'improve' ? 'btn-hero' : 'btn-secondary'}`}
              onClick={() => setActiveJourneyStep('improve')}
            >
              3. Improve (Action Path)
            </button>
            <button
              className={`btn ${activeJourneyStep === 'simulate' ? 'btn-hero' : 'btn-secondary'}`}
              onClick={() => setActiveJourneyStep('simulate')}
            >
              4. Simulate (What-If & Recruiter)
            </button>
            <button
              className={`btn ${activeJourneyStep === 'prepare' ? 'btn-hero' : 'btn-secondary'}`}
              onClick={() => setActiveJourneyStep('prepare')}
            >
              5. Prepare (AI Interviewer)
            </button>
          </div>

          {/* SCREEN 1 — UNDERSTAND */}
          {activeJourneyStep === 'understand' && (
            <div>
              {/* 2. Job Readiness Hero Meter */}
              <div className="readiness-hero">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎯 Your Job Readiness Score
                </span>
                <div style={{ margin: '8px 0 4px 0' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: singleAnalysis.usedLlmProvider ? 'rgba(56, 189, 248, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    color: singleAnalysis.usedLlmProvider ? '#38bdf8' : '#22c55e',
                    border: `1px solid ${singleAnalysis.usedLlmProvider ? 'rgba(56, 189, 248, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                  }}>
                    {singleAnalysis.usedLlmProvider ? '✨ Gemini AI-Enhanced Mode' : '🛡️ Deterministic Local Engine Mode (Offline & Private)'}
                  </span>
                </div>
                <div className="readiness-value">{singleAnalysis.readinessScore.score}%</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
                  {singleAnalysis.readinessScore.tier}
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 16px auto' }}>
                  &ldquo;{singleAnalysis.readinessScore.summaryQuote}&rdquo;
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => setShowWhyNot100(!showWhyNot100)}>
                    <HelpCircle style={{ width: 16 }} /> Why isn&apos;t your score higher?
                  </button>
                  <button className="btn btn-hero" onClick={() => setActiveJourneyStep('improve')}>
                    Build my roadmap →
                  </button>
                </div>
              </div>

              {/* Expandable Deduction Breakdown */}
              {showWhyNot100 && (
                <div className="console-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                    Why isn&apos;t your readiness score higher?
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    You are currently at {singleAnalysis.readinessScore.score}%. You lost point(s) due to the following evidence gaps:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {singleAnalysis.whyNot100.map((w, idx) => (
                      <div key={idx} style={{ background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--danger)', marginRight: '8px' }}>−{w.deduction} pts</strong>
                          <span style={{ fontSize: '0.9rem' }}>{w.reason}</span>
                        </div>
                        <span className="priority-tag priority-important">{w.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. CAREER TWIN */}
              <CareerTwinView
                careerTwin={singleAnalysis.careerTwin}
                candidateName={singleAnalysis.candidateName}
                jobTitle={singleAnalysis.jobTitle}
              />

              {/* 4. UNIQUE JOB DNA MAP */}
              <JobDnaMap
                jobDna={singleAnalysis.jobDna}
                rawEvidence={singleAnalysis.rawEvidence}
                jobTitle={singleAnalysis.jobTitle}
              />
            </div>
          )}

          {/* SCREEN 2 — DIAGNOSE */}
          {activeJourneyStep === 'diagnose' && (
            <div>
              {/* 5. Traceable Evidence Explorer */}
              <div className="console-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔗 Traceable Evidence Explorer
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Every score point and match conclusion is verified against actual resume text evidence.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {singleAnalysis.rawEvidence.map((ev, idx) => (
                    <div key={idx} className="evidence-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>JD Requirement: {ev.requirement}</strong>
                        <span className={`status-badge ${ev.status === 'MATCHED' ? 'status-strong' : ev.status === 'PARTIALLY_MATCHED' ? 'status-partial' : 'status-missing'}`}>
                          {ev.status} ({ev.confidence}%)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', marginBottom: '6px' }}>
                        📄 <strong>Resume Evidence:</strong> &ldquo;{ev.foundEvidence}&rdquo;
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Match Type: {ev.matchType} • Score Contribution: +{ev.scoreContribution} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Biggest Skill Gap Focus */}
              {singleAnalysis.gapActions.length > 0 && (
                <div className="console-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--danger)' }}>
                    🚨 Your Biggest Gap: {singleAnalysis.gapActions[0].skill}
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {singleAnalysis.gapActions[0].statusNotice} Close this gap to unlock the highest job readiness increase.
                  </p>
                  <button className="btn btn-hero" onClick={() => setActiveJourneyStep('improve')}>
                    See Learn → Practice → Prove Path →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 3 — IMPROVE */}
          {activeJourneyStep === 'improve' && (
            <div>
              {/* 11. Learning Roadmap & Gap Action Engine */}
              <div className="console-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
                  🚀 Skill Gap → Action Engine (Learn → Practice → Prove → Update)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {singleAnalysis.gapActions.map((gap) => (
                    <div key={gap.skill} style={{ background: 'var(--surface-elevated)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>Skill Gap: {gap.skill}</h3>
                        <span className="priority-tag priority-critical">Priority {gap.priority} • Est. {gap.estimatedEffort}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>1. LEARN</strong>
                          <p style={{ fontSize: '0.85rem' }}>{gap.learn.topic}</p>
                          <a href={gap.learn.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}>
                            {gap.learn.resource} ↗
                          </a>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'block', marginBottom: '4px' }}>2. PRACTICE</strong>
                          <p style={{ fontSize: '0.85rem' }}>{gap.practice.projectIdea}</p>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', display: 'block', marginBottom: '4px' }}>3. PROVE</strong>
                          <p style={{ fontSize: '0.85rem' }}>{gap.prove.githubTip}</p>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--warning)', display: 'block', marginBottom: '4px' }}>4. UPDATE</strong>
                          <p style={{ fontSize: '0.85rem' }}>{gap.update.resumeFix}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 3 Recommended Courses Matched to Uploaded JD */}
              <div className="console-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎓 Top 3 Recommended Courses & Learning Paths (Matched to Uploaded JD)
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Hand-picked targeted courses and learning paths matched specifically to closing qualification gaps for <strong>{singleAnalysis.jobTitle}</strong>:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {singleAnalysis.courseRecommendations.slice(0, 3).map((course, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--surface-elevated)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="priority-tag priority-critical" style={{ background: 'var(--accent-purple)', color: '#fff' }}>
                            Top {idx + 1} Course
                          </span>
                          <span style={{ fontSize: '0.75rem', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            {course.availabilityTag}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {course.courseTitle}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '8px' }}>
                          Provider: {course.provider} • Skill: {course.skillCovered} ({course.estimatedDuration})
                        </div>
                        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                          💡 <strong>Why Recommended:</strong> {course.whyRecommended}
                        </p>
                      </div>

                      <a
                        href={course.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ width: '100%', textAlign: 'center', textDecoration: 'none', marginTop: 'auto', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        Start Top {idx + 1} Course ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. #1 Next Step Engine */}
              <div className="console-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>🧠 Your #1 Next Step</h2>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', marginBottom: '6px' }}>{singleAnalysis.nextStep.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <strong>Why:</strong> {singleAnalysis.nextStep.why} • <strong>Effort:</strong> {singleAnalysis.nextStep.estimatedEffort}
                </p>
                <button className="btn btn-hero" onClick={() => setActiveJourneyStep('simulate')}>
                  Simulate Closing This Gap →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4 — SIMULATE */}
          {activeJourneyStep === 'simulate' && (
            <div>
              {/* 8. WHAT-IF CAREER SIMULATOR */}
              <div className="console-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔮 WHAT-IF CAREER SIMULATOR
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Select skills you plan to genuinely acquire to simulate your projected readiness score.
                </p>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', background: 'var(--surface-elevated)', padding: '20px', borderRadius: '14px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CURRENT READINESS</span>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{currentReadiness}%</div>
                  </div>
                  <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>➔</div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>PROJECTED READINESS</span>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>{projectedReadiness}%</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Select Gaps to Close:</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {singleAnalysis.whatIf.availableGaps.map((gap) => (
                      <label
                        key={gap.skill}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: selectedWhatIfSkills.includes(gap.skill) ? 'var(--accent-glow)' : 'var(--surface-elevated)',
                          border: '1px solid var(--border)',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWhatIfSkills.includes(gap.skill)}
                          onChange={() => toggleWhatIfSkill(gap.skill)}
                        />
                        {gap.skill} (+{gap.pointsValue}%)
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', background: 'var(--warning-bg)', padding: '10px', borderRadius: '8px' }}>
                  ⚠️ {singleAnalysis.whatIf.disclaimer}
                </div>
              </div>

              {/* 9. RECRUITER LENS */}
              <div className="console-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
                  👀 RECRUITER LENS — 10-Second Scan Test
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ color: 'var(--success)', marginBottom: '8px' }}>VISIBLE IN FIRST 10 SECONDS</h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.85rem' }}>
                      {singleAnalysis.recruiterLens.tenSecondScan.visibleIn10Seconds.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ color: 'var(--danger)', marginBottom: '8px' }}>NOT IMMEDIATELY OBVIOUS</h4>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.85rem' }}>
                      {singleAnalysis.recruiterLens.tenSecondScan.notImmediatelyObvious.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                    <strong>First Impression:</strong> {singleAnalysis.recruiterLens.firstImpression}
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                    <strong>Strongest Signal:</strong> {singleAnalysis.recruiterLens.strongestSignal}
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                    <strong>Recruiter Recommendation:</strong> {singleAnalysis.recruiterLens.recruiterRecommendation}
                  </div>
                </div>
              </div>

              {/* 10. RESUME HEALTH */}
              <div className="console-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>🩺 Resume Health Audit</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--surface-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ATS Parseability</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{singleAnalysis.resumeHealth.atsParsingPct}%</div>
                  </div>
                  <div style={{ background: 'var(--surface-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Keyword Coverage</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{singleAnalysis.resumeHealth.keywordCoveragePct}%</div>
                  </div>
                  <div style={{ background: 'var(--surface-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evidence Quality</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)' }}>{singleAnalysis.resumeHealth.evidenceQualityPct}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 5 — PREPARE */}
          {activeJourneyStep === 'prepare' && (
            <div>
              {/* 12 & 13. STRICT AI INTERVIEWER */}
              <AiInterviewerPanel
                questions={singleAnalysis.interviewQuestions}
                resumeText={singleAnalysis.careerTwin.summaryMessage}
              />

              {/* 15. EXPORT REPORT */}
              <div className="console-card" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Download Full Analysis Report</h3>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
                    <Download style={{ width: 14 }} /> Download PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleExport('markdown')}>
                    <Download style={{ width: 14 }} /> Download Markdown
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleExport('json')}>
                    <Download style={{ width: 14 }} /> Download JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 14. CAREER COPILOT ASSISTANT */}
      <button
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}
        onClick={() => setIsCopilotOpen(!isCopilotOpen)}
        aria-label="Open Career Copilot"
      >
        <MessageSquare style={{ width: 24, height: 24 }} />
      </button>

      {/* Copilot Drawer */}
      {isCopilotOpen && (
        <div className="copilot-drawer">
          <div className="copilot-header">
            <span>Career Copilot</span>
            <button onClick={() => setIsCopilotOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <XCircle style={{ width: 20 }} />
            </button>
          </div>

          <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', overflowX: 'auto', background: 'var(--bg-primary)' }}>
            {['Why is my score low?', 'What should I learn first?', 'Rewrite my summary', 'Ask me interview questions'].map((chip) => (
              <button key={chip} className="prompt-chip" onClick={() => handleSendCopilotPrompt(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <div className="chat-messages" style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {copilotMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? 'var(--accent-primary)' : 'var(--surface-elevated)',
                  color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  fontSize: '0.88rem',
                }}
              >
                {msg.text}
              </div>
            ))}
            {isCopilotLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--surface-elevated)', color: 'var(--text-muted)', padding: '10px', borderRadius: '12px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Copilot is thinking...
              </div>
            )}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask Copilot anything..."
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCopilotPrompt()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            />
            <button className="btn btn-hero" style={{ padding: '8px 14px' }} onClick={() => handleSendCopilotPrompt()}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Guided Product Tour Modal */}
      <ProductTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        currentStep={tourStep}
        onStepChange={(s) => setTourStep(s)}
      />

      {/* Session Privacy Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Messaging Bot Connect Modal */}
      <BotConnectModal
        platform={activeBotModal}
        sessionId={activeSessionId}
        onClose={() => setActiveBotModal(null)}
      />
    </div>
  );
}
