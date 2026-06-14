const { body, param } = require('express-validator');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');

exports.validation = [
  param('code').matches(/^\d{10}$/),
  body('title').trim().notEmpty(),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed', 'Blocked'])
];

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const task = await store.create(collections.tasks, { ...req.body, project: project._id, builder: req.user._id });
  created(res, { task }, 'Task created');
});

exports.list = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const tasks = await store.list(collections.tasks, [['project', '==', project._id]]);
  tasks.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  ok(res, { tasks }, 'Tasks loaded');
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await store.getById(collections.tasks, req.params.id);
  if (!existing) throw new AppError('Task not found', 404);
  const project = await store.getById(collections.projects, existing.project);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Task not found', 404);
  const task = await store.update(collections.tasks, req.params.id, req.body);
  ok(res, { task }, 'Task updated');
});

