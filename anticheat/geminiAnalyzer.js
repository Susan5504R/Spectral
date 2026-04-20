const { GoogleGenerativeAI } = require('@google/generative-ai');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_for_tests');
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

function buildPrompt(code1, code2, lang, score) {
    return `
You are a plagiarism detection system for a competitive programming judge.
Analyze these two ${lang} submissions. They have a structural similarity score of ${(score*100).toFixed(1)}%.

Submission A:
\`\`\`${lang}
${code1}
\`\`\`

Submission B:
\`\`\`${lang}
${code2}
\`\`\`

Respond ONLY with a JSON object (no markdown, no explanation outside JSON):
{
  "confidence": <float 0.0-1.0, probability these are copies>,
  "verdict": "<clean|suspicious|plagiarized>",
  "reasoning": "<2-3 sentence explanation>",
  "evidence": ["<specific line or pattern that suggests copying>"]
}

CRITICAL: Distinguish between "Algorithmic Necessity" and "Unique Implementation Choice". 
- If both solve the same problem using a standard algorithm (e.g., Dijkstra, BFS, Sieve), structural similarity is EXPECTED. 
- Look for "fingerprints" of copying: same unusual variable names, identical comments, same idiosyncratic formatting, same non-standard logic tweaks, or same specific bugs.
- If the logic is standard but the implementation style (e.g., helper functions, naming, class vs function) is different, mark as "clean" or "suspicious" with low confidence.
`;
}

async function analyze(code1, code2, lang, jaccardScore, maxRetries = 5) {
    if (!process.env.GEMINI_API_KEY) {
        return { confidence: 0, verdict: 'error', reasoning: 'Missing GEMINI_API_KEY', evidence: [] };
    }
    const prompt = buildPrompt(code1, code2, lang, jaccardScore);
    // Discovered available models: gemini-flash-latest, gemini-2.0-flash, gemini-2.0-flash-lite
    const models = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const modelName = models[attempt % models.length];
        const currentModel = genai.getGenerativeModel({ model: modelName });
        
        try {
            const result = await currentModel.generateContent(prompt);
            let text = result.response.text();
            text = text.replace(/^```json\s*/mg, '').replace(/```\s*$/mg, '').trim();
            return JSON.parse(text);
        } catch (e) {
            const is429 = e.message && (e.message.includes('429') || e.message.includes('Quota'));
            if (is429 && attempt < maxRetries) {
                const wait = [5000, 15000, 30000, 45000, 60000][attempt] || 60000;
                console.log(`[GEMINI] ${modelName} rate limited, retrying with ${models[(attempt+1)%models.length]} in ${wait/1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            console.error(`Gemini analyze failed for ${modelName}:`, e.message);
            if (attempt === maxRetries) {
                 return { confidence: 0, verdict: 'error', reasoning: 'AI failed after all retries', evidence: [] };
            }
        }
    }
}

module.exports = { analyze, buildPrompt };
