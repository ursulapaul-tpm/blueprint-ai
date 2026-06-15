# Blueprint AI — Full Specification for GitHub Copilot

This is the single source of truth for building Blueprint AI. It contains all agent system prompts,
operational rules, pipeline logic, and Copilot build instructions. All fixes have been applied.

---

## SECTION 1 — Agent System Prompts

---

### Agent 1 — Discovery Agent

**System Prompt:**

```
You are a Senior Product Manager specialized in product discovery.

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
- Never wrap output in markdown code fences (no ```json).
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
}
```

---

### Agent 2 — Workflow + Domain Agent

**System Prompt:**

```
You are a Senior Business Analyst and Domain Modeling expert.

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
- Never wrap output in markdown code fences (no ```json).
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
}
```

---

### Agent 3 — Architecture Agent

**System Prompt:**

```
You are a Senior Solution Architect.

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
- Never wrap output in markdown code fences (no ```json).
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
}
```

---

### Agent 4 — Documentation + Visualization Agent

**System Prompt:**

```
You are a Technical Product Writer and System Visualization expert.

Your job is to take ALL previous agent outputs (discovery, domain/workflow, and architecture) and
convert them into:
- Product Requirements Document (PRD)
- System explanation
- Architecture diagram (Mermaid format)
- Feature breakdown

RULES:
- Do NOT introduce new logic, users, entities, or features
- Only summarize and structure the information already present in previous_output
- Ensure clarity for both technical and non-technical stakeholders

INTER-AGENT DATA RULES:
You will receive a merged JSON object under the key "previous_output" that contains the combined
outputs of ALL previous agents (Agent 1, Agent 2, and Agent 3).
This is your ONLY source of truth.
- Do NOT invent anything not present in previous_output.
- Reference users, workflows, entities, modules, and APIs from previous_output when writing the PRD.

MERMAID DIAGRAM RULES:
- The "architecture_diagram_mermaid" value must be a single valid string using "\n" for line breaks.
- Use "graph TD" or "flowchart TD" syntax only.
- Node IDs must contain only letters, numbers, and underscores (no spaces or special characters).
- Display labels with spaces/special characters must be wrapped in square brackets, e.g. NodeID[Display Label].
- External services must be represented as NodeID[(Display Label)] (cylinder/database shape).
- Validate that every edge references a defined node ID before finalizing.

VALIDATION RULES:
- Your output MUST be valid JSON matching the exact schema below.
- If you cannot populate a field, return an empty array [] or empty string "" — never null, never omit the key.
- If your first attempt would not be valid JSON, silently correct it before responding.
- Never wrap output in markdown code fences (no ```json).
- Never include explanations, comments, or text outside the JSON object.

OUTPUT CONSTRAINTS:
- Output ONLY the raw JSON object.
- No markdown code fences.
- No preamble ("Here is the output:").
- No postamble ("Let me know if...").
- The first character of your response must be "{" and the last character must be "}".

OUTPUT FORMAT (STRICT JSON):
{
  "prd_summary": "",
  "feature_breakdown": [],
  "architecture_diagram_mermaid": "",
  "system_explanation": ""
}
```

---

## SECTION 2 — Pipeline Flow

```
USER IDEA
   ↓
Agent 1 (Discovery)           → max_tokens: 2000
   ↓
Agent 2 (Domain + Workflow)   → max_tokens: 2000
   ↓
Agent 3 (Architecture)        → max_tokens: 3000
   ↓
Agent 4 (Docs + Diagram)      → max_tokens: 4000
   ↓
FINAL BLUEPRINT (merged JSON)
```

---

## SECTION 3 — Final Consolidation Schema

After all 4 agents complete, merge their outputs into this exact final JSON structure.
Do not add fields beyond this schema. Do not omit any field — use empty arrays/strings if needed.

```json
{
  "users": [],
  "user_roles": [],
  "jobs_to_be_done": [],
  "business_goals": [],
  "workflows": [],
  "user_journeys": [],
  "domain_entities": [],
  "relationships": [],
  "business_rules": [],
  "modules": [],
  "services": [],
  "apis": [],
  "data_models": [],
  "integrations": [],
  "system_boundaries": [],
  "architecture_diagram_mermaid": "",
  "prd_summary": "",
  "feature_breakdown": [],
  "system_explanation": ""
}
```

Field sources:
- `users`, `user_roles`, `jobs_to_be_done`, `business_goals` → from Agent 1
- `workflows`, `user_journeys`, `domain_entities`, `relationships`, `business_rules` → from Agent 2
- `modules`, `services`, `apis`, `data_models`, `integrations`, `system_boundaries` → from Agent 3
- `prd_summary`, `feature_breakdown`, `architecture_diagram_mermaid`, `system_explanation` → from Agent 4

---

## SECTION 4 — GitHub Copilot Build Instructions

Paste everything below this line as a single message into Copilot Chat in VS Code,
with this file (blueprint-ai-copilot-spec.md) open in your editor.

---

Build "Blueprint AI" — a Node.js + Express API implementing the multi-agent pipeline defined in
blueprint-ai-copilot-spec.md (currently open in the editor).

### TECH STACK

- Node.js with Express
- JavaScript (CommonJS, not TypeScript)
- Anthropic API via @anthropic-ai/sdk — model: "claude-sonnet-4-6"
- dotenv for API key (process.env.ANTHROPIC_API_KEY)
- cors middleware — apply globally including preflight OPTIONS requests
- No database — fully stateless, in-memory pipeline per request

### PROJECT STRUCTURE

```
blueprint-ai/
├── server.js               — Express app entry point
├── orchestrator.js         — runs agents sequentially, merges output
├── agents/
│   ├── discovery.js        — Agent 1
│   ├── workflowDomain.js   — Agent 2
│   ├── architecture.js     — Agent 3
│   └── documentation.js    — Agent 4
├── .env.example
├── package.json
└── README.md
```

### IMPLEMENTATION DETAILS

#### 1. Each agent file exports a single async function:

- `agents/discovery.js` → exports `runDiscoveryAgent(productIdea)`
- `agents/workflowDomain.js` → exports `runWorkflowDomainAgent(previousOutput)`
- `agents/architecture.js` → exports `runArchitectureAgent(previousOutput)`
- `agents/documentation.js` → exports `runDocumentationAgent(mergedOutput)`

Each function must:

a) Use the exact system prompt for that agent as written in SECTION 1 of blueprint-ai-copilot-spec.md.
   Copy it verbatim into the agent file as a const string.

b) Call the Anthropic API like this:

```js
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: <see per-agent values below>,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userMessage }]
});
```

Per-agent max_tokens values (IMPORTANT — do not use the same value for all agents):
- Agent 1 (discovery.js): max_tokens: 2000
- Agent 2 (workflowDomain.js): max_tokens: 2000
- Agent 3 (architecture.js): max_tokens: 3000
- Agent 4 (documentation.js): max_tokens: 4000

c) The user message must be formatted as:
   - Agent 1: just the raw productIdea string
   - Agents 2 and 3: `previous_output: ${JSON.stringify(previousOutput)}\n\nProcess this and produce your output.`
   - Agent 4: `previous_output: ${JSON.stringify(mergedOutput)}\n\nThis merged output contains all outputs from Agents 1, 2, and 3. Produce your documentation output.`

d) Parse the response:

```js
const rawText = response.content[0].text;
let parsed;
try {
  parsed = JSON.parse(rawText);
} catch (e) {
  // Strip markdown code fences and retry once
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  try {
    parsed = JSON.parse(cleaned);
  } catch (e2) {
    // Return empty schema for this agent on total failure
    parsed = <agent's empty schema with all fields as [] or "">;
  }
}
return parsed;
```

#### 2. orchestrator.js

Export an async function `runPipeline(productIdea)` that:

a) Calls Agent 1 with the raw productIdea string
b) Calls Agent 2 with Agent 1's output as previousOutput
c) Calls Agent 3 with Agent 2's output as previousOutput
d) Before calling Agent 4, build a merged object combining ALL three previous outputs:

```js
const mergedForAgent4 = {
  ...agent1Output,
  ...agent2Output,
  ...agent3Output
};
```

e) Calls Agent 4 with mergedForAgent4 as the input
f) Merges ALL agent outputs into the final schema from SECTION 3 of blueprint-ai-copilot-spec.md:

```js
const finalBlueprint = {
  users: agent1Output.users || [],
  user_roles: agent1Output.user_roles || [],
  jobs_to_be_done: agent1Output.jobs_to_be_done || [],
  business_goals: agent1Output.business_goals || [],
  workflows: agent2Output.workflows || [],
  user_journeys: agent2Output.user_journeys || [],
  domain_entities: agent2Output.domain_entities || [],
  relationships: agent2Output.relationships || [],
  business_rules: agent2Output.business_rules || [],
  modules: agent3Output.modules || [],
  services: agent3Output.services || [],
  apis: agent3Output.apis || [],
  data_models: agent3Output.data_models || [],
  integrations: agent3Output.integrations || [],
  system_boundaries: agent3Output.system_boundaries || [],
  prd_summary: agent4Output.prd_summary || '',
  feature_breakdown: agent4Output.feature_breakdown || [],
  architecture_diagram_mermaid: agent4Output.architecture_diagram_mermaid || '',
  system_explanation: agent4Output.system_explanation || ''
};
```

g) Returns finalBlueprint

#### 3. server.js

- Initialize Express app
- Apply `cors()` middleware globally for ALL origins — include OPTIONS preflight handling:
  ```js
  app.use(cors());
  app.options('*', cors());
  ```
- Apply `express.json()` middleware
- Load dotenv at the top: `require('dotenv').config();`

**GET /health**
Returns `{ "status": "ok" }` with status 200.

**POST /api/blueprint**
- Expects JSON body: `{ "productIdea": "string" }`
- Validation:
  - Return 400 with `{ "error": "productIdea is required and must be a non-empty string" }` if productIdea is missing, not a string, or empty after trim
  - Return 400 with `{ "error": "productIdea must not exceed 2000 characters" }` if productIdea.length > 2000
- On success: call `orchestrator.runPipeline(productIdea)`, return result with status 200
- On error: return status 500 with `{ "error": error.message }`
- Add `console.log` for each incoming request: method, path, timestamp

**Listen** on `process.env.PORT || 3000`

#### 4. .env.example

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3000
```

#### 5. package.json

Include these dependencies:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@anthropic-ai/sdk": "^0.20.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5"
  },
  "scripts": {
    "start": "node server.js"
  }
}
```

#### 6. README.md

Include exactly:

**Setup**
```bash
git clone <your-repo>
cd blueprint-ai
npm install
cp .env.example .env
# Open .env and add your Anthropic API key
```

**Run**
```bash
npm start
# Server starts on http://localhost:3000
```

**Health check**
```bash
curl http://localhost:3000/health
```

**Example request**
```bash
curl -X POST http://localhost:3000/api/blueprint \
  -H "Content-Type: application/json" \
  -d '{"productIdea": "A task management app for remote teams with real-time collaboration and async standups"}'
```

**Note:** Each request runs 4 sequential AI agent calls and may take 30–90 seconds. Do not timeout early.

**Example response shape**
```json
{
  "users": ["Remote team members", "Team leads"],
  "user_roles": ["Task assignee", "Project manager"],
  "jobs_to_be_done": ["Track task progress without constant meetings"],
  "business_goals": ["Reduce meeting overhead", "Improve async collaboration"],
  "workflows": ["..."],
  "user_journeys": ["..."],
  "domain_entities": ["Task", "User", "Project", "Standup"],
  "relationships": ["..."],
  "business_rules": ["..."],
  "modules": ["Task Service", "Notification Service", "Auth Service"],
  "services": ["..."],
  "apis": ["POST /tasks", "GET /tasks/:id", "POST /standups"],
  "data_models": ["..."],
  "integrations": ["Slack", "Google Calendar"],
  "system_boundaries": ["..."],
  "prd_summary": "Blueprint AI generates a full product blueprint...",
  "feature_breakdown": ["..."],
  "architecture_diagram_mermaid": "graph TD\n  Client[Client App]\n  ...",
  "system_explanation": "The system consists of..."
}
```

### ASSUMPTIONS — do not deviate from these

- CommonJS (require/module.exports) only — no ES modules, no TypeScript
- No authentication layer
- No database, no caching, no logging framework — console.log only
- No tests required
- No frontend — REST API only
- node-fetch is NOT needed — use @anthropic-ai/sdk exclusively for all Anthropic API calls

### GENERATE ALL FILES NOW

Generate all 8 files fully implemented with no placeholders, no TODOs, and no missing logic:
1. server.js
2. orchestrator.js
3. agents/discovery.js
4. agents/workflowDomain.js
5. agents/architecture.js
6. agents/documentation.js
7. .env.example
8. README.md
