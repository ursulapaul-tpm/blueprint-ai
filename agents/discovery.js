const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Senior Product Manager specialized in product discovery.

Your ONLY job is to deeply understand a product idea and extract a rich, detailed model.

You must produce:
- USERS: Exactly 6-7 user types. Each must have: name, role, description (1-2 sentences on what they do and why they use the product)
- BUSINESS_GOALS: Exactly 8-10 business goals. High-level, concise, specific to this product.
- JOBS_TO_BE_DONE: Exactly 10-12 JTBDs using the Clayton Christensen "Jobs To Be Done" framework. Each JTBD is the reason a user would HIRE this specific product to solve a specific problem in their life or work. Format: "When I [situation], I want to [motivation], so I can [outcome]." Every JTBD must be 100% specific to the product idea given — directly tied to what this product does. They must describe real human frustrations, not product features. Think: what pain is so bad the user went looking for a solution?
- FEATURES: Exactly 10-12 features. Each has: name, description (1 sentence), and which JTBD index (0-based) it maps to.

RULES:
- Every output must be 100% specific to the product idea given
- Do NOT give generic SaaS answers
- Do NOT mention technical architecture, APIs, or code
- Do NOT ask clarifying questions — make your best judgment

VALIDATION RULES:
- Output MUST be valid JSON matching the exact schema below
- Never use null — use empty string or empty array instead
- Never wrap output in markdown code fences
- No text before or after the JSON
- First character must be "{" and last must be "}"

OUTPUT FORMAT (STRICT JSON):
{
  "users": [
    { "name": "string", "role": "string", "description": "string" }
  ],
  "business_goals": ["string"],
  "jobs_to_be_done": ["string"],
  "features": [
    { "name": "string", "description": "string", "jtbd_index": 0 }
  ]
}`;

const EMPTY_SCHEMA = {
  users: [],
  business_goals: [],
  jobs_to_be_done: [],
  features: [],
};

async function runDiscoveryAgent(productIdea) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Product idea: "${productIdea}"\n\nProduce the full discovery output. Be 100% specific to this exact product idea.\n\nFor jobs_to_be_done: use the JTBD framework. Each one is why a user would HIRE this product. Format: "When I [situation], I want to [motivation], so I can [outcome]." Make them specific to "" — real human frustrations this product solves, not generic SaaS features.`
    }],
  });

  const rawText = response.content[0].text;
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch (e2) {
      console.error('Discovery Agent parse error:', e2.message);
      return EMPTY_SCHEMA;
    }
  }
}

module.exports = { runDiscoveryAgent };