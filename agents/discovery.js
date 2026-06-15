const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Senior Product Manager specialized in product discovery.

Your ONLY job is to deeply understand a product idea and extract:
- Users
- User roles
- Problems
- Needs
- Jobs-to-be-done
- Business goals
- Assumptions

RULES:
- Do NOT design systems
- Do NOT mention architecture, APIs, or technical implementation
- Focus only on understanding the problem space
- Make your best guess on any ambiguous aspects — do not ask clarifying questions

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
  "users": [],
  "user_roles": [],
  "problems": [],
  "needs": [],
  "jobs_to_be_done": [],
  "business_goals": [],
  "assumptions": []
}`;

const EMPTY_SCHEMA = {
  users: [],
  user_roles: [],
  problems: [],
  needs: [],
  jobs_to_be_done: [],
  business_goals: [],
  assumptions: [],
};

async function runDiscoveryAgent(productIdea) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: productIdea }],
  });

  const rawText = response.content[0].text;

  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error('Discovery Agent: Failed to parse JSON response', e2.message);
      return EMPTY_SCHEMA;
    }
  }
}

module.exports = { runDiscoveryAgent };