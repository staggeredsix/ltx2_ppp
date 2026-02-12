import fs from 'fs';

function findNodeId(workflow, matcher) {
  for (const [id, node] of Object.entries(workflow)) {
    if (matcher(node)) return id;
  }
  return null;
}

export function patchWorkflow(templatePath, { prompt, seed, inputFilename, outputPrefix }) {
  const workflow = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  const promptNode = findNodeId(workflow, (n) => n.class_type?.toLowerCase().includes('text') || n._meta?.title?.toLowerCase().includes('prompt'));
  const seedNode = findNodeId(workflow, (n) => JSON.stringify(n.inputs || {}).toLowerCase().includes('seed') || n._meta?.title?.toLowerCase().includes('seed'));
  const inputNode = findNodeId(workflow, (n) => n.class_type?.toLowerCase().includes('loadimage') || n.class_type?.toLowerCase().includes('loadvideo'));
  const outputNode = findNodeId(workflow, (n) => n.class_type?.toLowerCase().includes('savevideo') || n.class_type?.toLowerCase().includes('saveimage'));

  if (!promptNode || !inputNode || !outputNode) {
    throw new Error('Workflow template missing required nodes. Ensure prompt/input/output nodes exist with recognized class_type or title.');
  }

  workflow[promptNode].inputs.text = prompt;
  if (seedNode && workflow[seedNode].inputs) workflow[seedNode].inputs.seed = Number(seed);
  workflow[inputNode].inputs.image = inputFilename;
  if (workflow[inputNode].inputs.video !== undefined) workflow[inputNode].inputs.video = inputFilename;
  workflow[outputNode].inputs.filename_prefix = outputPrefix;

  return workflow;
}
