import assert from 'node:assert';
import test from 'node:test';
import { cleanText } from '../src/lib/parser/text-cleaner.ts';
import { parseJobDescription } from '../src/lib/parser/jd-processor.ts';
import { parseResume } from '../src/lib/parser/resume-parser.ts';
import { normalizeSkill } from '../src/lib/taxonomy/skill-taxonomy.ts';
import { matchSkills } from '../src/lib/engine/matching-engine.ts';
import { buildJobDna, buildCareerTwin } from '../src/lib/engine/career-twin.ts';
import { findSkillAdjacencies } from '../src/lib/engine/skill-adjacency.ts';
import { calculateWhatIfProjection } from '../src/lib/engine/what-if-simulator.ts';
import { analyzeRecruiterLens } from '../src/lib/engine/recruiter-lens.ts';
import { evaluateMockAnswer } from '../src/lib/engine/mock-interviewer.ts';
import { analyzeSingleResume, analyzeMultipleResumes } from '../src/lib/engine/analyzer-pipeline.ts';
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME_A, DEMO_RESUME_B, DEMO_RESUME_C } from '../src/lib/demo/demo-data.ts';

test('1. Text cleaning and normalization', () => {
  const raw = '  React.js   \r\n\r\n  • Node.js  \t  ';
  const cleaned = cleanText(raw);
  assert.ok(cleaned.includes('React.js'));
  assert.ok(cleaned.includes('• Node.js'));
});

test('2. Skill Normalization & Taxonomy Lookup', () => {
  assert.strictEqual(normalizeSkill('React.js').canonical, 'React');
  assert.strictEqual(normalizeSkill('Postgres').canonical, 'PostgreSQL');
  assert.strictEqual(normalizeSkill('JS').canonical, 'JavaScript');
  assert.strictEqual(normalizeSkill('RESTful API').canonical, 'REST API');
});

test('3. Job DNA Building', () => {
  const jd = parseJobDescription(DEMO_JOB_DESCRIPTION);
  const jobDna = buildJobDna(jd);
  assert.strictEqual(jobDna.jobTitle, jd.jobTitle);
  assert.ok(jobDna.dnaItems.length > 0);
  assert.ok(jobDna.dnaItems.some((item) => item.priority === 'CRITICAL'));
});

test('4. Career Twin Building', () => {
  const jd = parseJobDescription(DEMO_JOB_DESCRIPTION);
  const resumeA = parseResume(DEMO_RESUME_A);
  const { matched, partiallyMatched, missing } = matchSkills(jd, resumeA);
  const twin = buildCareerTwin(jd, resumeA, matched, partiallyMatched, missing);

  assert.ok(twin.alignmentPct >= 70);
  assert.ok(twin.technicalNodes.some((n) => n.status === 'STRONG'));
  assert.ok(twin.summaryMessage.includes('aligned'));
});

test('5. Skill Adjacency Engine', () => {
  const adj = findSkillAdjacencies(['Node.js', 'JavaScript'], ['Docker', 'TypeScript']);
  assert.ok(adj.length > 0);
  assert.strictEqual(adj[0].existingSkill, 'Node.js');
  assert.strictEqual(adj[0].targetMissingSkill, 'Docker');
});

test('6. What-If Projected Readiness Simulator', () => {
  const jd = parseJobDescription(DEMO_JOB_DESCRIPTION);
  const resumeC = parseResume(DEMO_RESUME_C);
  const { missing } = matchSkills(jd, resumeC);
  const projection = calculateWhatIfProjection(60, missing);

  assert.strictEqual(projection.currentReadinessScore, 60);
  assert.ok(projection.availableGaps.length > 0);
  assert.ok(projection.disclaimer.includes('Projected score assumes'));
});

test('7. Recruiter Lens & 10-Second Scan', () => {
  const jd = parseJobDescription(DEMO_JOB_DESCRIPTION);
  const resumeA = parseResume(DEMO_RESUME_A);
  const { matched, missing } = matchSkills(jd, resumeA);
  const lens = analyzeRecruiterLens(jd, resumeA, matched, missing);

  assert.ok(lens.tenSecondScan.visibleIn10Seconds.length > 0);
  assert.ok(lens.firstImpression);
  assert.ok(lens.strongestSignal);
});

test('8. Mock Interview Evaluation', () => {
  const evalResult = evaluateMockAnswer(
    { id: '1', category: 'Technical', question: 'Explain how you built REST APIs with Node.js and error handling.', whyAsked: '', suggestedFocus: 'Node.js Express' },
    'I built REST APIs using Express and Node.js with try catch blocks for error handling and standard HTTP response codes.'
  );

  assert.ok(evalResult.technicalAccuracyPct >= 70);
  assert.ok(evalResult.clarityPct >= 70);
  assert.ok(evalResult.whatYouDidWell);
});

test('9. Master End-to-End Analysis Pipeline', () => {
  const analysis = analyzeSingleResume(DEMO_JOB_DESCRIPTION, DEMO_RESUME_A, 'Alex_Johnson.pdf');

  assert.ok(analysis.readinessScore.score >= 75);
  assert.ok(analysis.careerTwin.alignmentPct >= 70);
  assert.ok(analysis.jobDna.dnaItems.length > 0);
  assert.ok(analysis.rawEvidence.length > 0);
  assert.ok(analysis.nextStep.title);
  assert.strictEqual(analysis.usedLlmProvider, false);
});

test('10. Multi-Resume Comparison Matrix', () => {
  const report = analyzeMultipleResumes(DEMO_JOB_DESCRIPTION, [
    { content: DEMO_RESUME_A, filename: 'Candidate_A.pdf' },
    { content: DEMO_RESUME_B, filename: 'Candidate_B.pdf' },
    { content: DEMO_RESUME_C, filename: 'Candidate_C.pdf' },
  ]);

  assert.strictEqual(report.totalResumesAnalyzed, 3);
  assert.strictEqual(report.comparisonTable.length, 3);
  assert.ok(report.comparisonTable[0].readinessScore >= report.comparisonTable[1].readinessScore);
  assert.ok(report.whyTopCandidateIsStrongest.includes('ranks first'));
});
