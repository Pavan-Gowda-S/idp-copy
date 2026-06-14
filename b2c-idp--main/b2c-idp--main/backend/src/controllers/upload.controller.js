const { param } = require('express-validator');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const projectService = require('../services/project.service');
const fileService = require('../services/file.service');
const { logActivity } = require('../services/activity.service');
const { createNotification } = require('../services/notification.service');

exports.codeParam = [param('code').matches(/^\d{10}$/)];

async function saveGenericFiles(req, res, category, message) {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const assets = await fileService.createAssets({
    files: req.files,
    project: project._id,
    uploadedBy: req.user._id,
    uploadedByModel: 'Builder',
    category,
    domain: req.body.domain,
    description: req.body.description
  });
  await logActivity({ project: project._id, actor: req.user._id, actorModel: 'Builder', type: message, message: `${message} uploaded (${assets.length} file${assets.length === 1 ? '' : 's'})` });
  await createNotification({
    recipient: project.customer,
    recipientModel: 'Customer',
    project: project._id,
    title: `${message} uploaded`,
    message: `${assets.length} new file${assets.length === 1 ? '' : 's'} added to your project.`,
    type: category
  });
  created(res, { files: assets }, `${message} uploaded`);
}

exports.uploadPlannedImages = asyncHandler((req, res) => saveGenericFiles(req, res, 'planned-image', 'Planned Images'));
exports.uploadBills = asyncHandler((req, res) => saveGenericFiles(req, res, 'bill', 'Bill'));
exports.uploadDocuments = asyncHandler((req, res) => saveGenericFiles(req, res, 'document', 'Document'));

exports.listByCategory = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectByCode(req.params.code);
  if (!project || !projectService.assertProjectAccess(project, req)) throw new AppError('Project not found', 404);
  const files = await store.list(collections.files, [['project', '==', project._id], ['category', '==', req.params.category]]);
  files.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  ok(res, { files }, 'Files loaded');
});

