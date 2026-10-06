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
