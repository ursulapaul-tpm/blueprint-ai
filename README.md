# blueprint-ai

# Blueprint AI

A multi-agent AI pipeline that takes a product idea and generates a full product blueprint — including users, workflows, domain entities, system architecture, APIs, and a PRD — in a single API call.

## How it works

Your product idea passes through 4 sequential AI agents:

1. **Discovery Agent** — extracts users, problems, jobs-to-be-done, and business goals
2. **Workflow + Domain Agent** — maps user journeys, domain entities, and business rules
3. **Architecture Agent** — designs system modules, services, APIs, and integrations
4. **Documentation Agent** — produces a PRD, feature breakdown, system explanation, and Mermaid architecture diagram

---

## Setup

```bash
git clone <your-repo-url>
cd blueprint-ai
npm install
cp .env.example .env
```

Open `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

Get your API key from [console.anthropic.com](https://console.anthropic.com).

---

## Run

```bash
npm start
```

Server starts on `http://localhost:3000`.

---

## Health check

```bash
curl http://localhost:3000/health
```

Response:
```json
{ "status": "ok" }
```

---

## Generate a blueprint

```bash
curl -X POST http://localhost:3000/api/blueprint \
  -H "Content-Type: application/json" \
  -d '{"productIdea": "A task management app for remote teams with real-time collaboration and async standups"}'
```

> **Note:** Each request runs 4 sequential AI agent calls and may take 30–90 seconds. Do not cancel early.

---

## Example response shape

```json
{
  "users": ["Remote team members", "Team leads", "Managers"],
  "user_roles": ["Task assignee", "Project manager", "Observer"],
  "jobs_to_be_done": ["Track task progress without constant meetings"],
  "business_goals": ["Reduce meeting overhead", "Improve async collaboration"],
  "workflows": ["User creates task → assigns to team member → sets deadline → notifies assignee"],
  "user_journeys": ["..."],
  "domain_entities": ["Task", "User", "Project", "Standup", "Comment"],
  "relationships": ["User has many Tasks", "Project has many Tasks"],
  "business_rules": ["A task must have an assignee before it can be marked in-progress"],
  "modules": ["Task Service", "Notification Service", "Auth Service", "Standup Service"],
  "services": ["..."],
  "apis": ["POST /tasks", "GET /tasks/:id", "PATCH /tasks/:id", "POST /standups"],
  "data_models": ["..."],
  "integrations": ["Slack", "Google Calendar"],
  "system_boundaries": ["..."],
  "prd_summary": "Blueprint AI is a task management platform designed for remote teams...",
  "feature_breakdown": ["Task creation and assignment", "Async standup submissions", "Real-time notifications"],
  "architecture_diagram_mermaid": "graph TD\n  Client[Client App]\n  API[API Gateway]\n  TaskSvc[Task Service]\n  DB[(Database)]\n  Client --> API\n  API --> TaskSvc\n  TaskSvc --> DB",
  "system_explanation": "The system is composed of four core services..."
}
```

---

## Project structure

```
blueprint-ai/
├── server.js               — Express app entry point
├── orchestrator.js         — Runs agents sequentially, merges output
├── agents/
│   ├── discovery.js        — Agent 1: Product discovery
│   ├── workflowDomain.js   — Agent 2: Workflows and domain modeling
│   ├── architecture.js     — Agent 3: System architecture
│   └── documentation.js    — Agent 4: PRD and diagram generation
├── .env.example
├── package.json
└── README.md
```