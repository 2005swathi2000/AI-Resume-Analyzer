import { InterviewQuestionItem, MockAnswerEvaluation } from '../../types/analyzer';

export function evaluateMockAnswer(
  question: InterviewQuestionItem,
  candidateAnswer: string,
  resumeText?: string
): MockAnswerEvaluation {
  const answerRaw = candidateAnswer.trim();
  const answerLower = answerRaw.toLowerCase();
  const answerWords = answerLower.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = answerWords.length;

  const expectedRubricConcepts = getQuestionRubricConcepts(question);

  // 1. QUESTION RELEVANCE GATE
  // Extract core topic stems (excluding generic language names unless specific to question)
  const coreTopicStems = getQuestionCoreStems(question, expectedRubricConcepts);
  const matchedStems = coreTopicStems.filter((stem) => answerLower.includes(stem.toLowerCase()));

  let questionRelevancePct = 0;
  if (wordCount >= 4 && matchedStems.length > 0) {
    questionRelevancePct = Math.min(100, Math.round((matchedStems.length / Math.min(coreTopicStems.length, 3)) * 80 + 20));
  } else if (wordCount >= 10 && coreTopicStems.length === 0) {
    questionRelevancePct = 70;
  } else {
    questionRelevancePct = 15;
  }

  // Check for completely off-topic or fluff answers
  const isRelevant = questionRelevancePct >= 40 && wordCount >= 6;

  // 2. RESUME CLAIM CONSISTENCY CHECK
  let resumeClaimWarning: string | undefined = undefined;
  if (resumeText) {
    const rLower = resumeText.toLowerCase();
    const techClaims = ['aws', 'docker', 'kubernetes', 'react', 'node', 'python', 'java', 'sql', 'mongodb', 'graphql', 'microservices'];
    for (const tech of techClaims) {
      if (answerLower.includes(tech) && !rLower.includes(tech)) {
        resumeClaimWarning = `⚠ RESUME CLAIM NOT DETECTED: Your answer mentions ${tech.toUpperCase()}, but this technology was not detected in your uploaded resume. Be prepared to provide verifiable project evidence if asked.`;
        break;
      }
    }
  }

  if (!isRelevant) {
    return {
      overallScorePct: 15,
      questionRelevancePct: 15,
      technicalAccuracyPct: 10,
      conceptCoveragePct: 10,
      depthPct: 10,
      clarityPct: 30,
      practicalEvidencePct: 0,
      isRelevant: false,
      relevanceStatus: '❌ Answer does not adequately address the question.',
      answerQualityTier: '🔴 Weak',
      whatYouDidWell: 'Provided a response, but it lacks relevance to the specific technical question prompt.',
      demonstratedConcepts: [],
      partiallyDemonstratedConcepts: matchedStems,
      missingConcepts: expectedRubricConcepts.slice(0, 3),
      suggestedImprovement: `Your answer describes general concepts but does not address "${question.question}". State your core technical choice upfront, explain your rationale, and give a practical example.`,
      resumeClaimWarning,
      followUpQuestion: `Could you specifically address how you would handle ${question.suggestedFocus || question.category} in practice?`,
    };
  }

  // 3. CONCEPT EXTRACTION & KEYWORD STUFFING CHECK
  const demonstratedConcepts: string[] = [];
  const partiallyDemonstratedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  expectedRubricConcepts.forEach((concept) => {
    const cLower = concept.toLowerCase();
    if (answerLower.includes(cLower)) {
      demonstratedConcepts.push(concept);
    } else if (cLower.split(' ').some((part) => answerLower.includes(part) && part.length > 3)) {
      partiallyDemonstratedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  });

  const conceptRatio = expectedRubricConcepts.length > 0 ? (demonstratedConcepts.length + partiallyDemonstratedConcepts.length * 0.5) / expectedRubricConcepts.length : 0.5;
  let conceptCoveragePct = Math.min(100, Math.round(conceptRatio * 85 + 15));

  // Detect Keyword Stuffing: list of technical terms without explanatory verbs/connectors
  const explanatoryConnectors = ['because', 'using', 'configured', 'implemented', 'handles', 'prevents', 'ensures', 'avoid', 'resulted in', 'designed', 'built', 'created', 'when', 'so'];
  const connectorCount = explanatoryConnectors.filter((conn) => answerLower.includes(conn)).length;
  const isKeywordStuffed = demonstratedConcepts.length >= 3 && connectorCount === 0 && wordCount < 25;

  let depthPct = 50;
  if (wordCount > 35 && connectorCount >= 2) depthPct += 35;
  else if (wordCount > 20 && connectorCount >= 1) depthPct += 20;
  if (isKeywordStuffed) depthPct = 25;

  let technicalAccuracyPct = Math.min(95, Math.round(questionRelevancePct * 0.4 + conceptCoveragePct * 0.5 + (connectorCount > 0 ? 10 : 0)));
  const clarityPct = connectorCount >= 1 || wordCount > 20 ? 80 : 50;
  const practicalEvidencePct = answerLower.includes('for example') || answerLower.includes('in my project') || answerLower.includes('we built') || answerLower.includes('i used') ? 85 : 30;

  if (isKeywordStuffed) {
    technicalAccuracyPct = Math.min(45, technicalAccuracyPct);
    conceptCoveragePct = Math.min(40, conceptCoveragePct);
  }

  // 4. MULTI-DIMENSIONAL SCORING WEIGHTS
  // Question Relevance (20%), Technical Accuracy (25%), Concept Coverage (20%), Depth (15%), Clarity (10%), Practical Evidence (10%)
  const overallScorePct = Math.round(
    questionRelevancePct * 0.2 +
    technicalAccuracyPct * 0.25 +
    conceptCoveragePct * 0.2 +
    depthPct * 0.15 +
    clarityPct * 0.1 +
    practicalEvidencePct * 0.1
  );

  let answerQualityTier: '🟢 Strong' | '🟡 Partial' | '🔴 Weak' = '🔴 Weak';
  if (overallScorePct >= 75) answerQualityTier = '🟢 Strong';
  else if (overallScorePct >= 50) answerQualityTier = '🟡 Partial';

  // 5. ADAPTIVE FOLLOW-UP QUESTION GENERATION
  const followUpQuestion = generateFollowUpQuestion(question, answerLower, demonstratedConcepts);

  return {
    overallScorePct,
    questionRelevancePct,
    technicalAccuracyPct,
    conceptCoveragePct,
    depthPct,
    clarityPct,
    practicalEvidencePct,
    isRelevant: true,
    relevanceStatus: '✓ Answer directly addresses the interview question.',
    answerQualityTier,
    whatYouDidWell:
      demonstratedConcepts.length > 0
        ? `Effectively demonstrated key technical concepts including: ${demonstratedConcepts.slice(0, 3).join(', ')}.`
        : 'Provided a relevant response addressing the core question prompt.',
    demonstratedConcepts,
    partiallyDemonstratedConcepts,
    missingConcepts: missingConcepts.length > 0 ? missingConcepts.slice(0, 3) : ['Mention quantitative performance or scale metrics.'],
    suggestedImprovement:
      isKeywordStuffed
        ? 'Avoid keyword listing. Explain HOW and WHY you used each technology using practical implementation details.'
        : `To reach 90%+: Explain the trade-offs of your approach and detail how you prevented edge-case failures.`,
    resumeClaimWarning,
    followUpQuestion,
  };
}

function getQuestionCoreStems(q: InterviewQuestionItem, rubricConcepts: string[]): string[] {
  const stems = new Set<string>();
  rubricConcepts.forEach((concept) => {
    concept.toLowerCase().split(/\s+/).forEach((word) => {
      if (word.length > 3 && word !== 'java' && word !== 'python') {
        stems.add(word);
      }
    });
  });
  if (q.question.toLowerCase().includes('concurrency')) {
    stems.add('concurren');
    stems.add('thread');
    stems.add('executor');
  }
  return Array.from(stems);
}

function getQuestionRubricConcepts(q: InterviewQuestionItem): string[] {
  const text = (q.question + ' ' + q.suggestedFocus).toLowerCase();
  const concepts: string[] = [];

  if (text.includes('concurrency') || text.includes('thread')) {
    concepts.push('ExecutorService', 'thread pools', 'synchronization', 'concurrent collections', 'race conditions');
  } else if (text.includes('api') || text.includes('rest') || text.includes('endpoint')) {
    concepts.push('RESTful design', 'status codes', 'authentication', 'rate limiting', 'error handling');
  } else if (text.includes('database') || text.includes('sql') || text.includes('query')) {
    concepts.push('indexing', 'query optimization', 'transactions', 'connection pooling');
  } else if (text.includes('docker') || text.includes('cloud') || text.includes('aws')) {
    concepts.push('containerization', 'deployment pipeline', 'IAM roles', 'environment configuration');
  } else {
    concepts.push('architecture choice', 'trade-off analysis', 'error handling', 'monitoring');
  }
  return concepts;
}

function generateFollowUpQuestion(q: InterviewQuestionItem, answerLower: string, demonstratedConcepts: string[]): string {
  if (answerLower.includes('executor') || answerLower.includes('thread')) {
    return 'How would you handle task cancellation or thread pool exhaustion under sudden traffic spikes?';
  }
  if (answerLower.includes('docker') || answerLower.includes('container')) {
    return 'How did you optimize your Docker image size and handle multi-stage builds?';
  }
  if (answerLower.includes('rest') || answerLower.includes('api')) {
    return 'How do you ensure backward compatibility when updating public API contracts?';
  }
  if (demonstratedConcepts.length > 0) {
    return `Can you share a specific project challenge you encountered while implementing ${demonstratedConcepts[0]} and how you resolved it?`;
  }
  return `Why did you choose this specific technical approach over common alternatives?`;
}
