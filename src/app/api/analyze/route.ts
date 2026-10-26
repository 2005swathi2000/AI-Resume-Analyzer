import { NextRequest, NextResponse } from 'next/server';
import { parsePdfBuffer } from '../../../lib/parser/pdf-parser';
import { parseDocxBuffer } from '../../../lib/parser/docx-parser';
import { cleanText } from '../../../lib/parser/text-cleaner';
import { validateFile, sanitizeFilename, validateResumeText } from '../../../lib/parser/file-validator';
import { analyzeSingleResume, analyzeMultipleResumes } from '../../../lib/engine/analyzer-pipeline';
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME_A, DEMO_RESUME_B, DEMO_RESUME_C } from '../../../lib/demo/demo-data';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // A. JSON Payload handling (for text input or demo mode)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const isDemo = body.isDemo || false;

      if (isDemo) {
        const report = analyzeMultipleResumes(DEMO_JOB_DESCRIPTION, [
          { content: DEMO_RESUME_A, filename: 'Candidate_A_SeniorFullstack.pdf' },
          { content: DEMO_RESUME_B, filename: 'Candidate_B_MidBackend.pdf' },
          { content: DEMO_RESUME_C, filename: 'Candidate_C_JuniorFrontend.pdf' },
        ]);
        return NextResponse.json({ success: true, isDemo: true, data: report });
      }

      const { jdText, resumes } = body;
      if (!jdText || !resumes || !Array.isArray(resumes) || resumes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Please provide job description text and at least one resume.' },
          { status: 400 }
        );
      }

      if (resumes.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Maximum 10 resumes allowed.' },
          { status: 400 }
        );
      }

      if (resumes.length === 1) {
        const analysis = analyzeSingleResume(jdText, resumes[0].content, resumes[0].filename || 'Resume.txt');
        return NextResponse.json({ success: true, mode: 'single', data: analysis });
      } else {
        const report = analyzeMultipleResumes(jdText, resumes);
        return NextResponse.json({ success: true, mode: 'multiple', data: report });
      }
    }

    // B. Multipart FormData handling (file uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const jdTextRaw = formData.get('jdText') as string;
      const jdFiles = formData.getAll('jdFile') as File[];

      if (jdFiles.length > 1) {
        return NextResponse.json(
          { success: false, error: 'Only 1 Job Description file can be uploaded. Multiple JD files are not allowed.' },
          { status: 400 }
        );
      }

      const jdFile = jdFiles.length > 0 ? jdFiles[0] : null;
      const resumeFiles = formData.getAll('resumes') as File[];

      let extractedJdText = '';

      if (jdFile && jdFile.size > 0) {
        const safeJdName = sanitizeFilename(jdFile.name);
        const val = validateFile(safeJdName, undefined, jdFile.size);
        if (!val.isValid) return NextResponse.json({ success: false, error: val.error }, { status: 400 });

        const arrayBuf = await jdFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const ext = safeJdName.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
          const pdfRes = await parsePdfBuffer(buffer);
          if (pdfRes.isScannedOrUnreadable) {
            return NextResponse.json({ success: false, error: pdfRes.error }, { status: 400 });
          }
          extractedJdText = pdfRes.text;
        } else if (ext === 'docx') {
          const docxRes = await parseDocxBuffer(buffer);
          if (docxRes.error) return NextResponse.json({ success: false, error: docxRes.error }, { status: 400 });
          extractedJdText = docxRes.text;
        } else {
          extractedJdText = cleanText(buffer.toString('utf-8'));
        }
      } else if (jdTextRaw && jdTextRaw.trim().length > 0) {
        extractedJdText = cleanText(jdTextRaw);
      } else {
        return NextResponse.json(
          { success: false, error: 'Please provide a Job Description file or paste the JD text.' },
          { status: 400 }
        );
      }

      const jdValidation = validateResumeText(extractedJdText);
      if (!jdValidation.isValid) {
        return NextResponse.json({ success: false, error: 'Job Description text is empty or invalid.' }, { status: 400 });
      }
      extractedJdText = jdValidation.cleanedText;

      if (!resumeFiles || resumeFiles.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Please upload at least one Candidate Resume file (PDF, DOCX, or TXT).' },
          { status: 400 }
        );
      }

      if (resumeFiles.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Maximum 10 resumes allowed.' },
          { status: 400 }
        );
      }

      const extractedResumes: Array<{ content: string; filename: string }> = [];
      const failedFiles: Array<{ fileName: string; reason: string }> = [];

      for (const rFile of resumeFiles) {
        const safeFileName = sanitizeFilename(rFile.name);
        try {
          const val = validateFile(safeFileName, undefined, rFile.size);
          if (!val.isValid) {
            failedFiles.push({ fileName: safeFileName, reason: val.error || 'Invalid file format or size' });
            continue;
          }

          const arrayBuf = await rFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const ext = safeFileName.split('.').pop()?.toLowerCase();
          let rText = '';

          if (ext === 'pdf') {
            const pdfRes = await parsePdfBuffer(buffer);
            if (pdfRes.isScannedOrUnreadable || !pdfRes.text.trim()) {
              failedFiles.push({ fileName: safeFileName, reason: pdfRes.error || 'Unable to extract readable text from this PDF.' });
              continue;
            }
            rText = pdfRes.text;
          } else if (ext === 'docx') {
            const docxRes = await parseDocxBuffer(buffer);
            if (docxRes.error || !docxRes.text.trim()) {
              failedFiles.push({ fileName: safeFileName, reason: docxRes.error || 'Unable to extract readable text from this DOCX.' });
              continue;
            }
            rText = docxRes.text;
          } else {
            rText = cleanText(buffer.toString('utf-8'));
          }

          const textVal = validateResumeText(rText);
          if (!textVal.isValid) {
            failedFiles.push({ fileName: safeFileName, reason: textVal.error || 'File content is empty or unreadable.' });
            continue;
          }

          extractedResumes.push({ content: textVal.cleanedText, filename: safeFileName });
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'Corrupted file or parsing error.';
          failedFiles.push({ fileName: safeFileName, reason });
        }
      }

      if (extractedResumes.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'None of the uploaded resumes could be parsed successfully.',
            failedFiles,
          },
          { status: 400 }
        );
      }

      if (extractedResumes.length === 1 && failedFiles.length === 0) {
        const analysis = analyzeSingleResume(extractedJdText, extractedResumes[0].content, extractedResumes[0].filename);
        return NextResponse.json({ success: true, mode: 'single', data: analysis });
      } else {
        const report = analyzeMultipleResumes(extractedJdText, extractedResumes, failedFiles);
        return NextResponse.json({ success: true, mode: 'multiple', data: report });
      }
    }

    return NextResponse.json({ success: false, error: 'Unsupported Content-Type header' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: `Analysis Error: ${msg}` }, { status: 500 });
  }
}
