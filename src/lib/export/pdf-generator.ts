import { FullAnalysisResult } from '../../types/analyzer';

export function generatePdfHtmlReport(analysis: FullAnalysisResult): string {
  const { candidateName, resumeFilename, jobTitle, company, atsScore, alignmentScore, matchedSkills, missingSkills, drawbacks, courseRecommendations, interviewQuestions } = analysis;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ATS Analysis Report - ${candidateName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; background: #ffffff; }
    h1 { color: #0f172a; font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
    h2 { color: #1e3a8a; font-size: 18px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .score-card { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .score-value { font-size: 28px; font-weight: bold; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
    th { background: #f1f5f9; color: #334155; }
    .badge-matched { background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .badge-missing { background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .drawback-item { background: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px; margin-bottom: 12px; border-radius: 0 6px 6px 0; }
    .resource-card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin-bottom: 10px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>AI Resume & Recruitment Analysis Report</h1>
  <div class="meta-box">
    <div><strong>Candidate Name:</strong> ${candidateName}</div>
    <div><strong>Target Position:</strong> ${jobTitle}</div>
    <div><strong>Resume File:</strong> ${resumeFilename}</div>
    <div><strong>Target Employer:</strong> ${company || 'Target Employer'}</div>
  </div>

  <div class="score-card">
    <div>AI ATS Compatibility Score</div>
    <div class="score-value">${atsScore.totalScore} / 100</div>
    <div style="margin-top: 8px; font-weight: 600; color: #1e40af;">JD Alignment Tier: ${alignmentScore.tier} (${alignmentScore.score}/100)</div>
  </div>

  <h2>1. ATS Score Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Evaluation Dimension</th>
        <th>Score</th>
        <th>Audit Reason & Lost Points</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Skills Match</td><td>${atsScore.skillsMatch.awardedPoints} / 30</td><td>${atsScore.skillsMatch.reason}</td></tr>
      <tr><td>Keyword Match</td><td>${atsScore.keywordMatch.awardedPoints} / 15</td><td>${atsScore.keywordMatch.reason}</td></tr>
      <tr><td>Experience & Project Alignment</td><td>${atsScore.experienceProjectAlignment.awardedPoints} / 15</td><td>${atsScore.experienceProjectAlignment.reason}</td></tr>
      <tr><td>Education Alignment</td><td>${atsScore.educationAlignment.awardedPoints} / 10</td><td>${atsScore.educationAlignment.reason}</td></tr>
      <tr><td>Responsibilities Alignment</td><td>${atsScore.responsibilitiesAlignment.awardedPoints} / 10</td><td>${atsScore.responsibilitiesAlignment.reason}</td></tr>
      <tr><td>Resume Structure</td><td>${atsScore.resumeStructure.awardedPoints} / 10</td><td>${atsScore.resumeStructure.reason}</td></tr>
      <tr><td>ATS Parsing Compatibility</td><td>${atsScore.atsParsingCompatibility.awardedPoints} / 10</td><td>${atsScore.atsParsingCompatibility.reason}</td></tr>
    </tbody>
  </table>

  <h2>2. Skill Match Summary</h2>
  <div>
    <h3>✅ Detected Skills (${matchedSkills.length})</h3>
    <p>${matchedSkills.map(m => `<span class="badge-matched">${m.jdSkill} (${m.confidence}%)</span>`).join(' ')}</p>
    
    <h3>⚠️ Undetected Skills (${missingSkills.length})</h3>
    <p>${missingSkills.map(m => `<span class="badge-missing">${m.skill}</span>`).join(' ')}</p>
    <p style="font-size: 12px; color: #64748b; italic;">* Undetected skills were not found in uploaded text. Frame additions accurately based on genuine candidate experience.</p>
  </div>

  <h2>3. Resume Drawback Audit</h2>
  ${drawbacks.map(d => `
    <div class="drawback-item">
      <strong>[${d.severity}] ${d.problem}</strong>
      <p style="margin: 4px 0 0 0; font-size: 13px;">${d.recommendedFix}</p>
    </div>
  `).join('')}

  <h2>4. Recommended Learning Resources</h2>
  ${courseRecommendations.map(c => `
    <div class="resource-card">
      <strong>${c.courseTitle}</strong> (${c.provider}) - <span style="font-size:12px; font-weight:600; color:#15803d;">${c.availabilityTag}</span>
      <p style="margin:4px 0 0 0; font-size: 13px;">${c.whyRecommended}</p>
    </div>
  `).join('')}

  <h2>5. Interview Preparation</h2>
  <ol>
    ${interviewQuestions.slice(0, 6).map(q => `
      <li style="margin-bottom: 10px;">
        <strong>[${q.category}] ${q.question}</strong><br/>
        <span style="font-size: 13px; color: #475569;">Focus: ${q.suggestedFocus}</span>
      </li>
    `).join('')}
  </ol>
</body>
</html>`;
}
