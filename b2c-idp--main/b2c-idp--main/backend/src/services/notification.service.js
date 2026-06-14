const store = require('./supabase.service');
const collections = require('../supabase/tables');

exports.createNotification = async ({ recipient, recipientModel, project, title, message, type }) => {
  if (!recipient || !recipientModel) return null;
  return store.create(collections.notifications, {
    recipient,
    recipientModel,
    project: project || '',
    title,
    message,
    type: type || 'info',
    readAt: null
  });
};

