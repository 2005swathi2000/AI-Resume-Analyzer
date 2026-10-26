import { FullAnalysisResult } from '../../types/analyzer';

export function generateMarkdownReport(analysis: FullAnalysisResult): string {
  const {
    candidateName,
    resumeFilename,
    jobTitle,
    company,
    atsScore,
    alignmentScore,
    matchedSkills,
    missingSkills,
    drawbacks,
    projectAnalysis,
    recommendedSkills,
    courseRecommendations,
    roadmap,
    interviewQuestions,
  } = analysis;

  return `# AI Recruitment & ATS Analysis Report

**Candidate Name:** ${candidateName}  
**Resume File:** ${resumeFilename}  
**Target Position:** ${jobTitle}  
**Target Company:** ${company || 'Target Employer'}  
**Generated Date:** ${new Date().toLocaleDateString()}  

---

## Executive Summary

- **AI ATS Compatibility Score:** **${atsScore.totalScore}/100**
- **JD ↔ Resume Alignment Score:** **${alignmentScore.score}/100 (${alignmentScore.tier} Tier)**
- **Match Status:** ${alignmentScore.explanation}

---

## 1. ATS Score Breakdown & Explainability

| Dimension | Awarded / Max | Status & Reason |
| :--- | :---: | :--- |
| **Skills Match** | ${atsScore.skillsMatch.awardedPoints} / 30 | ${atsScore.skillsMatch.reason} |
| **Keyword Match** | ${atsScore.keywordMatch.awardedPoints} / 15 | ${atsScore.keywordMatch.reason} |
| **Experience / Projects** | ${atsScore.experienceProjectAlignment.awardedPoints} / 15 | ${atsScore.experienceProjectAlignment.reason} |
| **Education Alignment** | ${atsScore.educationAlignment.awardedPoints} / 10 | ${atsScore.educationAlignment.reason} |
| **Responsibilities Alignment** | ${atsScore.responsibilitiesAlignment.awardedPoints} / 10 | ${atsScore.responsibilitiesAlignment.reason} |
| **Resume Structure** | ${atsScore.resumeStructure.awardedPoints} / 10 | ${atsScore.resumeStructure.reason} |
| **ATS Parsing Compatibility** | ${atsScore.atsParsingCompatibility.awardedPoints} / 10 | ${atsScore.atsParsingCompatibility.reason} |
| **TOTAL SCORE** | **${atsScore.totalScore} / 100** | **Comprehensive Evaluation** |

---

## 2. Technical Skill Match Analysis

### ✅ Matched Skills (${matchedSkills.length})
${matchedSkills.map((m) => `- **${m.jdSkill}** (${m.matchType} Match, ${m.confidence}% Confidence)\n  - *Evidence:* "${m.resumeEvidence}"`).join('\n')}

### ⚠️ Missing / Undetected Skills (${missingSkills.length})
> *Note: Missing skills were not detected in the uploaded resume text. If you possess these skills, consider updating your resume bullet points.*

${missingSkills.map((m) => `- **${m.skill}** (${m.currentImportance})\n  - ${m.phrasingNotice}\n  - *Action:* ${m.suggestedResource}`).join('\n')}

---

## 3. Resume Drawbacks & Defect Audit

${drawbacks
  .map(
    (d) => `### ${d.severity === 'CRITICAL' ? '🔴' : d.severity === 'HIGH' ? '🟠' : '🟡'} ${d.problem}
- **Why it Matters:** ${d.whyItMatters}
- **Recommended Fix:** ${d.recommendedFix}
- **Evidence:** \`${d.evidence}\`
`
  )
  .join('\n')}

---

## 4. Project Relevance Analysis

${projectAnalysis
  .map(
    (p) => `### 📁 ${p.title} (Relevance Score: ${p.relevanceScore}/100)
- **Technologies Used:** ${p.technologies.join(', ') || 'N/A'}
- **Relevance:** ${p.relevanceToJd}
- **Technical Complexity:** ${p.technicalComplexity}
- **Involvement:** Backend: ${p.backendInvolvement ? 'Yes' : 'No'} | Frontend: ${p.frontendInvolvement ? 'Yes' : 'No'} | API: ${p.apiInvolvement ? 'Yes' : 'No'} | DB: ${p.databaseInvolvement ? 'Yes' : 'No'}
- **Bullet Rewrite Suggestion:**  
  ${p.rewriteBulletSuggestions.map((s) => `  > "${s}"`).join('\n')}
`
  )
  .join('\n')}

---

## 5. Prioritized Skill Roadmap

${recommendedSkills
  .map(
    (s) => `- **[${s.priority}] ${s.skill}** (${s.difficulty}, Est. ${s.estimatedLearningTime})
  - *Why Relevant:* ${s.whyRelevant}
  - *GitHub Proof:* ${s.howToDemonstrateOnGithub}`
  )
  .join('\n')}

---

## 6. Recommended Free Learning Resources

${courseRecommendations
  .map(
    (c) => `- **${c.courseTitle}** (${c.provider})
  - *Availability:* \`${c.availabilityTag}\` | *Est. Duration:* ${c.estimatedDuration}
  - *Why Recommended:* ${c.whyRecommended}
  - *Resource Link:* [${c.courseTitle}](${c.url})`
  )
  .join('\n')}

---

## 7. Actionable Improvement Roadmap

### ⚡ Immediate Fixes (Today)
${roadmap.immediateFixes.map((f) => `- ${f}`).join('\n')}

### 📅 7-Day Plan
${roadmap.sevenDayPlan.map((f) => `- ${f}`).join('\n')}

### 🎯 30-Day Plan
${roadmap.thirtyDayPlan.map((f) => `- ${f}`).join('\n')}

---

## 8. Customized Interview Preparation Questions

${interviewQuestions
  .map(
    (q, idx) => `${idx + 1}. **[${q.category}] ${q.question}**
   - *Why Asked:* ${q.whyAsked}
   - *Suggested Focus:* ${q.suggestedFocus}`
  )
  .join('\n\n')}
`;
}
