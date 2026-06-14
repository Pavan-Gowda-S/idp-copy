const router = require('express').Router();
const controller = require('../controllers/approval.controller');
const validate = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/:code', controller.list);
router.post('/:code', authorize('builder'), upload.array('files', 8), controller.createValidation, validate, controller.create);
router.patch('/:id/decision', authorize('customer'), controller.decisionValidation, validate, controller.decide);

module.exports = router;

