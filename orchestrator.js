const { runDiscoveryAgent } = require('./agents/discovery');
const { runWorkflowDomainAgent } = require('./agents/workflowDomain');
const { runArchitectureAgent } = require('./agents/architecture');
const { runDocumentationAgent } = require('./agents/documentation');
const { runReasoningAgent } = require('./agents/reasoning');

async function runPipeline(productIdea) {
  console.log('[Orchestrator] Starting pipeline...');

  console.log('[Orchestrator] Running Agent 1: Discovery...');
  const agent1Output = await runDiscoveryAgent(productIdea);
  console.log('[Orchestrator] Agent 1 complete.');

  console.log('[Orchestrator] Running Agent 2: Workflow + Domain...');
  const agent2Output = await runWorkflowDomainAgent(agent1Output);
  console.log('[Orchestrator] Agent 2 complete.');

  console.log('[Orchestrator] Running Agent 3: Architecture...');
  const agent3Output = await runArchitectureAgent(agent2Output);
  console.log('[Orchestrator] Agent 3 complete.');

  const mergedForAgent4 = { ...agent1Output, ...agent2Output, ...agent3Output };

  console.log('[Orchestrator] Running Agent 4: Documentation...');
  const agent4Output = await runDocumentationAgent(mergedForAgent4);
  console.log('[Orchestrator] Agent 4 complete.');

  console.log('[Orchestrator] Running Agent 5: Architecture Reasoning...');
  const agent5Output = await runReasoningAgent(mergedForAgent4);
  console.log('[Orchestrator] Agent 5 complete.');

  const finalBlueprint = {
    users: agent1Output.users || [],
    business_goals: agent1Output.business_goals || [],
    jobs_to_be_done: agent1Output.jobs_to_be_done || [],
    features: agent1Output.features || [],

    workflows: agent2Output.workflows || [],
    domain_entities: agent2Output.domain_entities || [],
    relationships: agent2Output.relationships || [],
    business_rules: agent2Output.business_rules || [],

    services: agent3Output.services || [],
    integrations: agent3Output.integrations || [],
    system_boundaries: agent3Output.system_boundaries || [],
    data_layer: agent3Output.data_layer || {},

    prd_summary: agent4Output.prd_summary || '',
    system_explanation: agent4Output.system_explanation || '',
    feature_breakdown: agent4Output.feature_breakdown || [],
    system_flow: agent4Output.system_flow || [],
    architecture_diagram_mermaid: agent4Output.architecture_diagram_mermaid || '',

    architecture_decisions: agent5Output.decisions || [],
  };

  console.log('[Orchestrator] Pipeline complete. Blueprint ready.');
  return finalBlueprint;
}

// Re-runs Architecture + Documentation with a new constraint (e.g. "use MongoDB instead of PostgreSQL")
// Keeps Discovery and Domain output untouched.
async function applyArchitectureChoice(currentBlueprint, constraint) {
  console.log('[Orchestrator] Applying architecture choice:', constraint);

  // Reconstruct the agent2-equivalent output from the current blueprint to feed Agent 3 again
  const agent2Equivalent = {
    workflows: currentBlueprint.workflows,
    domain_entities: currentBlueprint.domain_entities,
    relationships: currentBlueprint.relationships,
    business_rules: currentBlueprint.business_rules,
  };

  console.log('[Orchestrator] Re-running Agent 3: Architecture with new constraint...');
  const agent3Output = await runArchitectureAgent({
    ...agent2Equivalent,
    architectural_constraint: constraint,
  });
  console.log('[Orchestrator] Agent 3 re-run complete.');

  const mergedForAgent4 = {
    users: currentBlueprint.users,
    business_goals: currentBlueprint.business_goals,
    jobs_to_be_done: currentBlueprint.jobs_to_be_done,
    features: currentBlueprint.features,
    ...agent2Equivalent,
    ...agent3Output,
  };

  console.log('[Orchestrator] Re-running Agent 4: Documentation...');
  const agent4Output = await runDocumentationAgent(mergedForAgent4);
  console.log('[Orchestrator] Agent 4 re-run complete.');

  console.log('[Orchestrator] Re-running Agent 5: Architecture Reasoning...');
  const agent5Output = await runReasoningAgent(mergedForAgent4);
  console.log('[Orchestrator] Agent 5 re-run complete.');

  const updatedBlueprint = {
    ...currentBlueprint,
    services: agent3Output.services || [],
    integrations: agent3Output.integrations || [],
    system_boundaries: agent3Output.system_boundaries || [],
    data_layer: agent3Output.data_layer || {},

    prd_summary: agent4Output.prd_summary || '',
    system_explanation: agent4Output.system_explanation || '',
    feature_breakdown: agent4Output.feature_breakdown || [],
    system_flow: agent4Output.system_flow || [],
    architecture_diagram_mermaid: agent4Output.architecture_diagram_mermaid || '',

    architecture_decisions: agent5Output.decisions || [],
  };

  console.log('[Orchestrator] Architecture choice applied successfully.');
  return updatedBlueprint;
}

module.exports = { runPipeline, applyArchitectureChoice };