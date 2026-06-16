const store = require('./supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const projectService = require('./project.service');

const CATEGORIES = ['Structural', 'Plumbing', 'Electrical', 'Finishing'];
const URGENCIES = ['Critical', 'Major', 'Minor'];
const STATUSES = ['Submitted', 'In Progress', 'Resolved_Pending', 'Closed'];

async function assertCustomerProjectAccess(projectId, req) {
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

async function createComplaint({ projectId, userId, category, description, urgency, mediaUrls = [] }) {
  if (!CATEGORIES.includes(category)) throw new AppError('Invalid category', 400);
  if (!URGENCIES.includes(urgency)) throw new AppError('Invalid urgency', 400);

  return store.create(collections.complaints, {
    projectId,
    userId,
    category,
    description,
    urgency,
    mediaUrls,
    status: 'Submitted'
  });
}

async function listProjectComplaints(projectId) {
  return store.list(collections.complaints, [['projectId', '==', projectId]], {
    orderBy: 'createdAt',
    direction: 'desc'
  });
}

async function markResolvedPending(complaintId, builderId) {
  const complaint = await store.getById(collections.complaints, complaintId);
  if (!complaint) throw new AppError('Complaint not found', 404);

  const project = await store.getById(collections.projects, complaint.projectId);
  if (!project || String(project.builder) !== String(builderId)) {
    throw new AppError('Insufficient permissions', 403);
  }

  return store.update(collections.complaints, complaintId, { status: 'Resolved_Pending' });
}

async function closeComplaint(complaintId, req) {
  const complaint = await store.getById(collections.complaints, complaintId);
  if (!complaint) throw new AppError('Complaint not found', 404);

  await assertCustomerProjectAccess(complaint.projectId, req);
  if (complaint.status !== 'Resolved_Pending') {
    throw new AppError('Complaint must be marked Resolved_Pending by builder before closing', 400);
  }

  return store.update(collections.complaints, complaintId, { status: 'Closed' });
}

module.exports = {
  CATEGORIES,
  URGENCIES,
  STATUSES,
  createComplaint,
  listProjectComplaints,
  markResolvedPending,
  closeComplaint,
  assertCustomerProjectAccess
};
