const router = require('express').Router();
const controller = require('../controllers/feedback.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/:code', controller.list);
router.post('/:code', authorize('customer'), controller.validation, validate, controller.create);

module.exports = router;

