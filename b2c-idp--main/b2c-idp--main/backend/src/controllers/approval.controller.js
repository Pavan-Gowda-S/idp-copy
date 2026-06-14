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

exports.createValidation = [
  param('code').matches(/^\d{10}$/),
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('type').optional().isIn(['Design', 'Quotation', 'Drawing', 'Material'])
];

exports.decisionValidation = [
  param('id').trim().notEmpty(),
  body('status').isIn(['Approved', 'Changes Requested']),
  body('comment').optional({ checkFalsy: true }).trim()
];

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const assets = await fileService.createAssets({
    files: req.files,
    project: project._id,
    uploadedBy: req.user._id,
    uploadedByModel: 'Builder',
    category: 'approval',
    domain: req.body.domain,
    description: req.body.description
  });
  const approval = await store.create(collections.approvals, {
    project: project._id,
    builder: req.user._id,
    customer: project.customer,
    title: req.body.title,
    domain: req.body.domain,
    description: req.body.description,
    type: req.body.type || 'Design',
    status: 'Pending',
    files: assets.map((asset) => asset._id)
  });
  await logActivity({ project: project._id, actor: req.user._id, actorModel: 'Builder', type: 'Approval', message: `Approval request: ${req.body.title}` });
  await createNotification({
    recipient: project.customer,
    recipientModel: 'Customer',
    project: project._id,
    title: 'Approval requested',
    message: req.body.title,
    type: 'approval'
  });
  created(res, { approval: { ...approval, files: assets } }, 'Approval request created');
});

exports.list = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const [approvals, files] = await Promise.all([
    store.list(collections.approvals, [['project', '==', project._id]]),
    store.list(collections.files, [['project', '==', project._id], ['category', '==', 'approval']])
  ]);
  const hydrated = approvals
    .map((approval) => ({ ...approval, files: files.filter((file) => (approval.files || []).includes(file._id)) }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  ok(res, { approvals: hydrated }, 'Approval requests loaded');
});

exports.decide = asyncHandler(async (req, res) => {
  const approval = await store.getById(collections.approvals, req.params.id);
  if (!approval) throw new AppError('Approval request not found', 404);
  if (req.userRole !== 'customer' || String(approval.customer) !== String(req.user._id)) throw new AppError('Insufficient permissions', 403);
  const updated = await store.update(collections.approvals, req.params.id, {
    status: req.body.status,
    customerComment: req.body.comment || '',
    decidedAt: new Date().toISOString()
  });
  await logActivity({ project: approval.project, actor: req.user._id, actorModel: 'Customer', type: 'Approval', message: `${req.body.status}: ${approval.title}` });
  await createNotification({
    recipient: approval.builder,
    recipientModel: 'Builder',
    project: approval.project,
    title: 'Approval decision',
    message: `${req.body.status}: ${approval.title}`,
    type: 'approval'
  });
  ok(res, { approval: updated }, 'Approval updated');
});

