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

  // Agent 4 — Documentation
  console.log('[Orchestrator] Running Agent 4: Documentation...');
  const agent4Output = await runDocumentationAgent(mergedForAgent4);
  console.log('[Orchestrator] Agent 4 complete.');

  // Final blueprint — new schema
  const finalBlueprint = {
    // From Agent 1
    users: agent1Output.users || [],
    business_goals: agent1Output.business_goals || [],
    jobs_to_be_done: agent1Output.jobs_to_be_done || [],
    features: agent1Output.features || [],

    // From Agent 2
    workflows: agent2Output.workflows || [],
    domain_entities: agent2Output.domain_entities || [],
    relationships: agent2Output.relationships || [],
    business_rules: agent2Output.business_rules || [],

    // From Agent 3
    services: agent3Output.services || [],
    integrations: agent3Output.integrations || [],
    system_boundaries: agent3Output.system_boundaries || [],
    data_layer: agent3Output.data_layer || {},

    // From Agent 4
    prd_summary: agent4Output.prd_summary || '',
    system_explanation: agent4Output.system_explanation || '',
    feature_breakdown: agent4Output.feature_breakdown || [],
    system_flow: agent4Output.system_flow || [],
    architecture_diagram_mermaid: agent4Output.architecture_diagram_mermaid || '',
  };

  console.log('[Orchestrator] Pipeline complete. Blueprint ready.');
  return finalBlueprint;
}

module.exports = { runPipeline };