const router = require('express').Router();
const controller = require('../controllers/task.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/:code', controller.list);
router.post('/:code', authorize('builder'), controller.validation, validate, controller.create);
router.patch('/:id', authorize('builder'), controller.update);

module.exports = router;

