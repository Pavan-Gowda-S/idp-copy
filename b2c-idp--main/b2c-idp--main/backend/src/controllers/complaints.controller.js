const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const complaintsService = require('../services/complaints.service');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const projectService = require('../services/project.service');

exports.projectParam = [param('projectId').isUUID()];
exports.complaintParam = [param('complaintId').isUUID()];

exports.createValidation = [
  body('projectId').isUUID(),
  body('category').isIn(complaintsService.CATEGORIES),
  body('description').trim().notEmpty(),
  body('urgency').isIn(complaintsService.URGENCIES),
  body('mediaUrls').optional().isArray()
];

exports.createComplaint = asyncHandler(async (req, res) => {
  await complaintsService.assertCustomerProjectAccess(req.body.projectId, req);
  const complaint = await complaintsService.createComplaint({
    projectId: req.body.projectId,
    userId: req.authUserId || req.user._id,
    category: req.body.category,
    description: req.body.description,
    urgency: req.body.urgency,
    mediaUrls: req.body.mediaUrls || []
  });
  created(res, { complaint }, 'Complaint submitted');
});

exports.listComplaints = asyncHandler(async (req, res) => {
  await complaintsService.assertCustomerProjectAccess(req.params.projectId, req);
  const complaints = await complaintsService.listProjectComplaints(req.params.projectId);
  ok(res, { complaints }, 'Complaints loaded');
});

exports.markResolvedPending = asyncHandler(async (req, res) => {
  const complaint = await complaintsService.markResolvedPending(req.params.complaintId, req.user._id);
  ok(res, { complaint }, 'Complaint marked Resolved_Pending');
});

exports.closeComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintsService.closeComplaint(req.params.complaintId, req);
  ok(res, { complaint }, 'Complaint closed');
});

exports.listByCode = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !(await projectService.assertProjectAccess(project, req))) {
    throw new AppError('Project not found', 404);
  }
  const complaints = await complaintsService.listProjectComplaints(project._id);
  ok(res, { complaints, projectId: project._id }, 'Complaints loaded');
});

exports.createByCode = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !(await projectService.assertProjectAccess(project, req))) {
    throw new AppError('Project not found', 404);
  }
  const complaint = await complaintsService.createComplaint({
    projectId: project._id,
    userId: req.authUserId || req.user._id,
    category: req.body.category,
    description: req.body.description,
    urgency: req.body.urgency,
    mediaUrls: req.body.mediaUrls || []
  });
  created(res, { complaint }, 'Complaint submitted');
});
