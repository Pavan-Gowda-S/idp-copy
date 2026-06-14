const { body, param } = require('express-validator');
const store = require('../services/supabase.service');
const tables = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');
const { logActivity } = require('../services/activity.service');

exports.validation = [
  param('code').matches(/^\d{10}$/),
  body('title').trim().notEmpty(),
  body('domain').optional({ checkFalsy: true }).trim(),
  body('startDate').optional({ checkFalsy: true }).isISO8601(),
  body('endDate').optional({ checkFalsy: true }).isISO8601(),
  body('status').optional({ checkFalsy: true }).isIn(['Planned', 'In Progress', 'Completed', 'Delayed'])
];

exports.list = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const schedules = await store.list(tables.schedules, [['project', '==', project._id]]);
  schedules.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
  ok(res, { schedules }, 'Schedules loaded');
});

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const schedule = await store.create(tables.schedules, {
    project: project._id,
    builder: req.user._id,
    title: req.body.title,
    domain: req.body.domain || '',
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    status: req.body.status || 'Planned',
    notes: req.body.notes || ''
  });
  await logActivity({
    project: project._id,
    actor: req.user._id,
    actorModel: 'Builder',
    type: 'Schedule',
    message: `Schedule added: ${req.body.title}`
  });
  created(res, { schedule }, 'Schedule created');
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await store.getById(tables.schedules, req.params.id);
  if (!existing) throw new AppError('Schedule not found', 404);
  const project = await store.getById(tables.projects, existing.project);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Schedule not found', 404);
  const schedule = await store.update(tables.schedules, req.params.id, req.body);
  ok(res, { schedule }, 'Schedule updated');
});
