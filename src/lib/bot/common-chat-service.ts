import { analyzeSingleResume } from '../engine/analyzer-pipeline';
import { evaluateMockAnswer } from '../engine/mock-interviewer';
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME_A } from '../demo/demo-data';
import { FullAnalysisResult, MultiResumeAnalysisReport, ResumeComparisonRow } from '../../types/analyzer';
import {
  bindUserToSession,
  getBoundSessionForUser,
  getCareerSession,
  CareerIntelligenceSession,
} from './session-service';

export interface IncomingBotMessage {
  platform: 'telegram' | 'discord' | 'google-chat' | 'whatsapp' | 'slack';
  senderId: string;
  senderName: string;
  text: string;
  attachmentText?: string;
}

export interface BotResponse {
  replyText: string;
  platform: string;
  targetId: string;
  buttons?: Array<{ label: string; action: string; webAppUrl?: string }>;
}

interface UserChatState {
  jdText?: string;
  resumeText?: string;
  analysis?: FullAnalysisResult;
  isInterviewMode?: boolean;
  currentQuestionIdx?: number;
  step?: 'IDLE' | 'AWAITING_JD' | 'AWAITING_RESUME' | 'ANALYZED';
  activeSessionId?: string;
  selectedResumeIndex?: number;
}

const chatStateStore = new Map<string, UserChatState>();

const PRESET_ROLES: Record<string, string> = {
  '/setrole_fullstack':
    'Senior Fullstack Engineer with React, Next.js, Node.js, TypeScript, PostgreSQL, REST APIs, System Design, AWS, Docker, CI/CD.',
  '/setrole_ai':
    'AI & Data Scientist Engineer with Python, PyTorch, TensorFlow, LLMs, Machine Learning, Data Processing, SQL, NLP, MLOps.',
  '/setrole_devops':
    'DevOps & Cloud Engineer with AWS, Kubernetes, Docker, Terraform, CI/CD Automation, Linux, Python, Monitoring.',
  '/setrole_android':
    'Mobile Application Developer with React Native, Kotlin, Flutter, Android SDK, iOS Swift, REST APIs, Mobile Security.',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-resume-analyzer-sand-beta.vercel.app';

export function formatSingleAnalysisReport(a: FullAnalysisResult, titlePrefix: string = ''): string {
  const readinessTierIcon =
    a.readinessScore.score >= 80 ? '🚀' : a.readinessScore.score >= 65 ? '🟢' : a.readinessScore.score >= 50 ? '🟡' : '🔴';

  const matched = a.matchedSkills.slice(0, 5).map((s) => `✓ ${s.jdSkill}`).join('  ') || 'None detected';
  const gaps = a.missingSkills.slice(0, 4).map((s) => `⚠ ${s.skill}`).join('  ') || 'None detected';

  const evidenceSnippets = (a.rawEvidence || [])
    .slice(0, 4)
    .map((e) => `• **${e.requirement}**: ${e.matchType === 'EXACT' ? '✓ EXACT MATCH' : e.matchType === 'SEMANTIC' ? '◐ SEMANTIC MATCH' : '✕ NOT DETECTED'}`)
    .join('\n') || `• **Matched Skills:** ${matched}`;

  const deductions = (a.whyNot100 || [])
    .slice(0, 3)
    .map((d) => `• ${d.reason} (-${d.deduction} pts)`)
    .join('\n') || '• No major score deductions detected.';

  const recommendations = (a.roadmap?.immediateFixes || [])
    .slice(0, 3)
    .map((rec, idx) => `${idx + 1}. ${rec}`)
    .join('\n') || '1. Update project descriptions with measurable metrics.';

  return `${titlePrefix}🎯 **CAREER INTELLIGENCE REPORT**

📊 **Job Readiness Score:** ${a.readinessScore.score}% ${readinessTierIcon} (${a.readinessScore.tier})
🤖 **ATS Score:** ${a.atsScore.totalScore}/100
🔗 **JD Alignment:** ${a.alignmentScore.tier} (${a.alignmentScore.score}/100)

✅ **Matched Skills:**
${matched}

❌ **Skill Gaps:**
${gaps}

🔍 **Evidence Traceability:**
${evidenceSnippets}

⚠️ **Why You're Not at 100%:**
${deductions}

💡 **Recommended Next Steps:**
${recommendations}

---
*(Type /interview to start mock practice, or /ats to see detailed ATS breakdown)*`;
}

export function formatMultiResumeList(session: CareerIntelligenceSession): string {
  const listText = session.resumes
    .map((r, idx) => {
      const score = r.analysis?.readinessScore?.score ?? 'N/A';
      return `${idx + 1}️⃣ **${r.candidateName}** (${r.fileName}) — Readiness: ${score}%`;
    })
    .join('\n');

  return `🎯 **CAREER INTELLIGENCE — MULTI-RESUME SESSION**

Your session contains **${session.resumes.length} resumes** evaluated against the Target JD:

${listText}

👉 **Options:**
• Send a number (e.g. \`1\`, \`2\`) to view full analysis for that specific candidate.
• Send \`compare\` to view the candidate matrix.
• Send \`demo\` or paste a new resume.`;
}

export function formatMultiResumeMatrix(report: MultiResumeAnalysisReport | undefined, session: CareerIntelligenceSession): string {
  if (report) {
    const topCandidate = report.comparisonTable[0]?.candidateName || 'Candidate 1';
    const candidateLines = report.comparisonTable
      .map((c: ResumeComparisonRow, idx: number) => `#${idx + 1} **${c.candidateName}** — Score: ${c.readinessScore}% (${c.overallTier})`)
      .join('\n');
    return `🏆 **MULTI-CANDIDATE COMPARISON MATRIX**

Top Candidate: 🥇 **${topCandidate}**

${candidateLines}

💡 *Send a number (1-${session.resumes.length}) to inspect full details for any resume.*`;
  }

  const lines = session.resumes
    .map((r, idx) => `#${idx + 1} **${r.candidateName}** — ${r.analysis?.readinessScore?.score ?? 0}% Readiness`)
    .join('\n');

  return `🏆 **CANDIDATE COMPARISON MATRIX**\n\n${lines}`;
}

export async function processCommonChatService(msg: IncomingBotMessage): Promise<BotResponse> {
  const platformUserKey = `${msg.platform}_${msg.senderId}`;
  let state = chatStateStore.get(platformUserKey);
  if (!state) {
    state = { step: 'IDLE' };
    chatStateStore.set(platformUserKey, state);
  }

  const textRaw = msg.text.trim();
  const textLower = textRaw.toLowerCase();

  const standardButtons = [
    { label: '📂 Open Website App', action: '/app', webAppUrl: APP_URL },
    { label: '🔄 Change JD', action: '/set_jd' },
    { label: '❌ Missing Skills', action: '/missingskills' },
    { label: '🤖 ATS Breakdown', action: '/ats' },
    { label: '📝 Resume Improvements', action: '/improvements' },
    { label: '🎓 Learning Roadmap', action: '/roadmap' },
    { label: '🔮 What-If Score', action: '/whatif' },
    { label: '🎤 Mock Interview', action: '/interview' },
  ];

  // 1. CHECK FOR SESSION ID IN /start OR START COMMAND (e.g., /start cs_abc123 or START cs_abc123)
  const sessionMatch = textRaw.match(/(?:\/start|start|session)\s+(cs_[a-z0-9]+)/i);
  if (sessionMatch && sessionMatch[1]) {
    const sessionId = sessionMatch[1];
    const session = bindUserToSession(platformUserKey, sessionId);
    if (session) {
      state.activeSessionId = session.id;
      if (session.resumes.length === 1) {
        state.analysis = session.resumes[0].analysis;
        state.jdText = session.jdText;
        state.resumeText = session.resumes[0].resumeText;
        state.step = 'ANALYZED';
        return {
          replyText: `🔗 **CAREER INTELLIGENCE SESSION LINKED!**\n\nCandidate: **${session.resumes[0].candidateName}**\n\n` + formatSingleAnalysisReport(session.resumes[0].analysis),
          platform: msg.platform,
          targetId: msg.senderId,
          buttons: standardButtons,
        };
      } else if (session.resumes.length > 1) {
        state.step = 'ANALYZED';
        return {
          replyText: `🔗 **CAREER INTELLIGENCE SESSION LINKED!**\n\n` + formatMultiResumeList(session),
          platform: msg.platform,
          targetId: msg.senderId,
          buttons: session.resumes.slice(0, 4).map((r, idx) => ({
            label: `👤 ${idx + 1}. ${r.candidateName.slice(0, 15)}`,
            action: `${idx + 1}`,
          })),
        };
      }
    } else {
      return {
        replyText: `⚠️ **Session Expired or Not Found**\n\nThe Career Intelligence session (\`${sessionId}\`) has expired or is invalid.\n\nPlease create a new analysis on the web app:\n${APP_URL}`,
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: [{ label: '📂 Open Website App', action: '/app', webAppUrl: APP_URL }],
      };
    }
  }

  // 2. CHECK FOR EXISTING BOUND SESSION FOR THIS USER
  const boundSession = getBoundSessionForUser(platformUserKey);
  if (boundSession && !state.activeSessionId) {
    state.activeSessionId = boundSession.id;
  }

  const activeSession = state.activeSessionId ? getCareerSession(state.activeSessionId) : boundSession;

  // 3. CANDIDATE SELECTION IN MULTI-RESUME SESSION (e.g. typing "1", "2", "compare")
  if (activeSession && activeSession.resumes.length > 1) {
    if (textLower === 'compare' || textLower === '/compare') {
      return {
        replyText: formatMultiResumeMatrix(activeSession.multiReport, activeSession),
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    const num = parseInt(textRaw, 10);
    if (!isNaN(num) && num >= 1 && num <= activeSession.resumes.length) {
      const selectedIndex = num - 1;
      const targetResume = activeSession.resumes[selectedIndex];
      state.analysis = targetResume.analysis;
      state.jdText = activeSession.jdText;
      state.resumeText = targetResume.resumeText;
      state.step = 'ANALYZED';

      return {
        replyText: formatSingleAnalysisReport(targetResume.analysis, `👤 **CANDIDATE #${num}: ${targetResume.candidateName}**\n\n`),
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }
  }

  // 4. MOCK INTERVIEW RESPONSE EVALUATION MODE
  if (state.isInterviewMode && state.analysis) {
    if (textLower === 'exit' || textLower === '/exit') {
      state.isInterviewMode = false;
      return {
        replyText: '🚪 Exited Mock Interview mode. Ask any other questions or send /roadmap!',
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    const questions = state.analysis.interviewQuestions;
    const currentQIdx = state.currentQuestionIdx || 0;
    const currentQ = questions[currentQIdx];

    const evalRes = evaluateMockAnswer(currentQ, textRaw, state.resumeText || '');
    const isLast = currentQIdx >= questions.length - 1;

    let nextQText = '';
    if (!isLast) {
      state.currentQuestionIdx = currentQIdx + 1;
      const nextQ = questions[state.currentQuestionIdx];
      nextQText = `\n\n---
🎤 **NEXT QUESTION (${state.currentQuestionIdx + 1}/${questions.length}):**
*"${nextQ.question}"*`;
    } else {
      state.isInterviewMode = false;
      nextQText = '\n\n🎉 **Mock Interview Session Complete!** Great practice.';
    }

    const replyText = `📊 **INTERVIEW ANSWER FEEDBACK**

Quality Tier: **${evalRes.answerQualityTier}** (Overall Score: ${evalRes.overallScorePct}%)
• **Technical Accuracy:** ${evalRes.technicalAccuracyPct}%
• **Concept Coverage:** ${evalRes.conceptCoveragePct}%
• **Depth:** ${evalRes.depthPct}%

💡 **Improvement Tip:** ${evalRes.suggestedImprovement}${nextQText}`;

    return { replyText, platform: msg.platform, targetId: msg.senderId };
  }

  // 5. START / RESET / HELP COMMAND
  if (textLower === '/start' || textLower === 'start' || textLower === 'hi' || textLower === 'hello' || textLower === '/help') {
    if (activeSession) {
      if (activeSession.resumes.length === 1) {
        state.analysis = activeSession.resumes[0].analysis;
        return {
          replyText: `👋 **Welcome back to Career Copilot!**\n\nActive Session Found (\`${activeSession.id}\`):\n\n` + formatSingleAnalysisReport(activeSession.resumes[0].analysis),
          platform: msg.platform,
          targetId: msg.senderId,
          buttons: standardButtons,
        };
      } else {
        return {
          replyText: formatMultiResumeList(activeSession),
          platform: msg.platform,
          targetId: msg.senderId,
          buttons: standardButtons,
        };
      }
    }

    state.step = 'AWAITING_JD';

    return {
      replyText: `Welcome to **Career Copilot** 👋

No active Career Intelligence session was found. You can:

1️⃣ Open **Career Intelligence** on the web:
${APP_URL}

2️⃣ Upload your **Job Description** & **Resume(s)**
3️⃣ Click **Analyze Profile**
4️⃣ Tap **Connect to Messaging** to link your session!

---
*(Or pick a Target Role below to run instant analysis directly inside this chat!)*`,
      platform: msg.platform,
      targetId: msg.senderId,
      buttons: [
        { label: '📂 Open Website App', action: '/app', webAppUrl: APP_URL },
        { label: '💻 Fullstack Developer', action: '/setrole_fullstack' },
        { label: '🤖 AI / Data Scientist', action: '/setrole_ai' },
        { label: '☁️ DevOps Engineer', action: '/setrole_devops' },
        { label: '⚡ Try Demo Analysis', action: '/demo' },
      ],
    };
  }

  // 6. PRESET ROLE SELECTION
  if (PRESET_ROLES[textLower]) {
    state.jdText = PRESET_ROLES[textLower];
    state.step = 'AWAITING_RESUME';
    const roleName = textRaw.replace('/setrole_', '').toUpperCase();

    return {
      replyText: `✅ **Job Description Set to ${roleName}!**

📄 **Next Step:** Upload your **Resume File (PDF/DOCX/TXT)** or paste your resume text in this chat to generate your Career Intelligence analysis!`,
      platform: msg.platform,
      targetId: msg.senderId,
      buttons: [
        { label: '⚡ Run Demo Resume', action: '/demo' },
        { label: '📂 Open Web App', action: '/app', webAppUrl: APP_URL },
      ],
    };
  }

  // 7. DEMO ANALYSIS
  if (textLower === '/demo' || textLower === 'try demo resume' || textLower === 'demo') {
    state.jdText = DEMO_JOB_DESCRIPTION;
    state.resumeText = DEMO_RESUME_A;
    state.analysis = analyzeSingleResume(state.jdText, state.resumeText, 'Demo_Resume.pdf');
    state.step = 'ANALYZED';

    return {
      replyText: formatSingleAnalysisReport(state.analysis, '⚡ **DEMO CAREER INTELLIGENCE ANALYSIS**\n\n'),
      platform: msg.platform,
      targetId: msg.senderId,
      buttons: standardButtons,
    };
  }

  // 8. RESUME UPLOAD / TEXT PROCESSING DIRECTLY IN CHAT
  if (msg.attachmentText || (state.step === 'AWAITING_RESUME' && textRaw.length > 50)) {
    const resumeContent = msg.attachmentText || textRaw;
    state.resumeText = resumeContent;
    const jd = state.jdText || PRESET_ROLES['/setrole_fullstack'];
    state.analysis = analyzeSingleResume(jd, resumeContent, 'Uploaded_Resume.pdf');
    state.step = 'ANALYZED';

    return {
      replyText: formatSingleAnalysisReport(state.analysis, '✅ **ANALYSIS COMPLETE FOR YOUR UPLOADED RESUME!**\n\n'),
      platform: msg.platform,
      targetId: msg.senderId,
      buttons: standardButtons,
    };
  }

  // 9. COMMANDS FOR ANALYZED SESSION
  const analysisToUse = state.analysis || (activeSession?.resumes[0]?.analysis);

  if (analysisToUse) {
    if (textLower.includes('missing') || textLower.startsWith('/missingskills')) {
      const missingDetails = analysisToUse.missingSkills
        .map((m) => `• **${m.skill}**: ${m.whyItMatters}`)
        .join('\n');
      return {
        replyText: `❌ **UNDETECTED SKILLS BREAKDOWN**\n\n${missingDetails}`,
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    if (textLower.includes('ats') || textLower.startsWith('/ats')) {
      const ats = analysisToUse.atsScore;
      return {
        replyText: `🤖 **TRANSPARENT ATS SCORE BREAKDOWN (${ats.totalScore}/100)**\n\n• **Skills Match:** ${ats.skillsMatch.awardedPoints}/${ats.skillsMatch.maxPoints} pts\n• **Keyword Coverage:** ${ats.keywordMatch.awardedPoints}/${ats.keywordMatch.maxPoints} pts\n• **Experience/Projects:** ${ats.experienceProjectAlignment.awardedPoints}/${ats.experienceProjectAlignment.maxPoints} pts\n• **Education:** ${ats.educationAlignment.awardedPoints}/${ats.educationAlignment.maxPoints} pts\n• **Structure:** ${ats.resumeStructure.awardedPoints}/${ats.resumeStructure.maxPoints} pts`,
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    if (textLower.includes('improve') || textLower.startsWith('/improvements')) {
      const recs = analysisToUse.recruiterLens;
      return {
        replyText: `📝 **RESUME HEALTH & IMPROVEMENTS**\n\n👁️ **Recruiter First Impression:** "${recs.firstImpression}"\n💪 **Strongest Signal:** ${recs.strongestSignal}\n⚠️ **Weakest Signal:** ${recs.weakestSignal}\n💡 **Recruiter Recommendation:** ${recs.recruiterRecommendation}`,
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    if (textLower.includes('roadmap') || textLower.startsWith('/roadmap')) {
      const fixes = analysisToUse.roadmap.immediateFixes.map((f) => `• ${f}`).join('\n');
      const plan = analysisToUse.roadmap.sevenDayPlan.map((f) => `• ${f}`).join('\n');
      return {
        replyText: `🎓 **ACTIONABLE LEARNING ROADMAP**\n\n⚡ **Immediate Fixes:**\n${fixes}\n\n📅 **7-Day Plan:**\n${plan}`,
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    if (textLower.includes('whatif') || textLower.includes('what-if') || textLower.startsWith('/whatif')) {
      const gaps = analysisToUse.whatIf.availableGaps.map((g) => `• Acquire **${g.skill}**: +${g.pointsValue}% projected boost`).join('\n');
      return {
        replyText: `🔮 **WHAT-IF CAREER SIMULATOR**\n\nCurrent Score: **${analysisToUse.readinessScore.score}%**\n\nPotential Boosts:\n${gaps}`,
        platform: msg.platform,
        targetId: msg.senderId,
        buttons: standardButtons,
      };
    }

    if (textLower.includes('interview') || textLower.startsWith('/interview')) {
      state.isInterviewMode = true;
      state.currentQuestionIdx = 0;
      const firstQ = analysisToUse.interviewQuestions[0];
      return {
        replyText: `🎤 **MOCK INTERVIEW MODE STARTED**\n\nCategory: **${firstQ.category}**\n\nQuestion 1:\n*"${firstQ.question}"*\n\n*(Type your answer below)*`,
        platform: msg.platform,
        targetId: msg.senderId,
      };
    }
  }

  // 10. DEFAULT FALLBACK RESPONSE
  return {
    replyText: `👋 **Career Copilot Options:**

1️⃣ Select or paste a **Job Description (JD)**
2️⃣ Send or upload your **Resume File** (PDF/DOCX/TXT)

Or open our web app to analyze your profile and connect your session:
${APP_URL}`,
    platform: msg.platform,
    targetId: msg.senderId,
    buttons: [
      { label: '📂 Open Website App', action: '/app', webAppUrl: APP_URL },
      { label: '💻 Fullstack Developer', action: '/setrole_fullstack' },
      { label: '🤖 AI Engineer', action: '/setrole_ai' },
    ],
  };
}
