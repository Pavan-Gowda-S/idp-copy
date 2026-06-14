const { body, param } = require('express-validator');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');
const fileService = require('../services/file.service');
const { logActivity } = require('../services/activity.service');
const { createNotification } = require('../services/notification.service');
const { CONSTRUCTION_DOMAINS } = require('../utils/domains');

exports.validation = [
  param('code').matches(/^\d{10}$/),
  body('domain').isIn(CONSTRUCTION_DOMAINS),
  body('date').isISO8601(),
  body('description').trim().notEmpty(),
  body('dprStatus').optional().isIn(['Planned', 'Doing', 'Completed']),
  body('workers').optional().isInt({ min: 0 })
];

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const assets = await fileService.createAssets({
    files: req.files,
    project: project._id,
    uploadedBy: req.user._id,
    uploadedByModel: 'Builder',
    category: 'daily-image',
    domain: req.body.domain,
    description: req.body.description
  });
  const update = await store.create(collections.progressUpdates, {
    project: project._id,
    builder: req.user._id,
    domain: req.body.domain,
    date: req.body.date,
    description: req.body.description,
    dprStatus: req.body.dprStatus || 'Doing',
    workers: req.body.workers || 0,
    images: assets.map((asset) => asset._id)
  });
  await projectService.recalculateProjectCompletion(project._id);
  await logActivity({ project: project._id, actor: req.user._id, actorModel: 'Builder', type: 'Daily Update', message: `[${req.body.domain}] ${req.body.description}` });
  await createNotification({
    recipient: project.customer,
    recipientModel: 'Customer',
    project: project._id,
    title: 'New progress update',
    message: `${req.body.domain}: ${req.body.description}`,
    type: 'progress'
  });
  created(res, { update: { ...update, images: assets } }, 'Progress update created');
});

exports.list = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const [updates, files] = await Promise.all([
    store.list(collections.progressUpdates, [['project', '==', project._id]]),
    store.list(collections.files, [['project', '==', project._id], ['category', '==', 'daily-image']])
  ]);
  const updatesWithImages = updates
    .map((update) => ({ ...update, images: files.filter((file) => (update.images || []).includes(file._id)) }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  ok(res, { updates: updatesWithImages }, 'Progress updates loaded');
});

