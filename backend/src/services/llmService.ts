import OpenAI from 'openai';
import { env } from '../config/env';

const isGroq = env.OPENAI_API_KEY?.startsWith('gsk_');
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  ...(isGroq && { baseURL: 'https://api.groq.com/openai/v1' }),
});

const PRE_VISIT_PROMPT = `Analyse these symptoms and return a JSON object (no markdown, no code fences, pure JSON only) with:
- urgencyLevel: "Low" | "Medium" | "High"
- chiefComplaint: string (main issue identified)
- suggestedQuestions: string[] (three questions for the doctor)

Symptoms: {symptoms}
Patient age: {age}
Existing conditions: {conditions}`;

const POST_VISIT_PROMPT = `Convert these clinical notes into a patient-friendly summary. Return a JSON object (no markdown, no code fences, pure JSON only) with:
- summary: string (easy to understand visit summary)
- diagnosis: string
- medicationSchedule: array of { name: string, dosage: string, frequency: string, duration: string, instructions: string }
- followUpSteps: string[]
- whenToSeekHelp: string

Clinical Notes: {notes}
Prescriptions: {prescriptions}`;

async function callLLM(prompt: string): Promise<string | null> {
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.startsWith('sk-your')) {
    return null;
  }
  try {
    const response = await openai.chat.completions.create({
      model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });
    const content = response.choices[0]?.message?.content;
    return content || null;
  } catch (error) {
    console.error('LLM call failed:', error);
    return null;
  }
}

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

export async function generatePreVisitSummary(symptoms: string, age?: string, conditions?: string): Promise<Record<string, unknown> | null> {
  const prompt = PRE_VISIT_PROMPT
    .replace('{symptoms}', symptoms)
    .replace('{age}', age || 'Not provided')
    .replace('{conditions}', conditions || 'None reported');

  const result = await callLLM(prompt);
  if (!result) return null;

  const parsed = extractJSON(result);
  if (!parsed) return null;

  return parsed;
}

export async function generatePostVisitSummary(notes: string, prescriptions?: string): Promise<Record<string, unknown> | null> {
  const prompt = POST_VISIT_PROMPT
    .replace('{notes}', notes)
    .replace('{prescriptions}', prescriptions || 'None');

  const result = await callLLM(prompt);
  if (!result) return null;

  const parsed = extractJSON(result);
  if (!parsed) return null;

  return parsed;
}
