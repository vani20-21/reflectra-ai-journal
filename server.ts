import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Reusable lazy initialization of Google GenAI SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing or empty.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',       // Primary requested model
  'gemini-3.1-flash-lite',   // High-availability fallback
  'gemini-flash-latest',     // Dynamic alias fallback
  'gemini-3.7-flash',        // Deep reasoning fallback
];

interface FallbackOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}

/**
 * Standard Helper: generateContentWithFallback
 * Cycles through the model fallback ladder if recoverable errors occur.
 */
async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      const text = response.text ?? '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code;
      const message = String(err?.message || '');
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        message.includes('UNAVAILABLE') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('not found') ||
        message.includes('overloaded');

      console.warn(`[Gemini Fallback] Model ${model} failed (status: ${status}): ${message}. Attempting fallback...`);

      if (!isRecoverable) {
        // If it's an unrecoverable error like bad request or auth issue, stop immediately
        throw err;
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || lastError}`);
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    geminiConfigured: hasKey,
    primaryModel: 'gemini-3.6-flash',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/gemini/reflect
 * Multi-turn journal reflection, brainstorming, or analysis
 */
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const history = Array.isArray(body.history) ? body.history : [];
    const entryTitle = typeof body.title === 'string' ? body.title : 'Journal Reflection';

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt cannot be empty.' });
    }

    let systemInstruction = `You are an empathetic, insightful, and supportive AI Journal Companion and Reflection Guide.
Your purpose is to help the user reflect deeply on their thoughts, feelings, goals, and experiences.
Maintain a warm, compassionate, non-judgmental, and constructive tone.
Never give medical or psychiatric diagnoses. If the user is expressing distress, offer gentle perspective and encouragement.
Keep your response formatted in clean markdown with concise paragraphs and occasional thoughtful bullet points.`;

    if (mode === 'summarize') {
      systemInstruction += `\nThe user is requesting a summary of their journal entry. Provide a 2-3 paragraph synthesis, followed by 3 key themes/learnings.`;
    } else if (mode === 'brainstorm') {
      systemInstruction += `\nThe user is asking for brainstorming or creative next steps. Provide positive, actionable perspectives and 3-5 creative ideas or thought exercises.`;
    } else {
      systemInstruction += `\nEngage deeply with the user's reflection. Validate their thoughts, highlight patterns or strengths, and propose 1-2 open-ended reflection prompts to help them ponder further.`;
    }

    // Build multi-turn contents format
    const contents: any[] = [];

    // Include context of prior turns
    for (const item of history) {
      if (item && typeof item.content === 'string') {
        const role = item.role === 'user' ? 'user' : 'model';
        contents.push({
          role,
          parts: [{ text: item.content }],
        });
      }
    }

    // Append latest prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7,
    });

    return res.json({
      text: result.text,
      modelUsed: result.modelUsed,
      mode,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate reflection response.',
    });
  }
});

/**
 * POST /api/gemini/summarize
 * Generates an automatic title, summary, and sentiment/tags for a journal entry
 */
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return res.status(400).json({ error: 'Text cannot be empty.' });
    }

    const prompt = `Analyze the following user journal entry:
---
${text.slice(0, 8000)}
---

Respond strictly with a JSON object in this exact structure:
{
  "suggestedTitle": "A short, evocative 3 to 6 word title",
  "summary": "A 1-2 sentence executive summary of the entry",
  "tags": ["tag1", "tag2", "tag3"],
  "reflectionQuestion": "One thought-provoking question for tomorrow"
}
Do NOT include markdown formatting fences around the JSON. Only return pure JSON.`;

    const result = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: 'You are an expert personal reflection synthesizer. Always output valid JSON without markdown wrapping.',
      temperature: 0.3,
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        suggestedTitle: 'Daily Reflection',
        summary: text.slice(0, 120) + '...',
        tags: ['Reflection', 'Journal'],
        reflectionQuestion: 'How can you apply what you learned today moving forward?',
      };
    }

    return res.json({
      ...parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to summarize journal entry.',
    });
  }
});

/**
 * POST /api/gemini/action-insights
 * Feature: "Reflection → Action"
 * Analyzes the entire journal conversation to generate:
 * 1. MAIN THEME
 * 2. KEY INSIGHT
 * 3. NEXT ACTION (supportive, practical, non-professional advice)
 * 4. REFLECTION QUESTION
 */
app.post('/api/gemini/action-insights', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const turnsCount = typeof body.turnsCount === 'number' ? body.turnsCount : 1;

    if (!text || text.length < 20 || turnsCount === 0) {
      return res.status(400).json({
        error: 'Please share a bit more reflection in your journal conversation before generating Action Insights.',
      });
    }

    const systemInstruction = `You are an empathetic personal development companion and reflective synthesizer.
Your task is to transform a personal journal conversation into actionable, grounded personal insights.
You must adhere strictly to these principles:
- The NEXT ACTION must be small, practical, realistic, supportive, and achievable.
- It must NEVER present itself as medical, psychiatric, psychological, legal, or professional diagnosis/advice.
- The tone must be constructive, kind, and encouraging.
- Output strictly a JSON object with the requested keys without any markdown code fences.`;

    const prompt = `Analyze the following complete journal conversation between the user and AI companion:
---
${text.slice(0, 10000)}
---

Generate exactly four structured components based on this reflection:
1. "mainTheme": A concise phrase (3-7 words) capturing the central topic, emotional theme, or primary focus.
2. "keyInsight": The single most meaningful realization, recurring pattern, or core learning from the conversation (1-2 clear sentences).
3. "nextAction": Exactly one small, practical, realistic, and achievable action the user can undertake next (1-2 supportive sentences).
4. "reflectionQuestion": One thoughtful, open-ended question the user can revisit later for deeper reflection (1 sentence).

Respond strictly with a JSON object in this exact schema:
{
  "mainTheme": "Central topic phrase",
  "keyInsight": "Primary pattern or realization",
  "nextAction": "One small, achievable, supportive next step",
  "reflectionQuestion": "One open-ended question for deeper reflection"
}
Do NOT include any markdown code blocks or surrounding text. Only return valid JSON.`;

    const result = await generateContentWithFallback({
      contents: prompt,
      systemInstruction,
      temperature: 0.4,
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        mainTheme: 'Self-Awareness & Daily Growth',
        keyInsight: 'Articulating your thoughts helps clarify your priorities and emotional landscape.',
        nextAction: 'Take 5 minutes today to write down one priority you want to nurture.',
        reflectionQuestion: 'What small step can you take today that aligns with what you discovered?',
      };
    }

    // Ensure all 4 required fields exist with fallbacks
    const actionInsights = {
      mainTheme: typeof parsed.mainTheme === 'string' && parsed.mainTheme.trim() ? parsed.mainTheme.trim() : 'Personal Clarity & Balance',
      keyInsight: typeof parsed.keyInsight === 'string' && parsed.keyInsight.trim() ? parsed.keyInsight.trim() : 'Reflecting openly brings subconscious priorities to the forefront.',
      nextAction: typeof parsed.nextAction === 'string' && parsed.nextAction.trim() ? parsed.nextAction.trim() : 'Take a short pause today to appreciate what you learned about yourself.',
      reflectionQuestion: typeof parsed.reflectionQuestion === 'string' && parsed.reflectionQuestion.trim() ? parsed.reflectionQuestion.trim() : 'How can you apply this perspective to tomorrow?',
      generatedAt: new Date().toISOString(),
      modelUsed: result.modelUsed,
    };

    return res.json(actionInsights);
  } catch (error: any) {
    console.error('Error in /api/gemini/action-insights:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate action insights.',
    });
  }
});

// Vite middleware in development vs static serving in production
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Journal & Reflections server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Critical failure during server startup:', error);
    process.exit(1);
  }
}

startServer();
