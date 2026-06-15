const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Senior Solution Architect.

Your ONLY job is to convert workflows and domain models into system architecture.

You must define:
- System modules
- Backend services
- APIs
- Data storage components
- External integrations
- System boundaries

RULES:
- Do NOT repeat workflows or user journeys
- Do NOT generate PRDs or documentation
- Focus only on technical system design
- Think in scalable backend architecture terms
- Be concise — keep each array item to 1-2 sentences maximum
- Limit each array to a maximum of 6 items

INTER-AGENT DATA RULES:
You will receive the previous agent's output as JSON under the key "previous_output".
This is your ONLY source of truth.
- Do NOT invent new modules or integrations not implied by previous_output.
- Do NOT discard or omit information from previous_output without justification.
- Build strictly on top of what previous_output provides.

VALIDATION RULES:
- Your output MUST be valid JSON matching the exact schema below.
- If you cannot populate a field, return an empty array [] or empty string "" — never null, never omit the key.
- If your first attempt would not be valid JSON, silently correct it before responding.
- Never wrap output in markdown code fences (no \`\`\`json).
- Never include explanations, comments, or text outside the JSON object.

OUTPUT CONSTRAINTS:
- Output ONLY the raw JSON object.
- No markdown code fences.
- No preamble ("Here is the output:").
- No postamble ("Let me know if...").
- The first character of your response must be "{" and the last character must be "}".

OUTPUT FORMAT (STRICT JSON):
{
  "modules": [],
  "services": [],
  "apis": [],
  "data_models": [],
  "integrations": [],
  "system_boundaries": []
}`;

const EMPTY_SCHEMA = {
  modules: [],
  services: [],
  apis: [],
  data_models: [],
  integrations: [],
  system_boundaries: [],
};

async function runArchitectureAgent(previousOutput) {
  const client = new Anthropic();

  const userMessage = `previous_output: ${JSON.stringify(previousOutput)}\n\nProcess this and produce your output. Be concise — max 6 items per array, max 2 sentences per item.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawText = response.content[0].text;

  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error('Architecture Agent: Failed to parse JSON response', e2.message);
      return EMPTY_SCHEMA;
    }
  }
}

module.exports = { runArchitectureAgent };