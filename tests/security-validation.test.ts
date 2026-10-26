import { describe, it, expect, vi } from 'vitest';
import {
  isValidResumeExtension,
  sanitizeFilename,
  validateFileBuffer,
  validateResumeText,
  MAX_FILE_SIZE_BYTES,
  MAX_RAW_TEXT_LENGTH,
  SUPPORTED_FILE_EXTENSIONS,
} from '../src/lib/parser/file-validator';
import { LocalAnalysisProvider } from '../src/lib/ai/local-analysis-provider';
import { GeminiProvider } from '../src/lib/ai/gemini-provider';
import { analyzeSingleResume } from '../src/lib/engine/analyzer-pipeline';
import { parseJobDescription } from '../src/lib/parser/jd-processor';
import { parseResume } from '../src/lib/parser/resume-parser';
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME_A } from '../src/lib/demo/demo-data';

describe('Phase 3 & 4 — Security, Privacy, and File Validation Suite', () => {
  const parsedJd = parseJobDescription(DEMO_JOB_DESCRIPTION);
  const parsedResume = parseResume(DEMO_RESUME_A, 'Alex_Johnson.pdf');

  describe('1. File Extension & Path Traversal Validation', () => {
    it('declares and supports canonical file extensions', () => {
      expect(SUPPORTED_FILE_EXTENSIONS).toEqual(['pdf', 'docx', 'txt']);
    });

    it('accepts all supported extensions (.pdf, .docx, .txt) regardless of casing', () => {
      expect(isValidResumeExtension('resume.pdf')).toBe(true);
      expect(isValidResumeExtension('resume.PDF')).toBe(true);
      expect(isValidResumeExtension('Candidate_CV.docx')).toBe(true);
      expect(isValidResumeExtension('profile.DOCX')).toBe(true);
      expect(isValidResumeExtension('notes.txt')).toBe(true);
      expect(isValidResumeExtension('Plain_Text.TXT')).toBe(true);
    });

    it('rejects unsupported and potentially executable extensions', () => {
      const forbidden = [
        'payload.exe',
        'script.sh',
        'exploit.py',
        'archive.zip',
        'batch.bat',
        'app.js',
        'page.html',
        'data.bin',
        'resume.pdf.exe',
      ];
      for (const file of forbidden) {
        expect(isValidResumeExtension(file)).toBe(false);
      }
    });

    it('sanitizes directory traversal patterns from uploaded filenames', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\cmd.exe')).not.toContain('..');
      expect(sanitizeFilename('../../resume.pdf')).toBe('resume.pdf');
      expect(sanitizeFilename('folder/subfolder/My_Resume.docx')).toBe('My_Resume.docx');
    });

    it('strips null bytes and non-printable control characters from filenames', () => {
      const contaminated = 'resume\0\x08_final.pdf';
      const sanitized = sanitizeFilename(contaminated);
      expect(sanitized).not.toContain('\0');
      expect(sanitized).toBe('resume_final.pdf');
    });

    it('falls back to default safe filename when filename is blank or only special characters', () => {
      expect(sanitizeFilename('')).toBe('resume_upload.pdf');
      expect(sanitizeFilename('   ')).toBe('resume_upload.pdf');
      expect(sanitizeFilename('///...///')).toBe('resume_upload.pdf');
    });
  });

  describe('2. File Buffer & Size Cap Validation', () => {
    it('rejects zero-byte / empty file buffers', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = validateFileBuffer(emptyBuffer, 'empty.pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects files exceeding the 10 MB maximum size cap', () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
      const result = validateFileBuffer(oversizedBuffer, 'huge_resume.pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('approves legitimate valid file buffers within limits', () => {
      const validBuffer = Buffer.from('Alex Johnson\nFull Stack Developer with React and Node.js');
      const result = validateFileBuffer(validBuffer, 'Alex_Johnson.txt');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('3. Text Length and Sanitization Caps', () => {
    it('rejects empty or whitespace-only resume text', () => {
      const emptyResult = validateResumeText('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toContain('empty');

      const whitespaceResult = validateResumeText('   \n\t  ');
      expect(whitespaceResult.isValid).toBe(false);
    });

    it('truncates excessively long text to MAX_RAW_TEXT_LENGTH to prevent memory exhaustion', () => {
      const hugeText = 'A'.repeat(MAX_RAW_TEXT_LENGTH + 5000);
      const result = validateResumeText(hugeText);
      expect(result.isValid).toBe(true);
      expect(result.cleanedText.length).toBeLessThanOrEqual(MAX_RAW_TEXT_LENGTH);
    });
  });

  describe('4. Deterministic Local Analysis Provider (Zero Cloud Leakage)', () => {
    const provider = new LocalAnalysisProvider();
    const baseAnalysis = analyzeSingleResume(DEMO_RESUME_A, DEMO_JOB_DESCRIPTION, 'Alex_Johnson.pdf');

    it('reports availability locally without internet or external API key', () => {
      expect(provider.isAvailable()).toBe(true);
      expect(provider.name).toContain('Local Analysis');
    });

    it('enhances analysis deterministically without cloud modification', async () => {
      const enhanced = await provider.enhanceAnalysis(
        parsedJd,
        parsedResume,
        baseAnalysis
      );
      expect(enhanced.usedLlmProvider).toBe(false);
      expect(enhanced.atsScore.totalScore).toBe(baseAnalysis.atsScore.totalScore);
    });

    it('provides explainable ATS score answers with point deductions', async () => {
      const answer = await provider.answerChatQuestion('Why is my ATS score low?', baseAnalysis);
      expect(answer).toContain(String(baseAnalysis.atsScore.totalScore));
      expect(answer).toContain('Skills Match');
      expect(answer).toContain('Keyword Match');
    });

    it('provides explicit missing skills breakdown', async () => {
      const answer = await provider.answerChatQuestion('What skills am I missing?', baseAnalysis);
      expect(answer).toContain('core JD skills were');
    });

    it('provides tailored summary rewrite without hallucinations', async () => {
      const answer = await provider.answerChatQuestion('Can you rewrite my summary?', baseAnalysis);
      expect(answer).toContain('Results-driven Software Engineer');
      expect(answer).toContain(baseAnalysis.jobTitle);
    });
  });

  describe('5. GeminiProvider Fallback & Timeout Protection', () => {
    it('detects missing Gemini API key and safely reports availability status', () => {
      const originalGeminiKey = process.env.GEMINI_API_KEY;
      const originalGoogleKey = process.env.GOOGLE_API_KEY;

      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const provider = new GeminiProvider();
      expect(provider.isAvailable()).toBe(false);

      // Restore environment
      if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
      if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey;
    });

    it('falls back to local analysis when Gemini API fails or throws', async () => {
      const provider = new GeminiProvider('invalid_dummy_test_key_12345');
      const baseAnalysis = analyzeSingleResume(DEMO_RESUME_A, DEMO_JOB_DESCRIPTION, 'Alex_Johnson.pdf');

      // Enhance should not throw; it must gracefully return the deterministic base analysis
      const result = await provider.enhanceAnalysis(
        parsedJd,
        parsedResume,
        baseAnalysis
      );

      expect(result).toBeDefined();
      expect(result.atsScore.totalScore).toBe(baseAnalysis.atsScore.totalScore);
      expect(result.usedLlmProvider).toBe(false);
    });

    it('actively catches AbortError and gracefully delegates to LocalAnalysisProvider', async () => {
      const provider = new GeminiProvider('test_key_for_abort');
      const baseAnalysis = analyzeSingleResume(DEMO_RESUME_A, DEMO_JOB_DESCRIPTION, 'Alex_Johnson.pdf');

      if (provider['genAI']) {
        const mockModel = {
          generateContent: vi.fn().mockImplementation(async () => {
            const err = new Error('Request aborted');
            err.name = 'AbortError';
            throw err;
          }),
        };
        vi.spyOn(provider['genAI'], 'getGenerativeModel').mockReturnValue(mockModel as never);
      }

      const result = await provider.enhanceAnalysis(parsedJd, parsedResume, baseAnalysis);
      expect(result).toBeDefined();
      expect(result.usedLlmProvider).toBe(false);
      expect(result.atsScore.totalScore).toBe(baseAnalysis.atsScore.totalScore);
    });

    it('falls back to local engine when chat question is aborted or times out', async () => {
      const provider = new GeminiProvider('test_key_for_abort');
      const baseAnalysis = analyzeSingleResume(DEMO_RESUME_A, DEMO_JOB_DESCRIPTION, 'Alex_Johnson.pdf');

      if (provider['genAI']) {
        const mockModel = {
          generateContent: vi.fn().mockRejectedValue(new Error('Gemini API request timed out after 10000ms')),
        };
        vi.spyOn(provider['genAI'], 'getGenerativeModel').mockReturnValue(mockModel as never);
      }

      const answer = await provider.answerChatQuestion('Why is my score low?', baseAnalysis);
      expect(answer).toBeDefined();
      expect(answer).toContain('AI ATS Compatibility Score');
    });
  });

  describe('6. Mathematical Integrity of 100-Point Scoring Breakdown', () => {
    it('guarantees that all 7 score dimensions sum exactly to totalScore and remain <= 100', () => {
      const analysis = analyzeSingleResume(DEMO_RESUME_A, DEMO_JOB_DESCRIPTION, 'Alex_Johnson.pdf');
      const score = analysis.atsScore;

      const sumAwarded =
        score.skillsMatch.awardedPoints +
        score.keywordMatch.awardedPoints +
        score.experienceProjectAlignment.awardedPoints +
        score.educationAlignment.awardedPoints +
        score.responsibilitiesAlignment.awardedPoints +
        score.resumeStructure.awardedPoints +
        score.atsParsingCompatibility.awardedPoints;

      expect(score.totalScore).toBe(sumAwarded);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);

      // Verify max points of the 7 dimensions
      expect(score.skillsMatch.maxPoints).toBe(30);
      expect(score.keywordMatch.maxPoints).toBe(15);
      expect(score.experienceProjectAlignment.maxPoints).toBe(15);
      expect(score.educationAlignment.maxPoints).toBe(10);
      expect(score.responsibilitiesAlignment.maxPoints).toBe(10);
      expect(score.resumeStructure.maxPoints).toBe(10);
      expect(score.atsParsingCompatibility.maxPoints).toBe(10);
    });
  });
});
