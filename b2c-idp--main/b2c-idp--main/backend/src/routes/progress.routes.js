const router = require('express').Router();
const controller = require('../controllers/progress.controller');
const validate = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/:code', controller.list);
router.post('/:code', authorize('builder'), upload.array('images', 12), controller.validation, validate, controller.create);

module.exports = router;

