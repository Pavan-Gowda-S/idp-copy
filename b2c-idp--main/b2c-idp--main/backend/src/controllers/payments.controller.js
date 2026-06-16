const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const paymentsService = require('../services/payments.service');
const projectService = require('../services/project.service');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');

exports.projectParam = [param('projectId').isUUID()];

exports.invoiceStatusValidation = [
  param('invoiceId').isUUID(),
  body('status').isIn(['Paid', 'Due Now', 'Upcoming'])
];

async function resolveProjectAccess(req, projectId) {
  const project = await store.getById(collections.projects, projectId);
  if (!project) throw new AppError('Project not found', 404);

  if (req.userRole === 'builder') {
    if (String(project.builder) !== String(req.user._id)) throw new AppError('Insufficient permissions', 403);
    return project;
  }

  if (req.authUserId) {
    const mappings = await store.list(collections.userProjects, [['userId', '==', req.authUserId]]);
    if (mappings.some((m) => String(m.projectId) === String(projectId))) return project;
  }

  if (await projectService.assertProjectAccess(project, req)) return project;
  throw new AppError('Insufficient permissions', 403);
}

exports.getLedger = asyncHandler(async (req, res) => {
  await resolveProjectAccess(req, req.params.projectId);
  await paymentsService.seedDefaultMilestones(req.params.projectId);
  const ledger = await paymentsService.getProjectLedger(req.params.projectId);
  ok(res, ledger, 'Payment ledger loaded');
});

exports.updateInvoiceStatus = asyncHandler(async (req, res) => {
  const result = await paymentsService.updateInvoiceStatus(
    req.params.invoiceId,
    req.body.status,
    req.user._id
  );
  ok(res, result, 'Invoice status updated');
});

exports.getLedgerByCode = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !(await projectService.assertProjectAccess(project, req))) {
    throw new AppError('Project not found', 404);
  }
  await paymentsService.seedDefaultMilestones(project._id);
  const ledger = await paymentsService.getProjectLedger(project._id);
  ok(res, { projectId: project._id, ...ledger }, 'Payment ledger loaded');
});
