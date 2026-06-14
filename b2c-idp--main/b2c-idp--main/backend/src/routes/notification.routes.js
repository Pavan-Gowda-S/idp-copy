const router = require('express').Router();
const controller = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', controller.list);
router.patch('/:id/read', controller.markRead);

module.exports = router;

