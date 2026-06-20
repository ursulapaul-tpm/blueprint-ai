const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Senior Solution Architect.

Your ONLY job is to convert domain models into a detailed system architecture.

You must produce:
- SERVICES: Exactly 6-8 services. Group them as: Core Services, Business Services, or Support Services.
  Each service must have:
    - name: string
    - group: "Core Services" | "Business Services" | "Support Services"
    - description: string (1-2 sentences on what it does)
    - apis: array of 3-6 API endpoints, each with: method (GET/POST/PUT/DELETE/PATCH), route (string), purpose (string)
    - dependencies: array of other service names this depends on
    - entities: array of domain entity names this service owns or uses

- INTEGRATIONS: Exactly 3-5 external integrations. Each has: name, purpose (1 sentence), type ("payment" | "email" | "auth" | "storage" | "analytics" | "other")

- SYSTEM_BOUNDARIES: Exactly 3-5 system boundary descriptions as plain strings.

- DATA_LAYER: Object with:
    - database: string (e.g. "PostgreSQL")
    - cache: string (e.g. "Redis") or ""
    - storage: string (e.g. "AWS S3") or ""
    - description: string (1-2 sentences on data strategy)

RULES:
- Do NOT repeat workflows or PRD content
- Think in scalable backend architecture
- Be specific to the product idea in previous_output
- Max 6 items per array to stay concise

INTER-AGENT DATA RULES:
- You receive previous agent output under "previous_output"
- Build strictly on top of it
- Do not invent services not implied by the domain model

VALIDATION RULES:
- Output MUST be valid JSON matching the schema below
- Never use null — use empty string or empty array instead
- Never wrap in markdown code fences
- First character must be "{" and last must be "}"

OUTPUT FORMAT (STRICT JSON):
{
  "services": [
    {
      "name": "string",
      "group": "string",
      "description": "string",
      "apis": [
        { "method": "string", "route": "string", "purpose": "string" }
      ],
      "dependencies": ["string"],
      "entities": ["string"]
    }
  ],
  "integrations": [
    { "name": "string", "purpose": "string", "type": "string" }
  ],
  "system_boundaries": ["string"],
  "data_layer": {
    "database": "string",
    "cache": "string",
    "storage": "string",
    "description": "string"
  }
}`;

const EMPTY_SCHEMA = {
  services: [],
  integrations: [],
  system_boundaries: [],
  data_layer: { database: '', cache: '', storage: '', description: '' },
};

async function runArchitectureAgent(previousOutput) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: previousOutput.architectural_constraint
        ? `previous_output: ${JSON.stringify(previousOutput)}\n\nIMPORTANT CONSTRAINT: ${previousOutput.architectural_constraint}\n\nRe-produce the full system architecture honoring this constraint exactly. Update the database/service/pattern as specified, and adjust all dependent services, APIs, and integrations accordingly to remain consistent with this choice. Be specific to this product idea. Max 6 items per array. Max 5 APIs per service. Keep all descriptions to 1 sentence max.`
        : `previous_output: ${JSON.stringify(previousOutput)}\n\nProduce the full system architecture. Be specific to this product idea. Max 6 items per array. Max 5 APIs per service. Keep all descriptions to 1 sentence max. Be concise — do not over-explain.`
    }],
  });

  const rawText = response.content[0].text;
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch (e2) {
      console.error('Architecture Agent parse error:', e2.message);
      return EMPTY_SCHEMA;
    }
  }
}

module.exports = { runArchitectureAgent };