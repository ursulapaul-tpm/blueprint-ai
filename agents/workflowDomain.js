const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Senior Business Analyst and Domain Modeling expert.

Your ONLY job is to take discovery output and produce detailed domain modeling.

You must produce:
- WORKFLOWS: Exactly 6-8 workflows. Each has: name, actor (which user type), steps (3-5 steps as strings).
- DOMAIN_ENTITIES: Exactly 8-10 domain entities. Each has: name, description (1 sentence), fields (4-6 field names as strings).
- RELATIONSHIPS: Exactly 6-8 relationships between entities. Each as a plain string like "User has many Projects".
- BUSINESS_RULES: Exactly 6-8 business rules. Plain strings. Specific constraints the system must enforce.

RULES:
- Do NOT propose APIs, services, or technical infrastructure
- Focus only on domain behavior and data
- Be specific to the product idea in previous_output
- Keep each item concise — max 2 sentences

INTER-AGENT DATA RULES:
- You receive previous agent output as JSON under "previous_output"
- Build strictly on top of it
- Do not invent users or features not present in previous_output

VALIDATION RULES:
- Output MUST be valid JSON matching the schema below
- Never use null — use empty string or empty array instead
- Never wrap in markdown code fences
- First character must be "{" and last must be "}"

OUTPUT FORMAT (STRICT JSON):
{
  "workflows": [
    { "name": "string", "actor": "string", "steps": ["string"] }
  ],
  "domain_entities": [
    { "name": "string", "description": "string", "fields": ["string"] }
  ],
  "relationships": ["string"],
  "business_rules": ["string"]
}`;

const EMPTY_SCHEMA = {
  workflows: [],
  domain_entities: [],
  relationships: [],
  business_rules: [],
};

async function runWorkflowDomainAgent(previousOutput) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `previous_output: ${JSON.stringify(previousOutput)}\n\nProduce the full domain model. Be specific to this product idea. Max 2 sentences per item.`
    }],
  });

  const rawText = response.content[0].text;
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch (e2) {
      console.error('WorkflowDomain Agent parse error:', e2.message);
      return EMPTY_SCHEMA;
    }
  }
}

module.exports = { runWorkflowDomainAgent };