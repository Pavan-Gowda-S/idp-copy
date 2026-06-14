const { body, param } = require('express-validator');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');
const aiService = require('../ai-services/ai.service');

exports.codeParam = [param('code').matches(/^\d{10}$/)];

async function getAccessibleProject(req) {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  return project;
}

exports.imageAnalysis = asyncHandler(async (req, res) => {
  const project = await getAccessibleProject(req);
  const report = await aiService.queueImageAnalysis(project._id, req.body.sourceFile);
  created(res, { report }, 'Image analysis queued');
});

exports.progressEstimation = asyncHandler(async (req, res) => {
  const project = await getAccessibleProject(req);
  const report = await aiService.queueProgressEstimation(project._id);
  created(res, { report }, 'Progress estimation queued');
});

exports.timelinePrediction = asyncHandler(async (req, res) => {
  const project = await getAccessibleProject(req);
  const report = await aiService.queueTimelinePrediction(project._id);
  created(res, { report }, 'Timeline prediction queued');
});

exports.materialPrediction = asyncHandler(async (req, res) => {
  const project = await getAccessibleProject(req);
  const report = await aiService.queueMaterialPrediction(project._id);
  created(res, { report }, 'Material prediction queued');
});

exports.chatbot = [
  body('message').trim().notEmpty(),
  asyncHandler(async (req, res) => {
    const project = await getAccessibleProject(req);
    const reply = await aiService.chatbotReply(project._id, req.body.message);
    ok(res, reply, 'Chatbot reply generated');
  })
];

