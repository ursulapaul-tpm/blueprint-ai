require('dotenv').config();
console.log("ENV OBJECT:", {
  key: process.env.ANTHROPIC_API_KEY,
  loaded: require('dotenv').config()
});
const { runDiscoveryAgent } = require('./agents/discovery');
const { runWorkflowDomainAgent } = require('./agents/workflowDomain');
const { runArchitectureAgent } = require('./agents/architecture');
const { runDocumentationAgent } = require('./agents/documentation');

async function runPipeline(productIdea) {
  console.log('[Orchestrator] Starting pipeline...');

  // Agent 1 — Discovery
  console.log('[Orchestrator] Running Agent 1: Discovery...');
  const agent1Output = await runDiscoveryAgent(productIdea);
  console.log('[Orchestrator] Agent 1 complete.');

  // Agent 2 — Workflow + Domain
  console.log('[Orchestrator] Running Agent 2: Workflow + Domain...');
  const agent2Output = await runWorkflowDomainAgent(agent1Output);
  console.log('[Orchestrator] Agent 2 complete.');

  // Agent 3 — Architecture
  console.log('[Orchestrator] Running Agent 3: Architecture...');
  const agent3Output = await runArchitectureAgent(agent2Output);
  console.log('[Orchestrator] Agent 3 complete.');

  // Merge all outputs for Agent 4
  const mergedForAgent4 = {
    ...agent1Output,
    ...agent2Output,
    ...agent3Output,
  };

  // Agent 4 — Documentation + Visualization
  console.log('[Orchestrator] Running Agent 4: Documentation + Visualization...');
  const agent4Output = await runDocumentationAgent(mergedForAgent4);
  console.log('[Orchestrator] Agent 4 complete.');

  // Final consolidated blueprint
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
    system_explanation: agent4Output.system_explanation || '',
  };

  console.log('[Orchestrator] Pipeline complete. Blueprint ready.');
  return finalBlueprint;
}

module.exports = { runPipeline };