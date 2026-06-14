const store = require('./supabase.service');
const collections = require('../supabase/tables');

exports.logActivity = async ({ project, actor, actorModel, type, message, metadata }) => {
  return store.create(collections.activityLogs, {
    project,
    actor: actor || '',
    actorModel: actorModel || '',
    type,
    message,
    date: new Date().toISOString(),
    metadata: metadata || {}
  });
};

