const { body, param } = require('express-validator');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');
const { logActivity } = require('../services/activity.service');
const { createNotification } = require('../services/notification.service');
const { CONSTRUCTION_DOMAINS } = require('../utils/domains');

exports.validation = [
  param('code').matches(/^\d{10}$/),
  body('domain').isIn(CONSTRUCTION_DOMAINS),
  body('date').isISO8601(),
  body('reason').trim().notEmpty()
];

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const delay = await store.create(collections.delays, {
    project: project._id,
    builder: req.user._id,
    domain: req.body.domain,
    date: req.body.date,
    reason: req.body.reason
  });
  await logActivity({ project: project._id, actor: req.user._id, actorModel: 'Builder', type: 'Delay', message: `Delay reported for ${req.body.domain}: ${req.body.reason}` });
  await createNotification({
    recipient: project.customer,
    recipientModel: 'Customer',
    project: project._id,
    title: 'Delay alert',
    message: `${req.body.domain}: ${req.body.reason}`,
    type: 'delay'
  });
  created(res, { delay }, 'Delay report created');
});

exports.list = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const delays = await store.list(collections.delays, [['project', '==', project._id]]);
  delays.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  ok(res, { delays }, 'Delay reports loaded');
});

