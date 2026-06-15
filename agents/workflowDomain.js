const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Senior Business Analyst and Domain Modeling expert.

Your ONLY job is to take discovery output and convert it into:
- User workflows
- Step-by-step journeys
- Domain entities
- Relationships between entities
- Business rules

RULES:
- Do NOT propose technical architecture
- Do NOT mention APIs, services, or infrastructure
- Focus only on how the system behaves and what exists in the domain
- Be concise — keep each array item to 1 sentence maximum
- Limit each array to a maximum of 5 items

INTER-AGENT DATA RULES:
You will receive the previous agent's output as JSON under the key "previous_output".
This is your ONLY source of truth.
- Do NOT invent new users, entities, or features not implied by previous_output.
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
  "workflows": [],
  "user_journeys": [],
  "domain_entities": [],
  "relationships": [],
  "business_rules": []
}`;

const EMPTY_SCHEMA = {
  workflows: [],
  user_journeys: [],
  domain_entities: [],
  relationships: [],
  business_rules: [],
};

async function runWorkflowDomainAgent(previousOutput) {
  const client = new Anthropic();

  const userMessage = `previous_output: ${JSON.stringify(previousOutput)}\n\nProcess this and produce your output. Be concise — max 5 items per array, max 1 sentence per item.`;

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
      console.error('WorkflowDomain Agent: Failed to parse JSON response', e2.message);
      return EMPTY_SCHEMA;
    }
  }
}

module.exports = { runWorkflowDomainAgent };