# AI-Resume-Analyzer — Repository Audit & Hardening Report

**Project:** AI Career Intelligence / AI-Resume-Analyzer  
**Repository:** [https://github.com/2005swathi2000/AI-Resume-Analyzer](https://github.com/2005swathi2000/AI-Resume-Analyzer)  
**Live URL:** [https://ai-resume-analyzer-sand-beta.vercel.app/](https://ai-resume-analyzer-sand-beta.vercel.app/)  
**Primary Tech Stack:** Next.js 16.3.4, React 19.2.8, TypeScript 5, Google Gemini API (`@google/generative-ai`), Mammoth, PDF-Parse, Vitest  
**Audit Date:** October 26, 2026  
**Auditor:** Antigravity Senior Engineering Pair

---

## 1. Executive Summary & Architectural Reality

An inspection of the repository structure, imports, and source tree confirmed that **AI-Resume-Analyzer** is not a Streamlit/Python application, but an enterprise-grade **Next.js 16 + TypeScript + React 19 web application** with an explainable career intelligence engine.

### Why Preserving the Next.js + TypeScript Architecture is Critical:
1. **Feature Preservation**: The current Next.js application contains 15+ advanced, fully functioning features (Interactive SVG Job DNA radial constellation map, Career Twin Alignment Map, Recruiter Lens 10-second scanner, What-If Career Simulator, Multi-Resume batch comparison with sorting and candidate IDs, Strict AI Interviewer with anti-cheat/keyword-stuffing rubrics, and multi-platform webhooks for Telegram/Discord/WhatsApp/Google Chat). Rebuilding this as a basic Streamlit script would destroy weeks of engineering work.
2. **Resource Efficiency**: Next.js 15 with Turbopack builds in **16.7 seconds** and Vitest runs 19 tests in **3.2 seconds** on an 8 GB RAM Windows 11 machine without requiring heavy local Python ML models (e.g., PyTorch, Transformers, spaCy).
3. **Zero Black-Box Scoring**: The core scoring engine is already 100% deterministic, explainable, and offline-capable via `LocalAnalysisProvider`, utilizing Gemini LLM only as an optional enhancement layer for bullet rewrites and interactive career coaching.

---

## 2. Feature Traceability & Implementation Matrix

| Feature | UI Component | Processing Engine | Data Source / Algorithm |
| :--- | :--- | :--- | :--- |
| **Job Readiness Hero Score** | `src/app/page.tsx` | `ats-scorer.ts` | 100-pt weighted model across 7 dimensions (Skills: 30, Keywords: 15, Experience: 15, Education: 10, Responsibilities: 10, Structure: 10, Metrics: 10). |
| **Career Twin Alignment Map** | `CareerTwinView.tsx` | `career-twin.ts` | Side-by-side node matching (`VERIFIED MATCH`, `SEMANTIC MATCH`, `PARTIAL EVIDENCE`, `NOT DETECTED`). |
| **Interactive SVG Job DNA Map** | `JobDnaMap.tsx` | `jd-processor.ts` | Radial constellation / neural SVG graph mapping 8 requirement clusters. |
| **Traceable Evidence Explorer** | `EvidenceViewer.tsx` | `evidence-engine.ts` | Exact substring citation linking score points to resume text. |
| **Deduction Breakdown Drawer** | `DrawbackDrawer.tsx` | `drawback-analyzer.ts` | Itemized point penalties explaining "Why Isn't Your Readiness Score Higher?". |
| **Skill Gap → Action Engine** | `SkillGapTable.tsx` | `recommendation-engine.ts`| 4-step actionable learning path (`LEARN` → `PRACTICE` → `PROVE` → `UPDATE`). |
| **Skill Adjacency Engine** | `AdjacencyView.tsx` | `skill-adjacency.ts` | Identifies candidate's existing foundation skills that accelerate missing skills. |
| **What-If Career Simulator** | `WhatIfSimulator.tsx` | `what-if-simulator.ts` | Real-time score projection simulation with explicit disclaimer badges. |
| **Recruiter Lens (10s Scan)** | `RecruiterLens.tsx` | `recruiter-lens.ts` | Simulates high-priority visual scan zones. |
| **Resume Health Audit** | `SectionHealth.tsx` | `section-analyzer.ts` | Analyzes parseability, contact links, action verbs, and numerical metrics. |
| **Strict AI Interviewer** | `MockInterviewer.tsx`| `mock-interviewer.ts` | Rubric evaluation: question relevance (<20% is Weak), keyword stuffing penalty, unsupported resume claims. |
| **Career Copilot Messaging Bot**| `BotConnectModal.tsx` | `common-chat-service.ts` | Unified multi-platform bot (Telegram, Discord, Google Chat, WhatsApp) with session binding. |
| **Multi-Format Export** | `ExportModal.tsx` | `report-exporter.ts` | Downloads reports as PDF, Markdown, or JSON. Processed in-memory. |

---

## 3. Findings & Severity Matrix

| ID | Category | Severity | Description | Evidence | Remediation |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | Security | 🟡 Medium | Telegram Bot token was placed in `.env` in the working directory. | `TELEGRAM_BOT_TOKEN=882...` in `.env` | Verified `.env` is ignored by `.gitignore`. Keep `.env.example` safe with placeholder tokens only. |
| **SEC-02** | Security | 🟢 Low | Filename validation in `file-validator.ts` did not sanitize path traversal (`..`) or null bytes (`\0`). | `file-validator.ts:13` only checked extension | Add filename sanitization checking for path traversal and null characters. |
| **REL-01** | Reliability | 🟡 Medium | `next.config.ts` used deprecated `eslint: { ignoreDuringBuilds: true }` and `typescript: { ignoreBuildErrors: true }`. | Build warning: `Unrecognized key(s) in object: 'eslint'` | Fix ESLint issues, verify `tsc --noEmit` passes, and clean `next.config.ts`. |
| **REL-02** | Reliability | 🟡 Medium | 54 ESLint errors and warnings across components and bot adapters. | `npm run lint` failed with 28 errors | Resolve unescaped entities (`"`, `'`), replace `any` in adapters, fix `prefer-const`. |
| **REL-03** | Reliability | 🟡 Medium | Gemini API calls in `gemini-provider.ts` lacked timeout protection and did not check `GOOGLE_API_KEY`. | `gemini-provider.ts:11` only checked `GEMINI_API_KEY` | Support `GOOGLE_API_KEY`, add a 10s timeout wrapper, and fallback to `LocalAnalysisProvider`. |
| **TEST-01** | Testing | 🟢 Low | Existing 19 tests in Vitest covered pipeline and interviewer, but lacked security validation and Gemini mock error tests. | Baseline: 19 tests | Add new test suite (`security-validation.test.ts`) covering file validation, Gemini timeout/fallback, and error handling. |
| **DOC-01** | Docs | 🟢 Low | README lacked Windows 11 setup guide, comprehensive Mermaid architecture, and truthful placement interview Q&A. | Existing README | Overhaul README with full architecture, Windows instructions, and interview Q&A. |

---

## 4. Prioritized Remediation Plan

1. **Step 1: Security & File Validation Hardening**:
   - Sanitize filenames in `src/lib/parser/file-validator.ts` (block `..`, null bytes, control characters).
   - Add maximum text length safeguard (`150,000` chars) to prevent ReDoS / CPU starvation on malformed payloads.
2. **Step 2: Gemini API Resilience & Fallback Hardening**:
   - Update `src/lib/ai/gemini-provider.ts` to support both `GEMINI_API_KEY` and `GOOGLE_API_KEY`.
   - Add 10-second timeout wrapper (`withTimeout`) to prevent serverless function hangs.
   - Ensure clean logging without exposing raw API keys or resume texts.
3. **Step 3: Resolve ESLint Errors & Clean Configuration**:
   - Fix unescaped HTML entities in `BotConnectModal.tsx`, `CareerTwinView.tsx`, and `JobDnaMap.tsx`.
   - Replace `any` in bot adapters (`discord.ts`, `google-chat.ts`, `telegram.ts`, `whatsapp.ts`).
   - Fix `prefer-const` in `mock-interviewer.ts`.
   - Clean `next.config.ts` removing deprecated keys.
4. **Step 4: Author Security & Error-Handling Test Suite**:
   - Create `tests/security-validation.test.ts` with comprehensive unit tests for file validation, path traversal, Gemini fallbacks, and offline local provider answers.
   - Verify 100% test pass rate in Vitest.
5. **Step 5: CI/CD & Environment Templates**:
   - Create `.github/workflows/ci.yml` running `npm test`, `npm run lint`, and `npm run build`.
   - Create safe `.env.example` and whitelist it in `.gitignore`.
6. **Step 6: Comprehensive README & Placement Polish**:
   - Add badges, Mermaid diagrams, scoring breakdown, Windows 11 setup, truthful placement resume bullets, and top 5 interview Q&A.

---

## 5. Verification & Benchmark Results

All remediation steps were executed, verified, and measured locally on Windows 11 (8 GB RAM):

| Verification Phase | Command | Status | Result / Metrics |
| :--- | :--- | :---: | :--- |
| **Type Check** | `npx tsc --noEmit` | **PASS** | 0 errors across all source files and test suites. |
| **ESLint Quality** | `npm run lint` | **PASS** | 0 errors, 0 warnings across all components and adapters. |
| **Automated Tests** | `npm test` (`vitest run`) | **PASS** | **40 / 40 tests passing in 2.56s** (Interview: 5, Pipeline: 14, Security/Validation: 21). |
| **Next.js Production Build** | `npm run build` | **PASS** | Compiled successfully with Turbopack (8 static routes + 5 dynamic API endpoints). |
| **Git & Secrets Audit** | `git status` / `git check-ignore` | **PASS** | `.env` ignored; `.env.example` tracked; zero API keys committed. |

### Verified Security Controls & Privacy Governance:
- **Path Traversal Protection**: Uploaded filenames with `../` or `..\` are stripped to clean basenames.
- **Null Byte Injection Defense**: `\0` and control characters `[\x00-\x1f\x7f]` are filtered before processing.
- **Buffer & Text Size Caps**: 10 MB maximum file size cap (`MAX_FILE_SIZE_BYTES`) and 150,000 character raw text cap (`MAX_RAW_TEXT_LENGTH`).
- **Active Socket Abort on Timeout**: `GeminiProvider` binds an `AbortController` signal to the underlying fetch connection, actively terminating the HTTP socket if Gemini exceeds 10s.
- **Explicit Privacy & Transmission Disclosure**: When running in offline Local Engine mode (without `GEMINI_API_KEY`), 100% of resume processing is strictly local and in-memory. When a Gemini API key is configured, prompt data is transmitted to Google; if that request subsequently fails or times out, data was already sent before fallback. Local-only mode provides true offline isolation.
