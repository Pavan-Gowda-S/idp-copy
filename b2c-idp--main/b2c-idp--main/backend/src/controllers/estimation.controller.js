const { body, param } = require('express-validator');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');
const { logActivity } = require('../services/activity.service');
const { CONSTRUCTION_DOMAINS } = require('../utils/domains');

exports.validation = [
  param('code').matches(/^\d{10}$/),
  body('domain').isIn(CONSTRUCTION_DOMAINS),
  body('amount').isFloat({ min: 0 }),
  body('notes').optional({ checkFalsy: true }).trim()
];

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const estimation = await store.create(collections.estimations, {
    project: project._id,
    builder: req.user._id,
    domain: req.body.domain,
    amount: req.body.amount,
    notes: req.body.notes
  });
  await logActivity({ project: project._id, actor: req.user._id, actorModel: 'Builder', type: 'Estimation', message: `Estimation updated for ${req.body.domain}` });
  created(res, { estimation }, 'Estimation saved');
});

exports.list = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const estimations = await store.list(collections.estimations, [['project', '==', project._id]]);
  estimations.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  ok(res, { estimations }, 'Estimations loaded');
});

