import { StructuredJD } from '../../types/analyzer';
import { cleanText } from './text-cleaner';
import { SKILL_TAXONOMY } from '../taxonomy/skill-taxonomy';

export function parseJobDescription(rawText: string): StructuredJD {
  const text = cleanText(rawText);
  const lowerText = text.toLowerCase();

  // 1. Job Title extraction
  let jobTitle = 'Software Engineer';
  const titlePatterns = [
    /(?:job title|role|position|opening|looking for a|hiring a|hiring for)\s*[:\-]?\s*([A-Za-z0-9\s/+#.-]{3,40})/i,
    /^([A-Za-z0-9\s/+#.-]{3,40})\s+(?:role|position|description)/i,
    /^(Senior|Junior|Lead|Principal|Full Stack|Backend|Frontend|Software|DevOps|Data|AI|ML|Cloud)\s+[A-Za-z0-9\s/+#.-]{2,30}/i,
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      jobTitle = match[1].trim();
      break;
    }
  }

  // 2. Company Name extraction
  let company = 'Target Employer';
  const companyPatterns = [
    /(?:company|organization|employer|about us|at|client)\s*[:\-]?\s*([A-Z][A-Za-z0-9\s,.&]{2,30})/,
    /([A-Z][A-Za-z0-9&]{2,20})\s+is hiring/i,
  ];
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      company = match[1].trim();
      break;
    }
  }

  // 3. Extract skills matching taxonomy
  const detectedSkills = new Set<string>();
  const programmingLanguages = new Set<string>();
  const frameworks = new Set<string>();
  const databases = new Set<string>();
  const cloudDevOps = new Set<string>();
  const aiMlGenAi = new Set<string>();
  const toolsPlatforms = new Set<string>();

  SKILL_TAXONOMY.forEach((entry) => {
    const forms = [entry.canonical, ...entry.synonyms];
    for (const form of forms) {
      // Escape for regex boundary match
      const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:\\b|[^a-zA-Z0-9])${escaped}(?:\\b|[^a-zA-Z0-9])`, 'i');
      if (regex.test(lowerText)) {
        detectedSkills.add(entry.canonical);
        if (entry.category === 'Language') programmingLanguages.add(entry.canonical);
        if (entry.category === 'Framework') frameworks.add(entry.canonical);
        if (entry.category === 'Database') databases.add(entry.canonical);
        if (entry.category === 'Cloud/DevOps') cloudDevOps.add(entry.canonical);
        if (entry.category === 'AI/ML') aiMlGenAi.add(entry.canonical);
        if (entry.category === 'Tools/Concepts') toolsPlatforms.add(entry.canonical);
        break;
      }
    }
  });

  // 4. Must-have vs Preferred separation
  const mustHaveSkills: string[] = [];
  const preferredSkills: string[] = [];

  const lines = text.split('\n');
  let currentSection: 'must' | 'preferred' | 'general' = 'general';

  lines.forEach((line) => {
    const lLower = line.toLowerCase();
    if (/must have|required|requirements|qualifications|mandatory|essential/i.test(lLower)) {
      currentSection = 'must';
    } else if (/preferred|nice to have|bonus|plus|desired/i.test(lLower)) {
      currentSection = 'preferred';
    }

    detectedSkills.forEach((skill) => {
      const reg = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (reg.test(line)) {
        if (currentSection === 'preferred') {
          if (!preferredSkills.includes(skill)) preferredSkills.push(skill);
        } else {
          if (!mustHaveSkills.includes(skill)) mustHaveSkills.push(skill);
        }
      }
    });
  });

  // Default fallback if sections were not cleanly demarcated
  if (mustHaveSkills.length === 0 && detectedSkills.size > 0) {
    Array.from(detectedSkills).forEach((skill, idx) => {
      if (idx < 6) mustHaveSkills.push(skill);
      else preferredSkills.push(skill);
    });
  }

  // 5. Responsibilities extraction
  const responsibilities: string[] = [];
  let isRespSection = false;
  lines.forEach((line) => {
    if (/responsibilities|key duties|what you'll do|what you will do|role overview|day to day/i.test(line)) {
      isRespSection = true;
      return;
    }
    if (isRespSection) {
      if (/requirements|qualifications|skills|benefits|about us/i.test(line) && line.length < 30) {
        isRespSection = false;
        return;
      }
      if (line.trim().length > 10) {
        responsibilities.push(line.trim().replace(/^[•\-\*\d\.\s]+/, ''));
      }
    }
  });

  // 6. Education requirements
  const education: string[] = [];
  const eduMatch = text.match(/(?:bachelor|master|phd|b\.?s|m\.?s|b\.?tech|m\.?tech|computer science|engineering|degree)[^\.\n]*/gi);
  if (eduMatch) {
    eduMatch.forEach((e) => {
      if (!education.includes(e.trim())) education.push(e.trim());
    });
  }

  // 7. Experience requirements
  const experience: string[] = [];
  const expMatch = text.match(/\d+\+?\s*(?:years|yrs)\b[^\.\n]*/gi);
  if (expMatch) {
    expMatch.forEach((ex) => {
      if (!experience.includes(ex.trim())) experience.push(ex.trim());
    });
  }

  // 8. Certifications
  const certifications: string[] = [];
  const certKeywords = ['AWS Certified', 'Azure Certified', 'CKA', 'PMP', 'Scrum Master', 'CISSP', 'Google Cloud Certified'];
  certKeywords.forEach((cert) => {
    if (new RegExp(cert, 'i').test(text)) {
      certifications.push(cert);
    }
  });

  // 9. Location
  const location: string[] = [];
  const locMatch = text.match(/(?:location|based in|remote|hybrid|on-site)\s*[:\-]?\s*([A-Za-z0-9\s,]{3,30})/i);
  if (locMatch && locMatch[1]) {
    location.push(locMatch[1].trim());
  } else if (/remote/i.test(text)) {
    location.push('Remote');
  }

  // 10. Extract general keywords
  const keywords = Array.from(
    new Set([
      ...Array.from(detectedSkills),
      ...programmingLanguages,
      ...frameworks,
      ...databases,
      ...cloudDevOps,
      ...aiMlGenAi,
    ])
  );

  return {
    rawText: text,
    jobTitle,
    company,
    mustHaveSkills,
    preferredSkills,
    programmingLanguages: Array.from(programmingLanguages),
    frameworks: Array.from(frameworks),
    databases: Array.from(databases),
    cloudDevOps: Array.from(cloudDevOps),
    aiMlGenAi: Array.from(aiMlGenAi),
    education,
    experience,
    certifications,
    responsibilities: responsibilities.slice(0, 8),
    keywords,
    toolsPlatforms: Array.from(toolsPlatforms),
    location,
  };
}
