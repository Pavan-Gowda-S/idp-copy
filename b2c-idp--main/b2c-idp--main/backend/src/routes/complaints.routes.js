const router = require('express').Router();
const controller = require('../controllers/complaints.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.post('/', authorize('customer'), controller.createValidation, validate, controller.createComplaint);
router.get('/project/:projectId', controller.projectParam, validate, controller.listComplaints);
router.put(
  '/:complaintId/resolve',
  authorize('builder'),
  controller.complaintParam,
  validate,
  controller.markResolvedPending
);
router.put(
  '/:complaintId/close',
  authorize('customer'),
  controller.complaintParam,
  validate,
  controller.closeComplaint
);

router.post('/code/:code', authorize('customer'), controller.createByCode);
router.get('/code/:code', controller.listByCode);

module.exports = router;
