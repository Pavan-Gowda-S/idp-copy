const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/builder/register', controller.registerBuilderValidation, validate, controller.registerBuilder);
router.post('/builder/login', controller.loginBuilderValidation, validate, controller.loginBuilder);
router.post('/customer/login', controller.customerLoginValidation, validate, controller.loginCustomer);
router.get('/me', authenticate, controller.me);

module.exports = router;

