import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(request: Request) {
  try {
    const { message, context } = await request.json();
    
    const systemPrompt = `You are an expert conversation analyzer for a GitHub repository Q&A system.
Your task is to analyze the user's message and extract:
1. Repository information (owner and repo name)
2. Any file references
3. The user's intent
4. Whether this requires repository indexing

Consider these examples:
- "What does John's awesome-project do?" → {"repository": {"owner": "john", "repo": "awesome-project", "confidence": 0.9}, "intent": "explain", "requiresIndexing": true}
- "Show me the main function" → {"repository": null, "fileReferences": ["main"], "intent": "browse", "requiresIndexing": false}
- "What's in the utils folder?" → {"repository": null, "fileReferences": ["utils/"], "intent": "browse", "requiresIndexing": false}
- "Can you explain the code in app.tsx?" → {"repository": null, "fileReferences": ["app.tsx"], "intent": "explain", "requiresIndexing": false}

Previous conversation context:
${context}

Output ONLY valid JSON matching this type:
{
  "repository": {"owner": string, "repo": string, "confidence": number} | null,
  "fileReferences": string[],
  "intent": "question" | "browse" | "analyze" | "explain",
  "requiresIndexing": boolean
}`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis generated');
    }

    // Try to parse the response as JSON
    try {
      const analysis = JSON.parse(analysisText);
      
      // Validate the analysis structure
      if (!isValidAnalysis(analysis)) {
        throw new Error('Invalid analysis structure');
      }
      
      return NextResponse.json({ analysis });
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return NextResponse.json({ 
        analysis: {
          repository: null,
          fileReferences: [],
          intent: "question",
          requiresIndexing: false
        }
      });
    }
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json({ error: 'Failed to analyze message' }, { status: 500 });
  }
}

function isValidAnalysis(analysis: any): boolean {
  return (
    analysis &&
    (analysis.repository === null || 
      (typeof analysis.repository === 'object' &&
       typeof analysis.repository.owner === 'string' &&
       typeof analysis.repository.repo === 'string' &&
       typeof analysis.repository.confidence === 'number')) &&
    Array.isArray(analysis.fileReferences) &&
    typeof analysis.intent === 'string' &&
    ['question', 'browse', 'analyze', 'explain'].includes(analysis.intent) &&
    typeof analysis.requiresIndexing === 'boolean'
  );
} 