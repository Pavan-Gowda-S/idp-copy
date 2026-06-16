const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/builder', require('./builder.routes'));
router.use('/payments', require('./payments.routes'));
router.use('/complaints', require('./complaints.routes'));
router.use('/projects', require('./project.routes'));
router.use('/progress', require('./progress.routes'));
router.use('/estimations', require('./estimation.routes'));
router.use('/uploads', require('./upload.routes'));
router.use('/feedback', require('./feedback.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/tasks', require('./task.routes'));
router.use('/schedules', require('./schedule.routes'));
router.use('/approvals', require('./approval.routes'));
router.use('/delays', require('./delay.routes'));
router.use('/ai', require('./ai.routes'));

module.exports = router;

