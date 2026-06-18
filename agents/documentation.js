const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Technical Product Writer.

Your job is to take all previous agent outputs and produce concise final documentation.

You must produce:
- PRD_SUMMARY: 3 sentences max. What it is, who it's for, core value.
- SYSTEM_EXPLANATION: 3 sentences max. How it works end-to-end in plain English.
- FEATURE_BREAKDOWN: Exactly 8 features. Each: feature (name), badge (Core/Admin/Premium/System), description (1 sentence), service (which service owns it).
- SYSTEM_FLOW: Exactly 5 steps. Each: step (number), from (string), to (string), action (1 sentence).
- ARCHITECTURE_DIAGRAM_MERMAID: Valid Mermaid graph TD string. Max 12 nodes. Use \\n for line breaks.

STRICT RULES:
- 1 sentence max per description field
- No bullet points inside strings
- No markdown inside JSON strings
- Never wrap output in code fences
- First character must be "{" and last must be "}"

OUTPUT FORMAT (STRICT JSON):
{
  "prd_summary": "string",
  "system_explanation": "string",
  "feature_breakdown": [
    { "feature": "string", "badge": "string", "description": "string", "service": "string" }
  ],
  "system_flow": [
    { "step": 1, "from": "string", "to": "string", "action": "string" }
  ],
  "architecture_diagram_mermaid": "string"
}`;

const EMPTY_SCHEMA = {
  prd_summary: '',
  system_explanation: '',
  feature_breakdown: [],
  system_flow: [],
  architecture_diagram_mermaid: '',
};

async function runDocumentationAgent(mergedOutput) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `previous_output: ${JSON.stringify(mergedOutput)}\n\nProduce concise documentation. Max 1 sentence per description. Max 8 features. Max 5 flow steps. Be specific to this product idea.`
    }],
  });

  const rawText = response.content[0].text;
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch (e2) { console.error('Documentation Agent parse error:', e2.message); return EMPTY_SCHEMA; }
  }
}

module.exports = { runDocumentationAgent };