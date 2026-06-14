const router = require('express').Router();
const controller = require('../controllers/upload.controller');
const upload = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/:code/:category', controller.listByCategory);
router.post('/:code/planned-images', authorize('builder'), upload.array('files', 12), controller.codeParam, validate, controller.uploadPlannedImages);
router.post('/:code/bills', authorize('builder'), upload.array('files', 12), controller.codeParam, validate, controller.uploadBills);
router.post('/:code/documents', authorize('builder'), upload.array('files', 5), controller.codeParam, validate, controller.uploadDocuments);

module.exports = router;

