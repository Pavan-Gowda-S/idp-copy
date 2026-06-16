const router = require('express').Router();
const controller = require('../controllers/builder.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize('builder'));
router.get('/customers', controller.listCustomers);

module.exports = router;
