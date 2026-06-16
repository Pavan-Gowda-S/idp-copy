const router = require('express').Router();
const controller = require('../controllers/payments.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/project/:projectId', controller.projectParam, validate, controller.getLedger);
router.get('/code/:code', controller.getLedgerByCode);
router.patch(
  '/invoice/:invoiceId/status',
  authorize('builder'),
  controller.invoiceStatusValidation,
  validate,
  controller.updateInvoiceStatus
);

module.exports = router;
