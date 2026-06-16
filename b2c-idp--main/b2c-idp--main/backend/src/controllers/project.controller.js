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

exports.codeParam = [param('code').trim().notEmpty()];
exports.createValidation = [
  body('code').optional({ checkFalsy: true }).trim(),
  body('title').optional({ checkFalsy: true }).trim(),
  body('customerName').optional({ checkFalsy: true }).trim(),
  body('customerPhone').optional({ checkFalsy: true }).trim(),
  body('customerEmail').optional({ checkFalsy: true }).isEmail()
];

exports.createProject = asyncHandler(async (req, res) => {
  const projectCode = req.body.code || `PRJ${Date.now().toString().slice(-8)}`;
  const exists = await store.findOne(collections.projects, 'code', '==', projectCode);
  if (exists) throw new AppError('Project code already exists', 409);
  const customer = await store.create(collections.customers, {
    name: req.body.customerName,
    phone: req.body.customerPhone,
    email: req.body.customerEmail,
    projectCode
  });
  await store.create(collections.users, {
    role: 'CUSTOMER',
    refId: customer._id,
    name: customer.name || `Customer ${projectCode}`,
    username: projectCode,
    email: customer.email || '',
    phoneNumber: customer.phone || '',
    phone: customer.phone || ''
  });
  const project = await store.create(collections.projects, {
    code: projectCode,
    title: req.body.title || 'Construction Project',
    description: req.body.description,
    builder: req.user._id,
    customer: customer._id,
    address: req.body.address,
    startDate: req.body.startDate,
    targetCompletionDate: req.body.targetCompletionDate,
    status: 'Active',
    completionPercentage: 0,
    domains: CONSTRUCTION_DOMAINS.map((name) => ({
      name,
      status: 'Planned',
      completionPercentage: 0
    })),
    budget: 0,
    spentAmount: 0
  });
  await logActivity({ project: project._id, actor: req.user._id, actorModel: 'Builder', type: 'Project', message: 'Project created' });
  await createNotification({
    recipient: customer._id,
    recipientModel: 'Customer',
    project: project._id,
    title: 'Project created',
    message: `Your project ${projectCode} is ready.`,
    type: 'project'
  });
  created(res, { project, customer }, 'Project created');
});

exports.listBuilderProjects = asyncHandler(async (req, res) => {
  const projects = await store.list(collections.projects, [['builder', '==', req.user._id]]);
  ok(res, { projects }, 'Projects loaded');
});

exports.getProjectByCode = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !(await projectService.assertProjectAccess(project, req))) throw new AppError('Project not found', 404);
  ok(res, { project }, 'Project loaded');
});

exports.dashboard = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !(await projectService.assertProjectAccess(project, req))) throw new AppError('Project not found', 404);
  const summary = await projectService.getDashboardSummary(project._id);
  ok(res, summary, 'Dashboard summary loaded');
});

exports.activity = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !(await projectService.assertProjectAccess(project, req))) throw new AppError('Project not found', 404);
  const logs = await store.list(collections.activityLogs, [['project', '==', project._id]], { limit: 100 });
  ok(res, { logs }, 'Activity loaded');
});

