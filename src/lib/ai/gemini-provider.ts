import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider } from './ai-provider-interface';
import { StructuredJD, StructuredResume, FullAnalysisResult } from '../../types/analyzer';

const GEMINI_TIMEOUT_MS = 10000; // 10 seconds execution limit

/**
 * Executes a generative AI operation with an AbortController signal
 * so that timeouts actively abort the underlying HTTP connection rather than
 * merely abandoning an un-aborted promise.
 */
async function executeWithAbortTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = GEMINI_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Gemini API request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GeminiProvider manages optional LLM-assisted conversational coaching and bullet rewrites.
 *
 * Privacy & Network Transmission Notice:
 * When an external API key is configured (GEMINI_API_KEY or GOOGLE_API_KEY), candidate
 * prompt data is transmitted over HTTPS to Google's Gemini API endpoint. If a request
 * subsequently times out or encounters an error (rate limit, model unavailable) and falls back
 * to LocalAnalysisProvider, data transmission to Google was already initiated.
 * True zero-cloud-transmission local isolation occurs exclusively when running without
 * a Gemini API key in Local Analysis Engine mode.
 */
export class GeminiProvider implements AIProvider {
  name = 'Google Gemini LLM Provider';
  private apiKey: string | undefined;
  private genAI: GoogleGenerativeAI | undefined;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    if (this.apiKey.length > 0) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      } catch (err) {
        console.warn('⚠️ GeminiProvider initialization warning:', err instanceof Error ? err.message : 'Unknown initialization error');
        this.genAI = undefined;
      }
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 0 && !!this.genAI;
  }

  async enhanceAnalysis(
    _jd: StructuredJD,
    _resume: StructuredResume,
    baseAnalysis: FullAnalysisResult
  ): Promise<FullAnalysisResult> {
    if (!this.isAvailable() || !this.genAI) {
      return { ...baseAnalysis, usedLlmProvider: false };
    }

    try {
      const model = this.genAI.getGenerativeModel(
        { model: 'gemini-1.5-flash' },
        { timeout: GEMINI_TIMEOUT_MS }
      );
      const prompt = `Analyze this candidate resume for job title '${baseAnalysis.jobTitle}'.
Detected Skills: ${baseAnalysis.matchedSkills.map((m) => m.jdSkill).join(', ')}
Missing Skills: ${baseAnalysis.missingSkills.map((m) => m.skill).join(', ')}
Provide 2 short, high-impact bullet rewrite suggestions for their project experience without fabricating metrics or non-existent tech.`;

      const result = await executeWithAbortTimeout((signal) =>
        model.generateContent(prompt, { signal })
      );
      const text = result.response.text();

      if (text && baseAnalysis.projectAnalysis.length > 0) {
        baseAnalysis.projectAnalysis[0].rewriteBulletSuggestions.push(`Gemini AI Suggestion: ${text.substring(0, 180)}...`);
      }

      return { ...baseAnalysis, usedLlmProvider: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Gemini error';
      console.warn(`ℹ️ Gemini enhanceAnalysis gracefully fell back to deterministic output: ${msg}`);
      return { ...baseAnalysis, usedLlmProvider: false };
    }
  }

  async answerChatQuestion(question: string, analysisContext: FullAnalysisResult): Promise<string> {
    if (!this.isAvailable() || !this.genAI) {
      const fallback = new (await import('./local-analysis-provider')).LocalAnalysisProvider();
      return fallback.answerChatQuestion(question, analysisContext);
    }

    try {
      const model = this.genAI.getGenerativeModel(
        { model: 'gemini-1.5-flash' },
        { timeout: GEMINI_TIMEOUT_MS }
      );
      const prompt = `You are an expert AI Resume Coach and ATS Recruiter.
Candidate Context:
- Target Role: ${analysisContext.jobTitle}
- Candidate Name: ${analysisContext.candidateName}
- ATS Compatibility Score: ${analysisContext.atsScore.totalScore}/100
- Alignment Tier: ${analysisContext.alignmentScore.tier} (${analysisContext.alignmentScore.score}/100)
- Matched Skills: ${analysisContext.matchedSkills.map((m) => m.jdSkill).join(', ')}
- Missing Skills (Not Detected): ${analysisContext.missingSkills.map((m) => m.skill).join(', ')}

User Question: "${question}"

Instructions:
- Provide an accurate, encouraging, highly professional answer based on the facts provided above.
- Do NOT fabricate candidate experience, non-existent projects, or unstated achievements.
- If recommending missing skills, clarify that they were "not detected in the uploaded text".
- Keep response under 250 words using clean Markdown formatting.`;

      const result = await executeWithAbortTimeout((signal) =>
        model.generateContent(prompt, { signal })
      );
      return result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Gemini error';
      console.warn(`ℹ️ Gemini chat question gracefully fell back to local engine: ${msg}`);
      const fallback = new (await import('./local-analysis-provider')).LocalAnalysisProvider();
      return fallback.answerChatQuestion(question, analysisContext);
    }
  }
}
