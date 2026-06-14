const store = require('../services/supabase.service');
const collections = require('../supabase/tables');

async function createQueuedReport(project, type, payload = {}) {
  const report = await store.create(collections.aiReports, {
    project,
    sourceFile: payload.sourceFile,
    type,
    status: 'queued',
    summary: 'AI integration placeholder queued. Connect an AI provider in ai-services to process this report.',
    result: {
      readyForIntegration: true,
      expectedInputs: payload.expectedInputs || [],
      nextStep: payload.nextStep || 'Attach model inference implementation.'
    }
  });
  return report;
}

exports.queueImageAnalysis = (project, sourceFile) => createQueuedReport(project, 'image-analysis', {
  sourceFile,
  expectedInputs: ['construction image'],
  nextStep: 'Run object detection and stage/progress analysis on uploaded site image.'
});

exports.queueProgressEstimation = (project) => createQueuedReport(project, 'progress-estimation', {
  expectedInputs: ['project updates', 'domain status', 'site images'],
  nextStep: 'Estimate completion percentage using image and timeline signals.'
});

exports.queueTimelinePrediction = (project) => createQueuedReport(project, 'timeline-prediction', {
  expectedInputs: ['schedule', 'historical progress', 'delay reports'],
  nextStep: 'Predict completion date and delay risk.'
});

exports.queueMaterialPrediction = (project) => createQueuedReport(project, 'material-prediction', {
  expectedInputs: ['current stage', 'pending tasks', 'estimation data'],
  nextStep: 'Predict upcoming material requirements.'
});

exports.chatbotReply = async (project, message) => ({
  project,
  reply: `I received your question: "${message}". The chatbot endpoint is ready; connect an LLM provider here for live project-aware answers.`,
  readyForIntegration: true
});

