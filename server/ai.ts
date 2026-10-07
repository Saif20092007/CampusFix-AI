import { GoogleGenAI } from '@google/genai';
import { loadDatabase, saveDatabase, AiAnalysis } from './db.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_TIMEOUT_SECONDS = parseInt(process.env.GEMINI_TIMEOUT_SECONDS || '10', 10);

interface GeminiAnalysisResult {
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  summary: string;
  location: string;
  keywords: string[];
}

// Deterministic keyword fallback per specification
export function performKeywordFallback(description: string, optionalLocation?: string): GeminiAnalysisResult {
  const lower = description.toLowerCase();
  let category = 'Other';
  let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';

  if (lower.includes('light') || lower.includes('bulb') || lower.includes('electricity') || lower.includes('power') || lower.includes('shock') || lower.includes('wire') || lower.includes('fuse')) {
    category = 'Electrical';
    if (lower.includes('spark') || lower.includes('hazard') || lower.includes('fire') || lower.includes('pitch black') || lower.includes('tripped') || lower.includes('shock')) {
      priority = 'High';
    }
  } else if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet') || lower.includes('network') || lower.includes('computer') || lower.includes('projector') || lower.includes('server') || lower.includes('lab')) {
    category = 'IT Services';
    if (lower.includes('exam') || lower.includes('test') || lower.includes('critical') || lower.includes('lecture')) {
      priority = 'High';
    }
  } else if (lower.includes('water') || lower.includes('leak') || lower.includes('leakage') || lower.includes('tap') || lower.includes('drain') || lower.includes('pipe') || lower.includes('washroom') || lower.includes('toilet') || lower.includes('pump')) {
    category = 'Water / Civil';
    if (lower.includes('flood') || lower.includes('overflow') || lower.includes('slip') || lower.includes('failure') || lower.includes('burst') || lower.includes('broken')) {
      priority = 'High';
    }
  } else if (lower.includes('hostel') || lower.includes('room') || lower.includes('bed') || lower.includes('mess') || lower.includes('warden') || lower.includes('accommodation')) {
    category = 'Hostel';
    priority = 'Medium';
  } else if (lower.includes('guard') || lower.includes('theft') || lower.includes('gate') || lower.includes('security') || lower.includes('stranger')) {
    category = 'Security';
    priority = 'High';
  } else if (lower.includes('bus') || lower.includes('van') || lower.includes('transport') || lower.includes('parking')) {
    category = 'Transport';
    priority = 'Medium';
  }

  // Extract detected keywords
  const keywords: string[] = [];
  const candidateKeywords = [
    'light', 'bulb', 'electricity', 'power', 'hazard', 'wiring', 'tripped', 'corridor',
    'wifi', 'internet', 'lab', 'computer', 'server', 'network',
    'water', 'leakage', 'washroom', 'pump', 'overflow', 'plumbing',
    'hostel', 'room', 'canteen', 'library', 'safety'
  ];
  for (const kw of candidateKeywords) {
    if (lower.includes(kw)) {
      keywords.push(kw);
    }
  }
  if (keywords.length === 0) keywords.push('general-issue');

  // Summary generation
  let summary = description.slice(0, 75).trim();
  if (description.length > 75) summary += '...';

  // Location inference
  let location = optionalLocation?.trim() || '';
  if (!location) {
    const locMatches = description.match(/(hostel\s+[a-z0-9]|block\s+[a-z0-9]|lab\s+[0-9]+|room\s+[0-9]+|canteen|library|seminar hall)/i);
    if (locMatches) {
      location = locMatches[0];
    } else {
      location = 'Campus General';
    }
  }

  return {
    category,
    priority,
    summary,
    location,
    keywords: keywords.slice(0, 5),
  };
}

export async function analyzeWithGemini(description: string, optionalLocation?: string): Promise<{ result: GeminiAnalysisResult; rawJson: string; fallbackUsed: boolean; model: string }> {
  // If no API key is available or testing mode, use fallback immediately
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
    const fallback = performKeywordFallback(description, optionalLocation);
    return {
      result: fallback,
      rawJson: JSON.stringify(fallback),
      fallbackUsed: true,
      model: 'deterministic-fallback',
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are the AI triage assistant for CampusFix AI college campus facilities.
Analyze the following student campus complaint description and return a JSON object with strictly these fields:
- "category": One of "Electrical", "IT Services", "Water / Civil", "Hostel", "Classroom / Facilities", "Cleanliness", "Security", "Transport", "Other"
- "priority": One of "Critical", "High", "Medium", "Low" (Use "Critical" only for active safety danger, fire hazard, or main facility outage; "High" for urgent electrical/water/sanitation problems; "Medium" for normal repairs; "Low" for aesthetic/minor requests)
- "summary": A concise title (10 to 15 words) describing the issue clearly
- "location": Campus location identified in the text (or "${optionalLocation || 'Campus Premise'}")
- "keywords": An array of 3 to 6 lowercase keywords related to the issue

Do NOT include any text outside the JSON. Return only valid JSON.

Student complaint:
"${description.slice(0, 1000)}"`;

    // Wrap with timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout')), GEMINI_TIMEOUT_SECONDS * 1000);
    });

    const callPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const text = response.text || '';
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Validate structure
    const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
    const priority = validPriorities.includes(parsed.priority) ? parsed.priority : 'Medium';
    const category = typeof parsed.category === 'string' && parsed.category ? parsed.category : 'Other';
    const summary = typeof parsed.summary === 'string' && parsed.summary ? parsed.summary : description.slice(0, 60);
    const location = typeof parsed.location === 'string' && parsed.location ? parsed.location : (optionalLocation || 'Campus Premise');
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map((k: unknown) => String(k).toLowerCase()) : ['campus'];

    return {
      result: {
        category,
        priority: priority as any,
        summary,
        location,
        keywords,
      },
      rawJson: cleanJson,
      fallbackUsed: false,
      model: GEMINI_MODEL,
    };
  } catch (err) {
    console.warn('Gemini analysis failed or timed out, executing deterministic fallback:', err);
    const fallback = performKeywordFallback(description, optionalLocation);
    return {
      result: fallback,
      rawJson: JSON.stringify(fallback),
      fallbackUsed: true,
      model: 'deterministic-fallback',
    };
  }
}

export function saveAiAnalysis(userId: number, data: { result: GeminiAnalysisResult; rawJson: string; fallbackUsed: boolean; model: string; categoryId: number }): AiAnalysis {
  const db = loadDatabase();
  const id = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const record: AiAnalysis = {
    id,
    user_id: userId,
    grievance_id: null,
    raw_json: data.rawJson,
    model: data.model,
    fallback_used: data.fallbackUsed,
    category: data.result.category,
    category_id: data.categoryId,
    priority: data.result.priority,
    summary: data.result.summary,
    location: data.result.location,
    keywords: data.result.keywords,
    created_at: new Date().toISOString(),
  };

  db.ai_analyses.push(record);
  saveDatabase();
  return record;
}

export interface GrievanceSummaryResponse {
  executiveSummary: string;
  currentStatus: string;
  timelineHighlights: string[];
  recommendedAction: string;
  model: string;
  generatedAt: string;
}

export async function summarizeGrievanceHistoryWithGemini(data: {
  display_no: string;
  summary: string;
  description: string;
  category: string;
  department: string;
  priority: string;
  status: string;
  location?: string;
  student_name?: string;
  sla_status?: string;
  sla_label?: string;
  due_at?: string;
  timeline: Array<{
    status?: string | null;
    kind?: string;
    note: string;
    actor_name: string;
    actor_role: string;
    created_at: string;
  }>;
}): Promise<GrievanceSummaryResponse> {
  const nowIso = new Date().toISOString();

  // Helper for deterministic fallback
  const fallbackSummary = (): GrievanceSummaryResponse => {
    const highlights = (data.timeline || []).map((t) => {
      const timeStr = new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const action = t.kind === 'INTERNAL_REMARK' ? 'Staff remark' : t.status || t.kind || 'Updated';
      return `${timeStr} - ${action} by ${t.actor_name}: "${t.note.slice(0, 80)}"`;
    });

    if (highlights.length === 0) {
      highlights.push(`Ticket logged as ${data.priority} priority in ${data.department}.`);
    }

    let recommended = 'Monitor ticket resolution within standard department timeframe.';
    if (data.status === 'ESCALATED') {
      recommended = 'Review department escalation rationale and evaluate inter-department reassignment or central intervention.';
    } else if (data.status === 'RESOLVED') {
      recommended = 'Grievance resolved and closed. No further central intervention needed.';
    } else if (data.sla_status === 'OVERDUE') {
      recommended = 'SLA turnaround breached. Urgently contact department head for expediting resolution.';
    }

    return {
      executiveSummary: `${data.display_no} reported by ${data.student_name || 'Student'} regarding ${data.category} at ${data.location || 'campus'}. Issue: ${data.summary}.`,
      currentStatus: `Currently ${data.status} under ${data.department}. Turnaround SLA: ${data.sla_label || 'in progress'}.`,
      timelineHighlights: highlights.slice(0, 4),
      recommendedAction: recommended,
      model: 'deterministic-fallback',
      generatedAt: nowIso,
    };
  };

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
    return fallbackSummary();
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const timelineText = (data.timeline || [])
      .map(
        (t, i) =>
          `${i + 1}. [${t.created_at}] [${t.status || t.kind}] Actor: ${t.actor_name} (${t.actor_role}): "${t.note}"`
      )
      .join('\n');

    const prompt = `You are the CampusFix AI institutional triage assistant for the College Grievance Cell.
Generate a concise, professional synopsis of the following grievance history and operational status for central cell staff.

Grievance Details:
- Ticket: ${data.display_no}
- Category: ${data.category}
- Priority: ${data.priority}
- Current Status: ${data.status}
- Department: ${data.department}
- Location: ${data.location || 'Campus Premise'}
- Student: ${data.student_name || 'Student'}
- SLA Window: ${data.sla_label || 'Active'} (SLA Status: ${data.sla_status || 'normal'})
- Issue Description: ${data.description}

Timeline & Audit Trail:
${timelineText || 'No timeline entries recorded yet.'}

Return a valid JSON object strictly with these fields:
- "executiveSummary": A crisp 2-sentence synopsis explaining the core complaint, location, and severity.
- "currentStatus": 1-2 sentences on the current operational state, department ownership, and SLA urgency.
- "timelineHighlights": An array of 2 to 4 concise strings summarizing the key sequence of events (e.g. lodging, assignment, escalations, delays).
- "recommendedAction": A clear, pragmatic recommendation for Grievance Cell staff on next operational steps.

Do NOT include any markdown code fences or explanatory text outside the JSON. Return only the JSON object.`;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout')), GEMINI_TIMEOUT_SECONDS * 1000);
    });

    const callPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const text = response.text || '';
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      executiveSummary: parsed.executiveSummary || `${data.display_no}: ${data.summary}`,
      currentStatus: parsed.currentStatus || `Status is ${data.status} with ${data.department}.`,
      timelineHighlights: Array.isArray(parsed.timelineHighlights) ? parsed.timelineHighlights : [data.summary],
      recommendedAction: parsed.recommendedAction || 'Continue tracking department resolution.',
      model: GEMINI_MODEL,
      generatedAt: nowIso,
    };
  } catch (err) {
    console.warn('Gemini grievance summary failed, falling back:', err);
    return fallbackSummary();
  }
}
