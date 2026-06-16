const store = require('./supabase.service');
const collections = require('../supabase/tables');
const { CONSTRUCTION_DOMAINS } = require('../utils/domains');

exports.getProjectByCode = async (code) => store.findOne(collections.projects, 'code', '==', code);

exports.getProjectById = async (id) => store.getById(collections.projects, id);

exports.assertProjectAccess = async (project, req) => {
  if (!project) return false;
  if (req.userRole === 'builder') return String(project.builder) === String(req.user._id);

  if (req.authUserId) {
    const mappings = await store.list(collections.userProjects, [['userId', '==', req.authUserId]]);
    if (mappings.some((m) => String(m.projectId) === String(project._id))) return true;
  }

  return String(project.customer) === String(req.user._id);
};

exports.recalculateProjectCompletion = async (projectId) => {
  const updates = await store.list(collections.progressUpdates, [['project', '==', projectId]]);
  const completedDomains = new Set(updates.map((item) => item.domain));
  const completionPercentage = Math.round((completedDomains.size / CONSTRUCTION_DOMAINS.length) * 100);
  const domains = CONSTRUCTION_DOMAINS.map((name) => {
    const domainUpdates = updates.filter((item) => item.domain === name);
    const hasCompleted = domainUpdates.some((item) => item.dprStatus === 'Completed');
    const status = hasCompleted ? 'Completed' : domainUpdates.length ? 'In Progress' : 'Planned';
    return {
      name,
      status,
      completionPercentage: hasCompleted ? 100 : domainUpdates.length ? Math.min(90, 20 + domainUpdates.length * 15) : 0
    };
  });
  await store.update(collections.projects, projectId, { completionPercentage, domains });
  return completionPercentage;
};

exports.getDashboardSummary = async (projectId) => {
  const [project, updates, estimations, tasks] = await Promise.all([
    store.getById(collections.projects, projectId),
    store.list(collections.progressUpdates, [['project', '==', projectId]]),
    store.list(collections.estimations, [['project', '==', projectId]]),
    store.list(collections.tasks, [['project', '==', projectId]])
  ]);
  const totalCost = estimations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const activeDomains = [...new Set(updates.map((item) => item.domain))];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    project,
    completionPercentage: project?.completionPercentage || 0,
    totalUpdates: updates.length,
    totalCost,
    activeDomain: activeDomains[activeDomains.length - 1] || null,
    pendingTasks: tasks.filter((task) => task.status !== 'Completed').length,
    weeklyUpdates: updates.filter((item) => new Date(item.date).getTime() >= weekAgo).length,
    domains: project?.domains || []
  };
};

