const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');

exports.list = asyncHandler(async (req, res) => {
  const notifications = await store.list(collections.notifications, [
    ['recipient', '==', req.user._id],
    ['recipientModel', '==', req.userRole === 'builder' ? 'Builder' : 'Customer']
  ]);
  notifications.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  ok(res, { notifications }, 'Notifications loaded');
});

exports.markRead = asyncHandler(async (req, res) => {
  const existing = await store.getById(collections.notifications, req.params.id);
  if (!existing) throw new AppError('Notification not found', 404);
  const recipientModel = req.userRole === 'builder' ? 'Builder' : 'Customer';
  if (String(existing.recipient) !== String(req.user._id) || existing.recipientModel !== recipientModel) {
    throw new AppError('Notification not found', 404);
  }
  const notification = await store.update(collections.notifications, req.params.id, { readAt: new Date().toISOString() });
  ok(res, { notification }, 'Notification marked read');
});

